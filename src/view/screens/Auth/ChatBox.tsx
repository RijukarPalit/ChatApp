import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    Alert,
    Modal,
    Linking,
    ImageBackground,
    Pressable,
    AppState,
    StatusBar,
} from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import supabase from '../../../utils/supabase';
import Toast from 'react-native-toast-message';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ImageName } from '../../../asserts';
import { decode } from 'base64-arraybuffer';
import { launchImageLibrary } from 'react-native-image-picker'
import { useKeyboardBehavior } from '../../../hooks/useKeyboardBehavior';
import { pick, types, isCancel } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import ImageView from "react-native-image-viewing";
import Pdf from 'react-native-pdf';
import { StackNavigationProp } from '@react-navigation/stack';
import { useChatBackground } from '../../../context/ChangeBackgrounContext';

interface Reaction {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    message_text: string;
    image_url?: string;
    created_at: string;
    read: boolean;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    reactions?: Reaction[];
}

interface RouteParams {
    userId: string;
    userName: string;
}

const C = {
    primary: '#5B5FEF',
    primaryDark: '#4347C9',
    primaryLight: '#ECEEFF',
    sent: '#5B5FEF',
    received: '#FFFFFF',
    sentText: '#FFFFFF',
    receivedText: '#1A1A2E',
    bg: '#F0F2FF',
    headerBg: '#FFFFFF',
    inputBg: '#FFFFFF',
    border: '#E4E6FF',
    muted: '#9B9DB8',
    online: '#22C55E',
    offline: '#D1D5DB',
    danger: '#EF4444',
    shadow: 'rgba(91,95,239,0.18)',
    sentTime: 'rgba(255,255,255,0.72)',
    receivedTime: '#B0B3CC',
};

