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
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { wp } from '../../../utils/dimention';
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

const ChatBox = () => {
    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>()
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

    const { background } = useChatBackground();

    const [showMenu, setShowMenu] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // ✅ FIX: Store userId in a ref so it's always accessible synchronously
    // (useState is async, so updateMyStatus called right after setCurrentUserId
    //  would still see null — the ref fixes this)
    const currentUserIdRef = useRef<string | null>(null);

    const behaviour = useKeyboardBehavior();

    const SUPABASE_FUNCTION_URL =
        'https://uphnjyseymtnimskcepk.functions.supabase.co/send-notification';


    // ✅ FIX: Accept userId as a parameter instead of reading from state
    const updateMyStatus = async (isOnline: boolean, userId?: string) => {
        const uid = userId || currentUserIdRef.current;
        if (!uid) return;

        await supabase
            .from('user')
            .update({
                is_online: isOnline,
                last_seen: new Date().toISOString(),
            })
            .eq('id', uid);
    };

    const getCurrentUser = async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error('Error getting user:', error);
                Alert.alert('Error', 'Failed to authenticate user');
                return null;
            }

            if (user) {
                // ✅ FIX: Set both state AND ref at the same time
                setCurrentUserId(user.id);
                currentUserIdRef.current = user.id;

                const { data: profileData, error: profileError } = await supabase
                    .from('user')
                    .select('name')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.log('Error fetching profile:', profileError);
                } else if (profileData) {
                    setCurrentUserName(profileData.name);
                }

                return user;
            }

            Alert.alert('Error', 'You must be logged in to chat');
            return null;

        } catch (err) {
            console.error('Unexpected error getting user:', err);
            return null;
        }
    };

    const initializeChat = async () => {
        const user = await getCurrentUser();
        if (user) {
            // ✅ FIX: Pass user.id directly — no dependency on state
            await updateMyStatus(true, user.id);
            await fetchMessages(user.id);
            subscribeToMessages(user.id);
        }
    };

    const subscribeToUserStatus = () => {
        const channel = supabase
            .channel(`status-${receiverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user',
                    filter: `id=eq.${receiverId}`,
                },
                (payload) => {
                    console.log("STATUS UPDATE:", payload.new);
                    setReceiverOnline(payload.new.is_online);
                    setReceiverLastSeen(payload.new.last_seen);
                }
            )
            .subscribe();

        return channel;
    };

    const addReaction = async (messageId: string, emoji: string) => {
        try {
            const { data, error } = await supabase
                .from('message_reactions')
                .insert([{
                    message_id: messageId,
                    user_id: currentUserId,
                    emoji: emoji,
                }])
                .select()
                .single();

            if (error) {
                console.error("Reaction error:", error);
                return;
            }

            setMessageList(prev =>
                prev.map(msg =>
                    msg.id === messageId
                        ? { ...msg, reactions: [...(msg.reactions || []), data] }
                        : msg
                )
            );
        } catch (err) {
            console.error("Unexpected error:", err);
        }
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
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (statusChannel) {
                supabase.removeChannel(statusChannel);
            }
            // ✅ FIX: updateMyStatus uses the ref, so it works reliably on unmount
            updateMyStatus(false);
        };
    }, []);

    // ✅ FIX: AppState listener now uses ref instead of state — works immediately
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                updateMyStatus(true);
            } else {
                updateMyStatus(false);
            }
        });

        return () => subscription.remove();
        // ✅ Removed currentUserId from dependency — ref handles it without re-subscribing
    }, []);

    const fetchMessages = async (userId: string) => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('messages')
                .select('*, message_reactions(*)')
                .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching messages:', error);
                return;
            }

            const formattedMessages = data?.map((msg: any) => ({
                ...msg,
                reactions: msg.message_reactions || [],
            }));

            setMessageList(formattedMessages || []);

            if (data && data.length > 0) {
                markMessagesAsRead(userId);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReceiverStatus = async () => {
        const { data, error } = await supabase
            .from('user')
            .select('is_online, last_seen')
            .eq('id', receiverId)
            .single();

        if (!error && data) {
            setReceiverOnline(data.is_online);
            setReceiverLastSeen(data.last_seen);
        }
    };

    const markMessagesAsRead = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('messages')
                .update({ read: true })
                .eq('receiver_id', userId)
                .eq('sender_id', receiverId)
                .eq('read', false);

            if (error) {
                console.error('Error marking messages as read:', error);
            }
        } catch (err) {
            console.error('Unexpected error marking as read:', err);
        }
    };

    const subscribeToMessages = (userId: string) => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
            .channel(`messages-${userId}-${receiverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    console.log('New message received:', payload.new);
                    const newMessage = payload.new as Message;

                    if (
                        (newMessage.sender_id === userId && newMessage.receiver_id === receiverId) ||
                        (newMessage.sender_id === receiverId && newMessage.receiver_id === userId)
                    ) {
                        setMessageList((prev) => {
                            const exists = prev.some(msg => msg.id === newMessage.id);
                            if (exists) return prev;
                            return [newMessage, ...prev];
                        });

                        if (newMessage.sender_id === receiverId) {
                            markMessagesAsRead(userId);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        channelRef.current = channel;
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        if (!currentUserId) {
            Alert.alert('Error', 'You must be logged in to send messages');
            return;
        }

        try {
            setSending(true);

            const messageToSend = inputText.trim();

            const { data, error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: currentUserId,
                    receiver_id: receiverId,
                    message_text: messageToSend,
                }])
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send message', position: 'top' });
                return;
            }

            console.log('✅ Message sent:', data);
            setInputText('');

            try {
                await fetch(SUPABASE_FUNCTION_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        receiverId: receiverId,
                        title: 'New Message',
                        body: messageToSend,
                        data: {
                            userId: currentUserId,
                            userName: currentUserName,
                        },
                    }),
                });
            } catch (pushError) {
                console.log('Push notification error:', pushError);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to send message', position: 'top' });
        } finally {
            setSending(false);
        }
    };

    const clearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to delete all messages? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => { setShowMenu(false); },
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setShowMenu(false);

                        if (!currentUserId) {
                            Alert.alert('Error', 'You must be logged in');
                            return;
                        }

                        try {
                            const { data: messagesToDelete, error: fetchError } = await supabase
                                .from('messages')
                                .select('id')
                                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);

                            if (fetchError) {
                                Alert.alert('Error', 'Failed to fetch messages');
                                return;
                            }

                            if (!messagesToDelete || messagesToDelete.length === 0) {
                                Toast.show({ type: 'info', text1: 'No messages to delete', position: 'top' });
                                return;
                            }

                            const { error: deleteError } = await supabase
                                .from('messages')
                                .delete()
                                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`);

                            if (deleteError) {
                                Alert.alert('Error', `Failed to delete messages: ${deleteError.message}`);
                                return;
                            }

                            setMessageList([]);
                            Toast.show({ type: 'success', text1: 'Chat cleared', text2: `${messagesToDelete.length} messages deleted permanently`, position: 'top' });
                        } catch (err: any) {
                            Alert.alert('Error', err?.message || 'Something went wrong');
                        }
                    },
                },
            ]
        );
    };
    

    // ✅ FIX: Friendly "last seen" formatter
    const formatLastSeen = (isoString: string | null): string => {
        if (!isoString) return 'Offline';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Last seen just now';
        if (diffMins < 60) return `Last seen ${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Last seen ${diffHours}h ago`;
        return `Last seen ${date.toLocaleDateString()}`;
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.sender_id === currentUserId;

        const messageTime = new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });

        return (
            <View style={{ marginVertical: 4 }}>
                <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => {
                        setSelectedMessageId(item.id);
                        setReactionPickerVisible(true);
                    }}
                    style={[styles.messageBubble, isMine ? styles.messageBubbleRight : styles.messageBubbleLeft]}
                >
                    {item.image_url && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                setImageViewerUri(item.image_url!);
                                setIsImageViewerVisible(true);
                            }}
                        >
                            <Image source={{ uri: item.image_url }} style={styles.messageImage} resizeMode="cover" />
                        </TouchableOpacity>
                    )}

                    {item.file_url && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (item.file_type === 'pdf') {
                                    setPdfUri(item.file_url!);
                                    setIsPdfVisible(true);
                                } else {
                                    Linking.openURL(item.file_url!);
                                }
                            }}
                            style={styles.fileContainer}
                        >
                            <Text style={styles.fileIcon}>{item.file_type === 'pdf' ? '📕' : '📄'}</Text>
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileName} numberOfLines={1}>{item.file_name || 'Document'}</Text>
                                <Text style={styles.fileType}>{item.file_type?.toUpperCase() || 'FILE'}</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {item.message_text && (
                        <Text style={[styles.messageText, { color: isMine ? '#fff' : '#000' }]}>
                            {item.message_text}
                        </Text>
                    )}

                    <Text style={[styles.messageTime, { color: isMine ? '#fff' : '#000' }]}>
                        {messageTime}
                    </Text>
                </TouchableOpacity>

                {item.reactions && item.reactions.length > 0 && (
                    <View style={{
                        flexDirection: 'row',
                        marginTop: 4,
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        marginHorizontal: 10,
                    }}>
                        {Object.entries(
                            item.reactions.reduce((acc: any, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([emoji, count]) => (
                            <View key={emoji} style={{ backgroundColor: '#eee', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 5 }}>
                                <Text>{emoji} {count}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const pickImage = async () => {
        try {
            const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 1000, maxHeight: 1000, includeBase64: true })
            if (result.didCancel) return;
            if (result.errorCode) { Alert.alert('Error', result.errorMessage || 'Failed to pick image'); return; }
            if (result.assets && result.assets[0] && result.assets[0].base64) {
                await uploadImage(result.assets[0].base64, result.assets[0].uri || '')
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image')
        }
    }

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
            const bucket = 'avatars';
            const folder = isImage ? 'chat-images' : 'chat-documents';
            const filePath = `${folder}/${currentUserId}/${Date.now()}.${fileExt}`;
            const base64 = await RNFS.readFile(fileUri, 'base64');
            const arrayBuffer = decode(base64);

            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, { contentType: file.type || 'application/octet-stream', upsert: true });
            if (uploadError) { Alert.alert('Error', `Failed to upload: ${uploadError.message}`); return; }

            const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
            const messageData: any = { sender_id: currentUserId, receiver_id: receiverId, message_text: '' };

            if (isImage) {
                messageData.image_url = data.publicUrl;
            } else {
                messageData.file_url = data.publicUrl;
                messageData.file_name = file.name;
                messageData.file_type = fileExt;
            }

            const { error: dbError } = await supabase.from('messages').insert([messageData]);
            if (dbError) { Alert.alert('Error', 'Failed to send file'); return; }

            Toast.show({ type: 'success', text1: isImage ? 'Image sent!' : 'File sent!', position: 'top' });
        } catch (err: any) {
            Alert.alert('Upload failed', err.message || 'Something went wrong');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#DA70D6" />
                <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
        );
    }

    return (
        <ImageBackground source={background} style={styles.backgroundImage} resizeMode="cover">
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={behaviour}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    {/* Top Bar */}
                    <View style={styles.rowContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Image source={ImageName.Back} style={styles.backicon} />
                        </TouchableOpacity>

                        <View style={{ flex: 1, alignItems: 'center', marginTop: -5, paddingHorizontal: 10 }}>
                            <Text style={styles.title}>{userName || 'Chat'}</Text>
                            {/* ✅ FIX: Clean online/offline display using formatter */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: receiverOnline ? '#22C55E' : '#9CA3AF' }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: receiverOnline ? '#22C55E' : '#6B7280' }
                                ]}>
                                    {receiverOnline ? 'Online' : formatLastSeen(receiverLastSeen)}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => setShowMenu(true)}>
                            <Image source={ImageName.Options} style={styles.options} />
                        </TouchableOpacity>
                    </View>

                    {/* Clear Chat Menu */}
                    {showMenu && (
                        <View style={styles.menuOverlay}>
                            <Pressable style={styles.overlayBackground} onPress={() => setShowMenu(false)} />
                            <View style={styles.menuContainer}>
                                <TouchableOpacity onPress={clearChat} style={styles.menuItem}>
                                    <Text style={styles.menuText}>Clear Chat</Text>
                                </TouchableOpacity>
                                <View style={styles.menuDivider} />
                                <TouchableOpacity
                                    onPress={() => setShowMenu(false)}
                                    style={styles.menuItem}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={[styles.menuText, { color: '#888' }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messageList}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        style={{ flex: 1, padding: 10 }}
                        inverted
                        contentContainerStyle={{ paddingBottom: 10 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No messages yet</Text>
                                <Text style={styles.emptySubText}>Send a message to start chatting!</Text>
                            </View>
                        }
                    />

                    {/* Input */}
                    <View style={styles.messageBar}>
                        <TextInput
                            style={styles.input}
                            placeholder="Message"
                            placeholderTextColor="#aaa"
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!sending}
                        />
                        <View style={{ gap: 5, flexDirection: 'row' }}>
                            <TouchableOpacity
                                style={[styles.sendBtn, uploadingImage && styles.sendBtnDisabled, { backgroundColor: '#fff' }]}
                                onPress={selectDoc}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color="#DA70D6" />
                                ) : (
                                    <Image source={ImageName.Upload} style={styles.icon2} />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                                onPress={handleSend}
                                disabled={sending || !inputText.trim()}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Image source={ImageName.Send} style={styles.icon} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>

                <ImageView
                    images={imageViewerUri ? [{ uri: imageViewerUri }] : []}
                    imageIndex={0}
                    visible={isImageViewerVisible}
                    onRequestClose={() => setIsImageViewerVisible(false)}
                />

                {/* PDF Viewer Modal */}
                <Modal visible={isPdfVisible} onRequestClose={() => setIsPdfVisible(false)} animationType="slide">
                    <View style={{ flex: 1, backgroundColor: '#fff' }}>
                        <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#DA70D6', paddingTop: Platform.OS === 'ios' ? 20 : 0 }}>
                            <TouchableOpacity onPress={() => setIsPdfVisible(false)}>
                                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
                            </TouchableOpacity>
                            <Text style={{ color: '#fff', marginLeft: 20, fontSize: 16 }}>PDF Viewer</Text>
                        </View>
                        {pdfUri ? (
                            <Pdf
                                trustAllCerts={false}
                                source={{ uri: pdfUri, cache: true }}
                                style={{ flex: 1, width: '100%' }}
                                onError={(error) => { console.log(error); Alert.alert("Error", "Cannot display PDF"); }}
                            />
                        ) : (
                            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                        )}
                    </View>
                </Modal>
            </View>

            <Modal
                visible={reactionPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setReactionPickerVisible(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setReactionPickerVisible(false)}
                >
                    <View style={{ flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 30 }}>
                        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => {
                                    if (selectedMessageId) {
                                        addReaction(selectedMessageId, emoji);
                                        setReactionPickerVisible(false);
                                        setSelectedMessageId(null);
                                    }
                                }}
                                style={{ marginHorizontal: 8 }}
                            >
                                <Text style={{ fontSize: 26 }}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </ImageBackground>
    );
};

export default ChatBox;

const styles = StyleSheet.create({
    container: { flex: 1 },
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F6F1' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 40,
    },
    title: { fontSize: 20, fontWeight: 'bold', color: '#000', textAlign: 'center' },
    // ✅ NEW: status dot and text styles
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    backicon:
    {
        width: 36,
        height: 36
    },
    options:
    {
        width: 36,
        height: 36
    },
    popbg:
    {
        width: '100%',
        height: 80,
        paddingVertical: 12,
        marginTop: 40,
        marginLeft: '-5%'
    },
    profileSection: {},
    popBtn:
    {
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DA70D6'
    },
    icon: { width: 20, height: 20, tintColor: '#fff' },
    icon2: { width: 32, height: 32 },
    messageBar:
    {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff'
    },
    input:
    {
        flex: 1,
        minHeight: 55,
        maxHeight: 130,
        borderWidth: 1,
        borderColor: '#aaa',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        color: '#000',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginRight: 10
    },
    sendBtn:
    {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DA70D6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendBtnDisabled: { backgroundColor: '#ccc' },
    messageBubble:
    {
        padding: 10,
        borderRadius: 10,
        marginVertical: 4,
        maxWidth: '75%'
    },
    messageBubbleRight:
    {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(9, 12, 230, 0.93)',
        marginRight: 8
    },
    messageBubbleLeft:
    {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        marginLeft: 8
    },
    messageText: { color: '#fff', fontSize: 16 },
    messageImage: { width: 200, height: 200, borderRadius: 10, marginBottom: 5 },
    messageTime:
    {
        color: '#fff',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end'
    },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 18, color: '#999', fontWeight: '600' },
    emptySubText: { fontSize: 14, color: '#bbb', marginTop: 8 },
    fileContainer:
    {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5
    },
    fileIcon: { fontSize: 32, marginRight: 10 },
    fileInfo: { flex: 1 },
    fileName: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
    fileType: { color: '#fff', fontSize: 11, opacity: 0.8 },
    menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
    menuText: { fontSize: 14, color: '#000' },
    menuOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-start', alignItems: 'flex-end', zIndex: 999 },
    overlayBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    menuContainer:
    {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 8,
        width: 160,
        marginTop: 60,
        marginRight: 10,
        elevation: 5,
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6
    },
    menuDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 8 },
});