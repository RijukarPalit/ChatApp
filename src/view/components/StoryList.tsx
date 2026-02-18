import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, Image, TouchableOpacity,
    StyleSheet, Modal, Dimensions, ActivityIndicator,
    Alert, TextInput
} from 'react-native';

import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { decode } from 'base64-arraybuffer';
import supabase from '../../utils/supabase';


const { width, height } = Dimensions.get('window');

interface Story {
    id: string;
    user_id: string;
    media_url: string;
    media_type: string;
    caption?: string;
    created_at: string;
    expires_at: string;
    views?: number;
    isViewed?: boolean;
}

interface UserStoryGroup {
    user_id: string;
    user_name: string;
    avatar_url?: string;
    stories: Story[];
    hasUnviewed: boolean;
}

// ─── STORY VIEWER ───────────────────────────────────────────
const StoryViewer = ({
    visible, group, currentUserId, onClose
}: {
    visible: boolean;
    group: UserStoryGroup;
    currentUserId: string;
    onClose: () => void;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const progressInterval = useRef<any>(null);
    const STORY_DURATION = 5000;

    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setProgress(0);
        }
        return () => clearInterval(progressInterval.current);
    }, [visible]);

    useEffect(() => {
        if (visible) {
            startProgress();
            markAsViewed(group.stories[currentIndex]?.id);
        }
    }, [currentIndex, visible]);

    const startProgress = () => {
        clearInterval(progressInterval.current);
        setProgress(0);
        const step = (100 / STORY_DURATION) * 100;

        progressInterval.current = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval.current);
                    goNext();
                    return 0;
                }
                return prev + step / 10;
            });
        }, 100);
    };

    const goNext = () => {
        if (currentIndex < group.stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const markAsViewed = async (storyId: string) => {
        if (!storyId) return;
        if (group.stories[currentIndex]?.user_id === currentUserId) return;

        try {
            await supabase
                .from('story_views')
                .upsert([{
                    story_id: storyId,
                    viewer_id: currentUserId,
                }], { onConflict: 'story_id,viewer_id' });
        } catch (err) {
            console.log('View mark error:', err);
        }
    };

    const currentStory = group.stories[currentIndex];
    if (!currentStory) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={viewerStyles.container}>

                {/* ── Progress Bars ── */}
                <View style={viewerStyles.progressContainer}>
                    {group.stories.map((_, index) => (
                        <View key={index} style={viewerStyles.progressBg}>
                            <View style={[
                                viewerStyles.progressFill,
                                {
                                    width: `${index < currentIndex
                                        ? 100
                                        : index === currentIndex
                                            ? progress
                                            : 0}%`
                                }
                            ]} />
                        </View>
                    ))}
                </View>

                {/* ── Header ── */}
                <View style={viewerStyles.header}>
                    <View style={viewerStyles.avatarPlaceholder}>
                        {group.avatar_url ? (
                            <Image
                                source={{ uri: group.avatar_url }}
                                style={viewerStyles.headerAvatar}
                            />
                        ) : (
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                {group.user_name?.charAt(0)?.toUpperCase()}
                            </Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={viewerStyles.headerName}>{group.user_name}</Text>
                        <Text style={viewerStyles.headerTime}>
                            {new Date(currentStory.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: '#fff', fontSize: 22, paddingHorizontal: 8 }}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Story Image ── */}
                <Image
                    source={{ uri: currentStory.media_url }}
                    style={viewerStyles.image}
                    resizeMode="contain"
                />

                {/* ── Caption ── */}
                {currentStory.caption ? (
                    <View style={viewerStyles.captionOverlay}>
                        <Text style={viewerStyles.captionText}>
                            {currentStory.caption}
                        </Text>
                    </View>
                ) : null}

                {/* ── Views (own stories only) ── */}
                {currentStory.user_id === currentUserId && (
                    <View style={viewerStyles.viewsBox}>
                        <Text style={viewerStyles.viewsText}>
                            👁  {currentStory.views || 0} views
                        </Text>
                    </View>
                )}

                {/* ── Tap Areas ── */}
                <View style={viewerStyles.tapAreas}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={goPrev} />
                    <TouchableOpacity style={{ flex: 1 }} onPress={goNext} />
                </View>
            </View>
        </Modal>
    );
};

// ─── ADD STORY BUTTON ────────────────────────────────────────
const AddStoryButton = ({
    currentUserId,
    onAdded,
}: {
    currentUserId: string;
    onAdded: () => void;
}) => {
    const [uploading, setUploading] = useState(false);
    const [caption, setCaption] = useState('');
    const [captionVisible, setCaptionVisible] = useState(false);
    const [selectedUri, setSelectedUri] = useState<string | null>(null);

    const pickImage = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            includeBase64: false,
        });

        if (result.didCancel || !result.assets?.[0]) return;
        setSelectedUri(result.assets[0].uri || null);
        setCaptionVisible(true);
    };

    const uploadStory = async () => {
        if (!selectedUri) return;

        try {
            setUploading(true);
            setCaptionVisible(false);

            const base64 = await RNFS.readFile(selectedUri, 'base64');
            const arrayBuffer = decode(base64);
            const filePath = `stories/${currentUserId}/${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) {
                Alert.alert('Upload failed', uploadError.message);
                return;
            }

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('stories')
                .insert([{
                    user_id: currentUserId,
                    media_url: data.publicUrl,
                    media_type: 'image',
                    caption: caption.trim() || null,
                }]);

            if (dbError) {
                Alert.alert('Error', dbError.message);
                return;
            }

            setCaption('');
            setSelectedUri(null);
            onAdded();

        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                onPress={pickImage}
                style={listStyles.storyItem}
                disabled={uploading}
            >
                <View style={[listStyles.ring, listStyles.addRing]}>
                    {uploading ? (
                        <ActivityIndicator color="#DA70D6" size="small" />
                    ) : (
                        <Text style={listStyles.plusText}>+</Text>
                    )}
                </View>
                <Text style={listStyles.userName} numberOfLines={1}>
                    My Status
                </Text>
            </TouchableOpacity>

            {/* Caption Modal */}
            <Modal
                visible={captionVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCaptionVisible(false)}
            >
                <View style={listStyles.captionModal}>
                    {selectedUri && (
                        <Image
                            source={{ uri: selectedUri }}
                            style={listStyles.captionPreview}
                            resizeMode="contain"
                        />
                    )}
                    <TextInput
                        style={listStyles.captionInput}
                        placeholder="Add a caption..."
                        placeholderTextColor="#aaa"
                        value={caption}
                        onChangeText={setCaption}
                    />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => setCaptionVisible(false)}
                            style={[listStyles.captionBtn, { backgroundColor: '#ccc' }]}
                        >
                            <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={uploadStory}
                            style={[listStyles.captionBtn, { backgroundColor: '#DA70D6' }]}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

// ─── MAIN STORY LIST ─────────────────────────────────────────
const StoryList = ({ currentUserId }: { currentUserId: string }) => {
    const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<UserStoryGroup | null>(null);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('stories')
                .select(`
                    *,
                    story_views(viewer_id)
                `)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Stories fetch error:', error);
                return;
            }

            // Fetch user info separately
            const userIds = [...new Set(data?.map((s: any) => s.user_id) || [])];

            const { data: users } = await supabase
                .from('user')
                .select('id, firstName, lastName, profileImage')
                .in('id', userIds);

            const userMap: any = {};
            users?.forEach((u: any) => {
                userMap[u.id] = u;
            });

            // Group by user
            const grouped: { [key: string]: UserStoryGroup } = {};

            data?.forEach((story: any) => {
                const uid = story.user_id;
                const user = userMap[uid];
                const isViewed = story.story_views?.some(
                    (v: any) => v.viewer_id === currentUserId
                );

                if (!grouped[uid]) {
                    grouped[uid] = {
                        user_id: uid,
                        user_name: user
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'Unknown',
                        avatar_url: user?.profileImage || null,
                        stories: [],
                        hasUnviewed: false,
                    };
                }

                grouped[uid].stories.push({
                    ...story,
                    isViewed,
                    views: story.story_views?.length || 0,
                });

                if (!isViewed && uid !== currentUserId) {
                    grouped[uid].hasUnviewed = true;
                }
            });

            // Put current user's stories first
            const groupArray = Object.values(grouped);
            const myIndex = groupArray.findIndex(g => g.user_id === currentUserId);
            if (myIndex > 0) {
                const [mine] = groupArray.splice(myIndex, 1);
                groupArray.unshift(mine);
            }

            setStoryGroups(groupArray);

        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={listStyles.loadingRow}>
                <ActivityIndicator size="small" color="#DA70D6" />
            </View>
        );
    }

    return (
        <View style={listStyles.container}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={storyGroups}
                keyExtractor={item => item.user_id}
                ListHeaderComponent={
                    <AddStoryButton
                        currentUserId={currentUserId}
                        onAdded={fetchStories}
                    />
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedGroup(item);
                            setViewerVisible(true);
                        }}
                        style={listStyles.storyItem}
                    >
                        <View style={[
                            listStyles.ring,
                            item.hasUnviewed
                                ? listStyles.ringUnviewed
                                : listStyles.ringViewed
                        ]}>
                            {item.avatar_url ? (
                                <Image
                                    source={{ uri: item.avatar_url }}
                                    style={listStyles.avatar}
                                />
                            ) : (
                                <View style={listStyles.avatarFallback}>
                                    <Text style={listStyles.avatarInitial}>
                                        {item.user_name?.charAt(0)?.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={listStyles.userName} numberOfLines={1}>
                            {item.user_id === currentUserId ? 'My Status' : item.user_name}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {selectedGroup && (
                <StoryViewer
                    visible={viewerVisible}
                    group={selectedGroup}
                    currentUserId={currentUserId}
                    onClose={() => {
                        setViewerVisible(false);
                        fetchStories();
                    }}
                />
            )}
        </View>
    );
};

export default StoryList;

// ─── STYLES ──────────────────────────────────────────────────
const listStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    loadingRow: {
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyItem: {
        alignItems: 'center',
        marginHorizontal: 8,
        width: 68,
    },
    ring: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 2,
        marginBottom: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringUnviewed: {
        borderWidth: 2.5,
        borderColor: '#DA70D6',
    },
    ringViewed: {
        borderWidth: 2.5,
        borderColor: '#ccc',
    },
    addRing: {
        borderWidth: 2,
        borderColor: '#DA70D6',
        borderStyle: 'dashed',
        backgroundColor: '#fdf0ff',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#DA70D6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    plusText: {
        fontSize: 30,
        color: '#DA70D6',
        lineHeight: 34,
    },
    userName: {
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
    },
    captionModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 50,
        gap: 16,
    },
    captionPreview: {
        width,
        height: height * 0.68,
    },
    captionInput: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: '#fff',
        width: '88%',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 15,
    },
    captionBtn: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 25,
    },
});

const viewerStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingTop: 52,
        gap: 4,
        zIndex: 10,
    },
    progressBg: {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 10,
    },
    avatarPlaceholder: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#DA70D6',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    headerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
    },
    headerName: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    headerTime: {
        color: '#ddd',
        fontSize: 12,
    },
    image: {
        width,
        height: height * 0.74,
    },
    captionOverlay: {
        position: 'absolute',
        bottom: 110,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    captionText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    viewsBox: {
        position: 'absolute',
        bottom: 55,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    viewsText: {
        color: '#fff',
        fontSize: 14,
    },
    tapAreas: {
        position: 'absolute',
        top: 110,
        left: 0,
        right: 0,
        bottom: 140,
        flexDirection: 'row',
    },
});