const ChatBox = () => {
    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();
    const route = useRoute();
    const { userId: receiverId, userName } = route.params as RouteParams;

    const [messageList, setMessageList] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
    const [imageViewerUri, setImageViewerUri] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [isPdfVisible, setIsPdfVisible] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [receiverOnline, setReceiverOnline] = useState<boolean>(false);
    const [receiverLastSeen, setReceiverLastSeen] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const { background } = useChatBackground();
    const flatListRef = useRef<FlatList>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const currentUserIdRef = useRef<string | null>(null);
    const behaviour = useKeyboardBehavior();

    // ── Status helpers ────────────────────────────────────────────────────────
    const updateMyStatus = async (isOnline: boolean, userId?: string) => {
        const uid = userId || currentUserIdRef.current;
        if (!uid) return;
        await supabase.from('user')
            .update({ is_online: isOnline, last_seen: new Date().toISOString() })
            .eq('id', uid);
    };

    // ✅ Set active_chat_with when user enters/leaves this chat screen
    // This tells the edge function to skip notification if receiver is already here
    useFocusEffect(
        useCallback(() => {
            const uid = currentUserIdRef.current;
            if (!uid) return;

            // Entered chat — mark who we're chatting with
            supabase
                .from('user')
                .update({ active_chat_with: receiverId })
                .eq('id', uid)
                .then(() => console.log('✅ active_chat_with set'))

            return () => {
                // Left chat — clear active chat
                supabase
                    .from('user')
                    .update({ active_chat_with: null })
                    .eq('id', uid)
                    .then(() => console.log('✅ active_chat_with cleared'))
            }
        }, [receiverId])
    )

    const getCurrentUser = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) { Alert.alert('Error', 'Failed to authenticate user'); return null; }
            if (user) {
                setCurrentUserId(user.id);
                currentUserIdRef.current = user.id;
                const { data: profileData } = await supabase
                    .from('user').select('name').eq('id', user.id).single();
                if (profileData) setCurrentUserName(profileData.name);

                // ✅ Also set active_chat_with immediately on load
                await supabase
                    .from('user')
                    .update({ active_chat_with: receiverId })
                    .eq('id', user.id)

                return user;
            }
            Alert.alert('Error', 'You must be logged in to chat');
            return null;
        } catch { return null; }
    };

    const initializeChat = async () => {
        const user = await getCurrentUser();
        if (user) {
            await updateMyStatus(true, user.id);
            await fetchMessages(user.id);
            await checkIfBlocked();
            subscribeToMessages(user.id);
        }
    };

    const subscribeToUserStatus = () =>
        supabase.channel(`status-${receiverId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'user', filter: `id=eq.${receiverId}` },
                (payload) => {
                    setReceiverOnline(payload.new.is_online);
                    setReceiverLastSeen(payload.new.last_seen);
                })
            .subscribe();

    const addReaction = async (messageId: string, emoji: string) => {
        try {
            const { data, error } = await supabase
                .from('message_reactions')
                .insert([{ message_id: messageId, user_id: currentUserId, emoji }])
                .select().single();
            if (error) return;
            setMessageList(prev =>
                prev.map(msg => msg.id === messageId
                    ? { ...msg, reactions: [...(msg.reactions || []), data] }
                    : msg));
        } catch { }
    };

    useEffect(() => {
        let statusChannel: RealtimeChannel | null = null;
        const setup = async () => {
            await initializeChat();
            await fetchReceiverStatus();
            statusChannel = subscribeToUserStatus();
        };
        setup();
        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            if (statusChannel) supabase.removeChannel(statusChannel);
            updateMyStatus(false);

            // ✅ Clear active_chat_with on unmount
            const uid = currentUserIdRef.current;
            if (uid) {
                supabase.from('user')
                    .update({ active_chat_with: null })
                    .eq('id', uid)
                    .then(() => console.log('✅ active_chat_with cleared on unmount'))
            }
        };
    }, []);

    useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') updateMyStatus(true);
            else updateMyStatus(false);
        });
        return () => sub.remove();
    }, []);

    const fetchMessages = async (userId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*, message_reactions(*)')
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: false });
            if (error) { console.error('Error fetching messages:', error); return; }
            setMessageList(data?.map((msg: any) => ({ ...msg, reactions: msg.message_reactions || [] })) || []);
            if (data && data.length > 0) markMessagesAsRead(userId);
        } catch { } finally { setLoading(false); }
    };

    const fetchReceiverStatus = async () => {
        const { data, error } = await supabase
            .from('user').select('is_online, last_seen').eq('id', receiverId).single();
        if (!error && data) { setReceiverOnline(data.is_online); setReceiverLastSeen(data.last_seen); }
    };

    const markMessagesAsRead = async (userId: string) => {
        try {
            await supabase.from('messages').update({ read: true })
                .eq('receiver_id', userId).eq('sender_id', receiverId).eq('read', false);
        } catch { }
    };

    const subscribeToMessages = (userId: string) => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const channel = supabase
            .channel(`messages-${userId}-${receiverId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    const newMessage = payload.new as Message;
                    if ((newMessage.sender_id === userId && newMessage.receiver_id === receiverId) ||
                        (newMessage.sender_id === receiverId && newMessage.receiver_id === userId)) {
                        setMessageList(prev => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;
                            return [newMessage, ...prev];
                        });
                        if (newMessage.sender_id === receiverId) markMessagesAsRead(userId);
                    }
                })
            .subscribe((status) => console.log('Realtime:', status));
        channelRef.current = channel;
    };

    const handleSend = async () => {
        if (!inputText.trim() || !currentUserId) return;

        try {
            setSending(true);

            // 🔍 1. Check if I blocked them
            const { data: iBlocked } = await supabase
                .from('blocked_users')
                .select('id')
                .eq('user_id', currentUserId)
                .eq('blocked_user_id', receiverId)
                .maybeSingle();

            if (iBlocked) {
                Toast.show({
                    type: 'error',
                    text1: 'You have blocked this user',
                    position: 'top',
                });
                return;
            }

            // 🔍 2. Check if they blocked me
            const { data: theyBlocked } = await supabase
                .from('blocked_users')
                .select('id')
                .eq('user_id', receiverId)
                .eq('blocked_user_id', currentUserId)
                .maybeSingle();

            if (theyBlocked) {
                Toast.show({
                    type: 'error',
                    text1: 'You cannot send messages to this user',
                    position: 'top',
                });
                return;
            }

            // ✅ 3. Send message
            const messageToSend = inputText.trim();

            const { error } = await supabase
                .from('messages')
                .insert([
                    {
                        sender_id: currentUserId,
                        receiver_id: receiverId,
                        message_text: messageToSend,
                    },
                ]);

            if (error) {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to send message',
                    position: 'top',
                });
                return;
            }

            setInputText('');

        } catch (err: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to send',
                position: 'top',
            });
        } finally {
            setSending(false);
        }
    };
    // const handleSend = async () => {
    //     if (!inputText.trim() || !currentUserId) return;
    //     try {
    //         setSending(true);
    //         const messageToSend = inputText.trim();
    //         const { error } = await supabase.from('messages')
    //             .insert([{
    //                 sender_id: currentUserId,
    //                 receiver_id: receiverId,
    //                 message_text: messageToSend,
    //             }])
    //             .select().single();
    //         if (error) {
    //             Toast.show({ type: 'error', text1: 'Failed to send message', position: 'top' });
    //             return;
    //         }
    //         setInputText('');
    //         // ✅ No manual fetch() call here — webhook triggers edge function automatically
    //     } catch (err: any) {
    //         Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to send', position: 'top' });
    //     } finally { setSending(false); }
    // };

    const clearChat = () => {
        Alert.alert('Clear Chat', 'Are you sure you want to delete all messages? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => setShowMenu(false) },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        setShowMenu(false);
                        if (!currentUserId) { Alert.alert('Error', 'You must be logged in'); return; }
                        try {
                            const { error: e1 } = await supabase.from('messages').delete()
                                .eq('sender_id', currentUserId).eq('receiver_id', receiverId);
                            const { error: e2 } = await supabase.from('messages').delete()
                                .eq('sender_id', receiverId).eq('receiver_id', currentUserId);
                            if (e1 || e2) { Alert.alert('Error', `Failed to delete: ${e1?.message || e2?.message}`); return; }
                            setMessageList([]);
                            Toast.show({ type: 'success', text1: 'Chat cleared', position: 'top' });
                        } catch (err: any) { Alert.alert('Error', err?.message || 'Something went wrong'); }
                    },
                },
            ]);
    };

    // for block user
    const blockUser = async () => {
        if (!currentUserId) {
            Alert.alert('Error', 'You must be logged in');
            return;
        }

        try {
            // 🔍 Check if already blocked
            const { data: existingBlock } = await supabase
                .from('blocked_users')
                .select('id')
                .eq('user_id', currentUserId)
                .eq('blocked_user_id', receiverId)
                .maybeSingle();

            if (existingBlock) {
                Toast.show({
                    type: 'info',
                    text1: 'User already blocked',
                    position: 'top',
                });
                return;
            }

            // ✅ Insert block
            const { error } = await supabase
                .from('blocked_users')
                .insert([
                    {
                        user_id: currentUserId,
                        blocked_user_id: receiverId,
                    },
                ]);

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            setIsBlocked(true);
            setShowMenu(false);

            Toast.show({
                type: 'success',
                text1: 'User blocked successfully',
                position: 'top',
            });

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong');
        }
    };


    const unblockUser = async () => {
        if (!currentUserId) {
            Alert.alert('Error', 'You must be logged in');
            return;
        }

        try {
            const { error } = await supabase
                .from('blocked_users')
                .delete()
                .eq('user_id', currentUserId)
                .eq('blocked_user_id', receiverId);

            if (error) {
                Alert.alert('Error', error.message);
                return;
            }

            setIsBlocked(false);   // ✅ UPDATE STATE
            setShowMenu(false);    // ✅ CLOSE MENU

            Toast.show({
                type: 'success',
                text1: 'User unblocked successfully',
                position: 'top',
            });

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong');
        }
    };

    const checkIfBlocked = async () => {
        if (!currentUserId) return;

        const { data, error } = await supabase
            .from('blocked_users')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('blocked_user_id', receiverId)
            .maybeSingle();

        if (error) return;

        setIsBlocked(!!data);
    };

    const formatLastSeen = (iso: string | null): string => {
        if (!iso) return 'Offline';
        const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const h = Math.floor(diffMins / 60);
        if (h < 24) return `${h}h ago`;
        return new Date(iso).toLocaleDateString();
    };

    const getInitials = (name: string) =>
        name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isMine = item.sender_id === currentUserId;
        const time = new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const showDateSep = index === messageList.length - 1 ||
            new Date(item.created_at).toDateString() !== new Date(messageList[index + 1]?.created_at).toDateString();

        const dateLabel = (() => {
            const d = new Date(item.created_at);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) return 'Today';
            const yest = new Date(now); yest.setDate(yest.getDate() - 1);
            if (d.toDateString() === yest.toDateString()) return 'Yesterday';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        })();

        return (
            <View>
                {showDateSep && (
                    <View style={s.dateSep}>
                        <View style={s.dateLine} />
                        <Text style={s.dateLabel}>{dateLabel}</Text>
                        <View style={s.dateLine} />
                    </View>
                )}

                <View style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}>
                    {!isMine && (
                        <View style={s.smallAvatar}>
                            <Text style={s.smallAvatarText}>{getInitials(userName)}</Text>
                        </View>
                    )}

                    <View style={{ maxWidth: '75%' }}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onLongPress={() => { setSelectedMessageId(item.id); setReactionPickerVisible(true); }}
                            style={[s.bubble, isMine ? s.bubbleSent : s.bubbleReceived]}
                        >
                            {item.image_url && (
                                <TouchableOpacity activeOpacity={0.9} style={s.imgWrapper}
                                    onPress={() => { setImageViewerUri(item.image_url!); setIsImageViewerVisible(true); }}>
                                    <Image source={{ uri: item.image_url }} style={s.msgImage} resizeMode="cover" />
                                </TouchableOpacity>
                            )}

                            {item.file_url && (
                                <TouchableOpacity activeOpacity={0.8}
                                    style={[s.fileCard, isMine ? s.fileCardSent : s.fileCardReceived]}
                                    onPress={() => {
                                        if (item.file_type === 'pdf') { setPdfUri(item.file_url!); setIsPdfVisible(true); }
                                        else Linking.openURL(item.file_url!);
                                    }}>
                                    <View style={s.fileIconCircle}>
                                        <Text style={s.fileIconEmoji}>{item.file_type === 'pdf' ? '📕' : '📄'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.fileName, { color: isMine ? '#fff' : C.receivedText }]} numberOfLines={1}>
                                            {item.file_name || 'Document'}
                                        </Text>
                                        <Text style={[s.fileExt, { color: isMine ? 'rgba(255,255,255,0.6)' : C.muted }]}>
                                            {item.file_type?.toUpperCase() || 'FILE'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {!!item.message_text && (
                                <Text style={[s.msgText, { color: isMine ? C.sentText : C.receivedText }]}>
                                    {item.message_text}
                                </Text>
                            )}

                            <View style={s.timeRow}>
                                <Text style={[s.timeText, { color: isMine ? C.sentTime : C.receivedTime }]}>{time}</Text>
                                {isMine && (
                                    <Text style={[s.tick, { color: item.read ? '#A5B4FC' : 'rgba(255,255,255,0.45)' }]}>
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {item.reactions && item.reactions.length > 0 && (
                            <View style={[s.reactionsRow, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
                                {Object.entries(
                                    item.reactions.reduce((acc: any, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})
                                ).map(([emoji, count]) => (
                                    <View key={emoji} style={s.reactionChip}>
                                        <Text style={s.reactionEmoji}>{emoji}</Text>
                                        <Text style={s.reactionCount}>{String(count)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const selectDoc = async () => {
        try {
            const result = await pick({ type: [types.allFiles], copyTo: 'cachesDirectory' });
            if (result?.[0]) await uploadDocument(result[0]);
        } catch (error) {
            if (!isCancel(error)) Alert.alert('Error', 'Failed to pick document');
        }
    };

    const uploadDocument = async (file: any) => {
        if (!currentUserId) { Alert.alert('Error', 'User not authenticated'); return; }
        try {
            setUploadingImage(true);
            const fileUri = file.fileCopyUri || file.uri;
            const fileExt = file.name?.split('.').pop()?.toLowerCase() || 'bin';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
            const filePath = `${isImage ? 'chat-images' : 'chat-documents'}/${currentUserId}/${Date.now()}.${fileExt}`;
            const base64 = await RNFS.readFile(fileUri, 'base64');
            const { error: uploadError } = await supabase.storage.from('avatars')
                .upload(filePath, decode(base64), { contentType: file.type || 'application/octet-stream', upsert: true });
            if (uploadError) { Alert.alert('Error', `Failed to upload: ${uploadError.message}`); return; }
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const msgData: any = { sender_id: currentUserId, receiver_id: receiverId, message_text: '' };
            if (isImage) msgData.image_url = data.publicUrl;
            else { msgData.file_url = data.publicUrl; msgData.file_name = file.name; msgData.file_type = fileExt; }
            const { error: dbError } = await supabase.from('messages').insert([msgData]);
            if (dbError) { Alert.alert('Error', 'Failed to send file'); return; }
            Toast.show({ type: 'success', text1: isImage ? 'Image sent!' : 'File sent!', position: 'top' });
        } catch (err: any) {
            Alert.alert('Upload failed', err.message || 'Something went wrong');
        } finally { setUploadingImage(false); }
    };

    if (loading) {
        return (
            <View style={s.loaderBg}>
                <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
                <View style={s.loaderCard}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={s.loaderTitle}>Opening conversation</Text>
                    <Text style={s.loaderSub}>Please wait…</Text>
                </View>
            </View>
        );
    }

    const initials = getInitials(userName);

    return (
        <ImageBackground source={background} style={s.root} resizeMode="cover">
            <StatusBar barStyle="dark-content" backgroundColor={C.headerBg} />
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={behaviour}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>

                    <View style={s.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} activeOpacity={0.7}>
                            <Text style={s.backChevron}>‹</Text>
                        </TouchableOpacity>

                        <View style={s.headerAvatarWrap}>
                            <Text style={s.headerAvatarText}>{initials}</Text>
                            <View style={[s.onlineDot, { backgroundColor: receiverOnline ? C.online : C.offline }]} />
                        </View>

                        <View style={s.headerMeta}>
                            <Text style={s.headerName} numberOfLines={1}>{userName || 'Chat'}</Text>
                            <Text style={[s.headerStatus, { color: receiverOnline ? C.online : C.muted }]}>
                                {receiverOnline ? '● Online' : `Last seen ${formatLastSeen(receiverLastSeen)}`}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn} activeOpacity={0.7}>
                            <View style={s.dotsWrap}>
                                <View style={s.dot} /><View style={s.dot} /><View style={s.dot} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {showMenu && (
                        <View style={StyleSheet.absoluteFillObject as any} pointerEvents="box-none">
                            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowMenu(false)} />
                            <View style={s.menuCard}>
                                <TouchableOpacity onPress={clearChat} style={s.menuItem}>
                                    <Text style={s.menuDanger}>Clear Chat</Text>
                                </TouchableOpacity>

                                {/* Block user */}
                                <TouchableOpacity
                                    onPress={isBlocked ? unblockUser : blockUser}
                                    style={s.menuItem}
                                >
                                    <Text style={s.menuDanger}>
                                        {isBlocked ? 'Unblock User' : 'Block User'}
                                    </Text>
                                </TouchableOpacity>
                                <View style={s.menuDivider} />
                                <TouchableOpacity onPress={() => setShowMenu(false)} style={s.menuItem}>
                                    <Text style={s.menuCancel}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <FlatList
                        ref={flatListRef}
                        data={messageList}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        style={{ flex: 1 }}
                        contentContainerStyle={s.listContent}
                        inverted
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={s.emptyWrap}>
                                <Text style={s.emptyTitle}>No messages yet</Text>
                                <Text style={s.emptySub}>Say hello and start the conversation!</Text>
                            </View>
                        }
                    />

                    <View style={s.inputBar}>
                        <TouchableOpacity style={s.attachBtn} onPress={selectDoc}
                            disabled={uploadingImage} activeOpacity={0.7}>
                            {uploadingImage
                                ? <ActivityIndicator size="small" color={C.primary} />
                                : <Image source={ImageName.Upload} style={s.icon} />}
                        </TouchableOpacity>

                        <TextInput
                            style={s.textInput}
                            placeholder="Type a message…"
                            placeholderTextColor={C.muted}
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!sending}
                        />

                        <TouchableOpacity
                            style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnOff]}
                            onPress={handleSend}
                            disabled={sending || !inputText.trim()}
                            activeOpacity={0.8}>
                            {sending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Image source={ImageName.NewSend} style={s.icon} />}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                <ImageView
                    images={imageViewerUri ? [{ uri: imageViewerUri }] : []}
                    imageIndex={0} visible={isImageViewerVisible}
                    onRequestClose={() => setIsImageViewerVisible(false)} />

                <Modal visible={isPdfVisible} onRequestClose={() => setIsPdfVisible(false)} animationType="slide">
                    <View style={{ flex: 1 }}>
                        <View style={s.pdfBar}>
                            <TouchableOpacity onPress={() => setIsPdfVisible(false)} style={s.pdfCloseBtn}>
                                <Text style={s.pdfCloseText}>✕</Text>
                            </TouchableOpacity>
                            <Text style={s.pdfTitle}>PDF Viewer</Text>
                            <View style={{ width: 40 }} />
                        </View>
                        {pdfUri
                            ? <Pdf trustAllCerts={false} source={{ uri: pdfUri, cache: true }}
                                style={{ flex: 1, width: '100%' }}
                                onError={() => Alert.alert('Error', 'Cannot display PDF')} />
                            : <ActivityIndicator size="large" style={{ marginTop: 30 }} color={C.primary} />}
                    </View>
                </Modal>
            </View>

            <Modal visible={reactionPickerVisible} transparent animationType="fade"
                onRequestClose={() => setReactionPickerVisible(false)}>
                <Pressable style={s.reactionOverlay} onPress={() => setReactionPickerVisible(false)}>
                    <View style={s.reactionSheet}>
                        <Text style={s.reactionLabel}>React to message</Text>
                        <View style={s.reactionRow}>
                            {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                <TouchableOpacity key={emoji} activeOpacity={0.7} style={s.reactionBtn}
                                    onPress={() => {
                                        if (selectedMessageId) {
                                            addReaction(selectedMessageId, emoji);
                                            setReactionPickerVisible(false);
                                            setSelectedMessageId(null);
                                        }
                                    }}>
                                    <Text style={{ fontSize: 26 }}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </ImageBackground>
    );
};

export default ChatBox;

const s = StyleSheet.create({
    root: { flex: 1, width: '100%', height: '100%' },
    loaderBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
    loaderCard: {
        alignItems: 'center', backgroundColor: '#fff', borderRadius: 28, padding: 44,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 28, elevation: 14
    },
    loaderTitle: { marginTop: 20, fontSize: 17, fontWeight: '700', color: C.receivedText, letterSpacing: 0.2 },
    loaderSub: { marginTop: 6, fontSize: 13, color: C.muted },
    icon: { width: 24, height: 24 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingBottom: 14,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        backgroundColor: C.headerBg,
        borderBottomWidth: 1, borderBottomColor: C.border,
        shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5,
        gap: 8,
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
    backChevron: { fontSize: 30, color: C.primary, fontWeight: '300', marginTop: -2 },
    headerAvatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    headerAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
    onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.headerBg },
    headerMeta: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '700', color: C.receivedText, letterSpacing: 0.1 },
    headerStatus: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    dotsWrap: { gap: 3, alignItems: 'center' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary },
    menuCard: {
        position: 'absolute', top: Platform.OS === 'ios' ? 108 : 94, right: 14, zIndex: 1000,
        backgroundColor: '#fff', borderRadius: 18, paddingVertical: 6, width: 188,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 12,
    },
    menuItem: { paddingVertical: 15, paddingHorizontal: 20 },
    menuDanger: { fontSize: 14, fontWeight: '700', color: C.danger },
    menuCancel: { fontSize: 14, fontWeight: '500', color: C.muted },
    menuDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 12 },
    listContent: { paddingHorizontal: 14, paddingVertical: 18 },
    dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, paddingHorizontal: 4 },
    dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.07)' },
    dateLabel: { marginHorizontal: 10, fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3 },
    msgRowRight: { justifyContent: 'flex-end' },
    msgRowLeft: { justifyContent: 'flex-start' },
    smallAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 6, marginBottom: 4 },
    smallAvatarText: { fontSize: 11, fontWeight: '800', color: C.primary },
    bubble: { borderRadius: 22, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
    bubbleSent: { backgroundColor: C.sent, borderBottomRightRadius: 4 },
    bubbleReceived: { backgroundColor: C.received, borderBottomLeftRadius: 4 },
    imgWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 6 },
    msgImage: { width: 210, height: 210 },
    msgText: { fontSize: 15, lineHeight: 22, letterSpacing: 0.1 },
    timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5 },
    timeText: { fontSize: 10, fontWeight: '500' },
    tick: { fontSize: 11, fontWeight: '700' },
    reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginHorizontal: 2 },
    reactionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, marginRight: 4, marginBottom: 4, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
    reactionEmoji: { fontSize: 13 },
    reactionCount: { fontSize: 11, fontWeight: '700', color: C.muted, marginLeft: 4 },
    fileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 10, marginBottom: 6 },
    fileCardSent: { backgroundColor: 'rgba(255,255,255,0.16)' },
    fileCardReceived: { backgroundColor: C.primaryLight },
    fileIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    fileIconEmoji: { fontSize: 22 },
    fileName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
    fileExt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 90 },
    emptyRing: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: C.receivedText, marginBottom: 7 },
    emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 21 },
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14, backgroundColor: C.inputBg, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
    attachBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
    attachIcon: { fontSize: 28, color: C.primary, marginTop: -2 },
    textInput: { flex: 1, minHeight: 46, maxHeight: 120, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 23, paddingHorizontal: 18, paddingVertical: 11, fontSize: 15, color: C.receivedText, lineHeight: 21 },
    sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
    sendBtnOff: { backgroundColor: C.border, shadowOpacity: 0, elevation: 0 },
    sendArrow: { fontSize: 18, color: '#fff', marginLeft: 2 },
    pdfBar: { height: Platform.OS === 'ios' ? 94 : 68, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: C.primary },
    pdfCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
    pdfCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    pdfTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
    reactionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', alignItems: 'center' },
    reactionSheet: { backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 18 },
    reactionLabel: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 },
    reactionRow: { flexDirection: 'row', gap: 8 },
    reactionBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
});