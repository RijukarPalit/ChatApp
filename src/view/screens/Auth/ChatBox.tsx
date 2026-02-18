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
    image_url?: string;  // Added this
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

    const { background } = useChatBackground();



    const [showMenu, setShowMenu] = useState(false);

    // const [messages, setMessages] = useState([]);

    const flatListRef = useRef<FlatList>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const behaviour = useKeyboardBehavior();

    const SUPABASE_FUNCTION_URL =
        'https://uphnjyseymtnimskcepk.functions.supabase.co/send-notification';


    useEffect(() => {
        initializeChat();

        // Cleanup on unmount
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    const [uploadingImage, setUploadingImage] = useState(false)

    const initializeChat = async () => {
        const user = await getCurrentUser();
        if (user) {
            await fetchMessages(user.id);
            subscribeToMessages(user.id);
        }
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
                setCurrentUserId(user.id);

                // Fetch user name from profiles table
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


    // const addReaction = async (emoji: string) => {
    //     if (!currentUserId || !selectedMessageId) return;

    //     try {
    //         await supabase
    //             .from('message_reactions')
    //             .insert([{
    //                 message_id: selectedMessageId,
    //                 user_id: currentUserId,
    //                 emoji: emoji,
    //             }]);

    //         setReactionPickerVisible(false);
    //         setSelectedMessageId(null);
    //     } catch (error) {
    //         console.log('Reaction error:', error);
    //     }
    // };

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

            // INSTANT UI UPDATE
            setMessageList(prev =>
                prev.map(msg =>
                    msg.id === messageId
                        ? {
                            ...msg,
                            reactions: [...(msg.reactions || []), data],
                        }
                        : msg
                )
            );


        } catch (err) {
            console.error("Unexpected error:", err);
        }
    };


    // Fetch all messages between current user and receiver
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

            console.log("Formatted:", formattedMessages);

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


    // Mark all received messages as read
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

    // Subscribe to real-time messages
    const subscribeToMessages = (userId: string) => {
        // Remove existing channel if any
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

                    // Only add if it's part of this conversation
                    if (
                        (newMessage.sender_id === userId && newMessage.receiver_id === receiverId) ||
                        (newMessage.sender_id === receiverId && newMessage.receiver_id === userId)
                    ) {
                        setMessageList((prev) => {
                            // Check if message already exists to avoid duplicates
                            const exists = prev.some(msg => msg.id === newMessage.id);
                            if (exists) return prev;
                            return [newMessage, ...prev];
                        });

                        // Mark as read if it's from the other user
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

    // Send message to Supabase
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
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to send message',
                    position: 'top',
                });
                return;
            }

            console.log('✅ Message sent:', data);

            // Clear input immediately for better UX
            setInputText('');
            try {
                await fetch(SUPABASE_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        receiverId: receiverId,
                        title: 'New Message',
                        body: messageToSend,
                        data: {
                            // type: 'chat',
                            // senderId: currentUserId,

                            userId: currentUserId,      // sender id
                            userName: currentUserName,  // sender name (IMPORTANT)
                        },
                    }),
                });
            } catch (pushError) {
                console.log('Push notification error:', pushError);
            }

        } catch (err: any) {
            console.error('Unexpected error:', err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to send message',
                position: 'top',
            });
        } finally {
            setSending(false);
        }
    };

    // const clearChat = () => {
    //     setMessageList([]);  // Clears the actual message list
    //     setShowMenu(false);  // Closes the menu
    // };

    const clearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to delete all messages? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                        console.log('Cancel pressed');
                        setShowMenu(false);
                    },
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        console.log('Delete pressed');
                        setShowMenu(false);

                        if (!currentUserId) {
                            Alert.alert('Error', 'You must be logged in');
                            return;
                        }

                        try {
                            // Get all message IDs to delete
                            const { data: messagesToDelete, error: fetchError } = await supabase
                                .from('messages')
                                .select('id')
                                .or(
                                    `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
                                );

                            if (fetchError) {
                                console.error('Error fetching messages:', fetchError);
                                Alert.alert('Error', 'Failed to fetch messages');
                                return;
                            }

                            if (!messagesToDelete || messagesToDelete.length === 0) {
                                Toast.show({
                                    type: 'info',
                                    text1: 'No messages to delete',
                                    position: 'top',
                                });
                                return;
                            }

                            console.log(` Deleting ${messagesToDelete.length} messages...`);

                            // Delete all messages
                            const { error: deleteError } = await supabase
                                .from('messages')
                                .delete()
                                .or(
                                    `and(sender_id.eq.${currentUserId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUserId})`
                                );

                            if (deleteError) {
                                console.error('Error deleting messages:', deleteError);
                                Alert.alert('Error', `Failed to delete messages: ${deleteError.message}`);
                                return;
                            }

                            // Clear UI
                            setMessageList([]);

                            Toast.show({
                                type: 'success',
                                text1: 'Chat cleared',
                                text2: `${messagesToDelete.length} messages deleted permanently`,
                                position: 'top',
                            });

                            console.log('✅ Chat cleared successfully from database');

                        } catch (err: any) {
                            console.error('Unexpected error clearing chat:', err);
                            Alert.alert('Error', err?.message || 'Something went wrong');
                        }
                    },
                },
            ]
        );
    };


    // Render message bubble
    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.sender_id === currentUserId;
        const bubbleStyle = isMine
            ? styles.messageBubbleRight
            : styles.messageBubbleLeft;

        // Format timestamp
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
                    style={[styles.messageBubble, bubbleStyle]}
                >
                    {item.image_url && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                setImageViewerUri(item.image_url!);
                                setIsImageViewerVisible(true);
                            }}
                        >
                            <Image
                                source={{ uri: item.image_url }}
                                style={styles.messageImage}
                                resizeMode="cover"
                            />
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
                            <Text style={styles.fileIcon}>
                                {item.file_type === 'pdf' ? '📕' : '📄'}
                            </Text>
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileName} numberOfLines={1}>
                                    {item.file_name || 'Document'}
                                </Text>
                                <Text style={styles.fileType}>
                                    {item.file_type?.toUpperCase() || 'FILE'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {item.message_text && (
                        <Text
                            style={[
                                styles.messageText,
                                { color: isMine ? '#fff' : '#000' }
                            ]}
                        >
                            {item.message_text}
                        </Text>
                    )}

                    <Text
                        style={[
                            styles.messageTime,
                            { color: isMine ? '#fff' : '#000' }
                        ]}
                    >
                        {messageTime}
                    </Text>
                </TouchableOpacity>

                {/* 👇 REACTIONS DISPLAY */}
                {item.reactions && item.reactions.length > 0 && (
                    <View
                        style={{
                            flexDirection: 'row',
                            marginTop: 4,
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            marginHorizontal: 10,
                        }}
                    >
                        {Object.entries(
                            item.reactions.reduce((acc: any, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([emoji, count]) => (
                            <View
                                key={emoji}
                                style={{
                                    backgroundColor: '#eee',
                                    borderRadius: 12,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    marginRight: 5,
                                }}
                            >
                                <Text>{emoji} {count}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );

    };


    /* ================= PICK IMAGE ================= */
    const pickImage = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.7,
                maxWidth: 1000,
                maxHeight: 1000,
                includeBase64: true,
            })

            if (result.didCancel) {
                console.log('User cancelled image picker')
                return
            }

            if (result.errorCode) {
                console.log('ImagePicker Error: ', result.errorMessage)
                Alert.alert('Error', result.errorMessage || 'Failed to pick image')
                return
            }

            if (result.assets && result.assets[0] && result.assets[0].base64) {
                await uploadImage(result.assets[0].base64, result.assets[0].uri || '')
            }
        } catch (error) {
            console.log('Image picker error:', error)
            Alert.alert('Error', 'Failed to pick image')
        }
    }

    const selectDoc = async () => {
        try {
            const result = await pick({
                type: [types.allFiles],
                copyTo: 'cachesDirectory',
            });

            if (result?.[0]) {
                await uploadDocument(result[0]);
            }
        } catch (error) {
            if (isCancel(error)) {
                console.log('User cancelled document picker');
            } else {
                console.log('Picker error:', error);
                Alert.alert('Error', 'Failed to pick document');
            }
        }
    };
    const uploadDocument = async (file: any) => {
        if (!currentUserId) {
            Alert.alert('Error', 'User not authenticated');
            return;
        }

        try {
            setUploadingImage(true);

            const fileUri = file.fileCopyUri || file.uri;
            const fileExt = file.name?.split('.').pop()?.toLowerCase() || 'bin';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);

            //  Use avatars bucket for everything
            const bucket = 'avatars';

            // Organize by folder: chat-images for images, chat-documents for files
            const folder = isImage ? 'chat-images' : 'chat-documents';
            const filePath = `${folder}/${currentUserId}/${Date.now()}.${fileExt}`;

            //  Read file
            const base64 = await RNFS.readFile(fileUri, 'base64');

            // Decode base64 → ArrayBuffer
            const arrayBuffer = decode(base64);

            //  Upload
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, arrayBuffer, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: true,
                });

            if (uploadError) {
                console.log('Upload error:', uploadError);
                Alert.alert('Error', `Failed to upload: ${uploadError.message}`);
                return;
            }

            // Public URL
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            // Message payload
            const messageData: any = {
                sender_id: currentUserId,
                receiver_id: receiverId,
                message_text: '',
            };

            if (isImage) {
                messageData.image_url = data.publicUrl;
            } else {
                messageData.file_url = data.publicUrl;
                messageData.file_name = file.name;
                messageData.file_type = fileExt;
            }

            //  Save message
            const { error: dbError } = await supabase
                .from('messages')
                .insert([messageData]);

            if (dbError) {
                console.log('Database insert error:', dbError);
                Alert.alert('Error', 'Failed to send file');
                return;
            }

            console.log('File sent successfully');
            Toast.show({
                type: 'success',
                text1: isImage ? 'Image sent!' : 'File sent!',
                position: 'top',
            });

        } catch (err: any) {
            console.log('❌ Upload failed:', err);
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
        <ImageBackground
            // source={ImageName.ChatBg}
            source={background}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={styles.container}
                    // behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    behavior={behaviour}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    {/* Top Bar */}
                    {/* <View style={styles.popbg}> */}
                    {/* Top Bar */}
                    <View style={styles.rowContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Image source={ImageName.Back} style={styles.backicon} />
                        </TouchableOpacity>

                        <Text style={styles.title}>{userName || 'Chat'}</Text>

                        <TouchableOpacity onPress={() => setShowMenu(true)}>
                            <Image source={ImageName.Options} style={styles.options} />
                        </TouchableOpacity>
                    </View>
                    {/* </View> */}

                    {/* For Clear chat */}
                    {showMenu && (
                        <View style={styles.menuOverlay}>
                            {/* Closes menu when tapping outside */}
                            <Pressable
                                style={styles.overlayBackground}
                                onPress={() => setShowMenu(false)}
                            />

                            {/* Menu Box */}
                            <View style={styles.menuContainer}>
                                <TouchableOpacity
                                    onPress={clearChat}
                                    style={styles.menuItem}
                                >
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
                                // onPress={pickImage}
                                onPress={selectDoc}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color="#DA70D6" />
                                ) : (
                                    <Image
                                        source={ImageName.Upload}
                                        style={styles.icon2}
                                    />
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
                                    <Image
                                        source={ImageName.Send}
                                        style={styles.icon}
                                    />
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
                <Modal
                    visible={isPdfVisible}
                    onRequestClose={() => setIsPdfVisible(false)}
                    animationType="slide"
                >
                    <View style={{ flex: 1, backgroundColor: '#fff' }}>
                        {/* Simple Header */}
                        <View style={{
                            height: 60,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 15,
                            backgroundColor: '#DA70D6',
                            paddingTop: Platform.OS === 'ios' ? 20 : 0
                        }}>
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
                                onError={(error) => {
                                    console.log(error);
                                    Alert.alert("Error", "Cannot display PDF");
                                }}
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
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onPress={() => setReactionPickerVisible(false)}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            backgroundColor: '#fff',
                            padding: 15,
                            borderRadius: 30,
                        }}
                    >
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
    container: {
        flex: 1,
        // backgroundColor : 'rgba(64, 124, 212, 0.44)' 
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F6F1',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    popbg: {
        width: '100%',
        height: 80,
        // paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 40,
        marginLeft: '-5%',
        // borderRadius: 20,
        // backgroundColor: 'rgba(255, 255, 255, 0)',
        // backgroundColor: '#19eb2400',
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        flex: 1,
    },
    backicon: {
        width: 36,
        height: 36,
    },
    options: {
        width: 36,
        height: 36,
        // ← tintColor: 'transparent' REMOVED — this was hiding the icon!
    },
    profileSection: {
        // leave empty or remove entirely
    }, // empty — remove or leave blank
    popBtn: {
        height: 40,
        width: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DA70D6',
    },
    icon: { width: 20, height: 20, tintColor: '#fff' },
    icon2: { width: 20, height: 20 },
    messageBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#fff',

    },
    input: {
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
        marginRight: 10,
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DA70D6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#ccc',
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        marginVertical: 4,
        maxWidth: '75%',
    },
    messageBubbleRight: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(9, 12, 230, 0.93)',
        marginRight: 8,
    },
    messageBubbleLeft: {
        alignSelf: 'flex-start',
        // backgroundColor: 'rgba(11, 77, 94, 0.93)',
        backgroundColor: '#fff',
        marginLeft: 8,
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
    },
    messageImage: {
        width: 200,
        height: 200,
        borderRadius: 10,
        marginBottom: 5,
    },
    messageTime: {
        color: '#fff',
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        fontWeight: '600',
    },
    emptySubText: {
        fontSize: 14,
        color: '#bbb',
        marginTop: 8,
    },
    fileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
    },
    fileIcon: {
        fontSize: 32,
        marginRight: 10,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    fileType: {
        color: '#fff',
        fontSize: 11,
        opacity: 0.8,
    },

    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },

    menuText: {
        fontSize: 14,
        color: '#000',
    },

    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        zIndex: 999,
    },
    overlayBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    menuContainer: {
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
        shadowRadius: 6,
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 8,
    },


});


