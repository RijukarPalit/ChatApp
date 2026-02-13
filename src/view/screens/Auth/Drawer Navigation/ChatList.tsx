import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  TextInput
} from 'react-native'
import React, { useEffect, useState } from 'react'
import supabase from '../../../../utils/supabase'
import Toast from 'react-native-toast-message'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { ImageName } from '../../../../asserts'
import LottieView from 'lottie-react-native';


type DrawerNav = DrawerNavigationProp<any>

// Define user type
interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  location?: string | null;
  city?: string | null;
  profileImage?: string | null;
  created_at: string;
}

// Define last message type
interface LastMessage {
  message_text: string;
  image_url?: string;
  created_at: string;
  sender_id: string;
  read: boolean;
  file_url?: string;
  file_name?: string;
  file_type?: string;
}

// Extended user with last message
interface UserWithMessage extends User {
  lastMessage?: LastMessage;
  unreadCount?: number;
}

const ChatList: React.FC = () => {
  const navigation = useNavigation<DrawerNav>()

  const [users, setUsers] = useState<UserWithMessage[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    initializeChatList()
  }, [])

  // Filter users when search query changes
  useEffect(() => {
    filterUsers()
  }, [searchQuery, users])

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = users.filter(user => {
      // Search by name
      const fullName = getDisplayName(user.firstName, user.lastName, user.email).toLowerCase()
      const nameMatch = fullName.includes(query)

      // Search by email
      const emailMatch = user.email.toLowerCase().includes(query)

      // Search by last message
      const messageMatch = user.lastMessage?.message_text.toLowerCase().includes(query) || false

      return nameMatch || emailMatch || messageMatch
    })

    setFilteredUsers(filtered)
  }

  const initializeChatList = async () => {
    const userId = await getCurrentUser()
    if (userId) {
      await fetchUsersWithMessages(userId)
      subscribeToNewMessages(userId)
    }
  }

  // Get current logged-in user
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      return user.id
    }
    return null
  }

  // Fetch all users with their last messages
  const fetchUsersWithMessages = async (userId: string) => {
    try {
      setLoading(true)

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('user')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load users',
          position: 'top',
        })
        return
      }

      // Fetch all messages involving current user
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
      }

      // Process users with last message and unread count
      const usersWithMessages: UserWithMessage[] = (usersData || []).map(user => {
        // Find all messages between current user and this user
        const conversationMessages = (messagesData || []).filter(msg =>
          (msg.sender_id === userId && msg.receiver_id === user.id) ||
          (msg.sender_id === user.id && msg.receiver_id === userId)
        )

        // Get the last message
        const lastMessage = conversationMessages[0] || null

        // Count unread messages from this user
        const unreadCount = conversationMessages.filter(msg =>
          msg.sender_id === user.id &&
          msg.receiver_id === userId &&
          msg.read === false
        ).length

        return {
          ...user,
          lastMessage: lastMessage || undefined,
          unreadCount
        }
      })

      // Sort users: those with messages first, sorted by last message time
      const sortedUsers = usersWithMessages.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      })

      setUsers(sortedUsers)
      setFilteredUsers(sortedUsers)
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Something went wrong',
        position: 'top',
      })
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to new messages
  const subscribeToNewMessages = (userId: string) => {
    const channel = supabase
      .channel('chat-list-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('Message update:', payload)
          // Refresh the list when any message is inserted/updated
          fetchUsersWithMessages(userId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const onRefresh = async () => {
    if (currentUserId) {
      setRefreshing(true)
      await fetchUsersWithMessages(currentUserId)
      setRefreshing(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
    if (firstName) return firstName[0].toUpperCase()
    if (lastName) return lastName[0].toUpperCase()
    if (email) return email[0].toUpperCase()
    return '?'
  }

  const getDisplayName = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) return `${firstName} ${lastName}`
    if (firstName) return firstName
    if (lastName) return lastName
    if (email) return email.split('@')[0]
    return 'Unknown User'
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Today
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
      return 'Yesterday'
    }

    // This week (show day name)
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    // Older (show date)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const handleUserPress = (user: UserWithMessage) => {
    navigation.navigate('ChatBox', {
      userId: user.id,
      userName: getDisplayName(user.firstName, user.lastName, user.email)
    });
  }

  const renderUserItem = ({ item }: { item: UserWithMessage }) => {
    const isCurrentUser = item.id === currentUserId
    const lastMessage = item.lastMessage
    const unreadCount = item.unreadCount || 0

    if (isCurrentUser) return null

    // Determine message type
    const hasImage = !!lastMessage?.image_url
    const hasFile = !!lastMessage?.file_url
    const hasText = !!lastMessage?.message_text?.trim()
    const isSentByMe = lastMessage?.sender_id === currentUserId


    // Determine what to display
    let displayText = ''
    let showImageIcon = false
    let showFilesIcon = false


    if (hasImage) {
      showImageIcon = true
      displayText = hasText ? lastMessage!.message_text : 'Photo'
    }
    else if (hasFile) {
      showFilesIcon = true
      displayText = lastMessage?.file_name || 'File'
    }
    else if (hasText) {
      displayText = lastMessage!.message_text
    }

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(item.firstName, item.lastName, item.email)}
              </Text>
            </View>
          )}
          {/* Online indicator - optional */}
          {/* <View style={styles.onlineIndicator} /> */}
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {/* Top Row: Name and Time */}
          <View style={styles.topRow}>
            <Text
              style={[
                styles.userName,
                unreadCount > 0 && styles.userNameUnread
              ]}
              numberOfLines={1}
            >
              {getDisplayName(item.firstName, item.lastName, item.email)}
            </Text>
            {lastMessage && (
              <Text style={[
                styles.timeText,
                unreadCount > 0 && styles.timeTextUnread
              ]}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>

          {/* Bottom Row: Last Message and Unread Badge */}
          <View style={styles.bottomRow}>
            {lastMessage ? (
              <View style={styles.lastMessageContainer}>
                {/* Show "You: " prefix if sent by current user */}
                {isSentByMe && (
                  <Text style={[
                    styles.youPrefix,
                    unreadCount > 0 && styles.lastMessageUnread
                  ]}>
                    You:
                  </Text>
                )}

                {/* Show camera icon for image messages */}
                {showImageIcon && (
                  <Text style={styles.imageIcon}>📷 </Text>
                )}

                {/* Show file icon for file messages */}
                {showFilesIcon && (
                  <Text style={styles.imageIcon}>📁 </Text>
                )}

                {/* Show message text */}
                <Text
                  style={[
                    styles.lastMessage,
                    unreadCount > 0 && styles.lastMessageUnread
                  ]}
                  numberOfLines={1}
                >
                  {displayText}
                </Text>
              </View>
            ) : (
              <Text style={styles.noMessages}>Tap to start chatting</Text>
            )}

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <ImageBackground
        //source={ImageName.Background}
        source={ImageName.ChatBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4950B8" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </ImageBackground>
    )
  }

  return (
    <ImageBackground
      // source={ImageName.Background}
      source={ImageName.ChatBg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.menuButton}
          >
            <Image
              source={ImageName.Menu}
              style={styles.menuIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            {/* <Text style={styles.searchIcon}>🔍</Text> */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Chat List */}
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4950B8']}
              tintColor="#4950B8"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          // ListEmptyComponent={
          //   <View style={styles.emptyContainer}>
          //     <Text style={styles.emptyIcon}>💬</Text>
          //     <Text style={styles.emptyText}>
          //       {searchQuery ? 'No results found' : 'No chats yet'}
          //     </Text>
          //     <Text style={styles.emptySubtext}>
          //       {searchQuery ? 'Try a different search term' : 'Start a conversation with someone'}
          //     </Text>
          //   </View>
          // }

          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery ? (
                <>
                  {/* REPLACE WITH YOUR LOTTIE FILE PATH */}
                  <LottieView
                    // source={require('../../../../assets/no-user-found.json')}
                    source={require('../../../../asserts/images/no-user-found.json')}
                    autoPlay
                    loop
                    style={{ width: 200, height: 200 }}
                  />
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>
                    We couldn't find anyone matching "{searchQuery}"
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyText}>No chats yet</Text>
                  <Text style={styles.emptySubtext}>Start a conversation with someone</Text>
                </>
              )}
            </View>
          }
        />
      </View>
    </ImageBackground>
  )
}

export default ChatList

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#4950B8',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 26,
    height: 26,
    tintColor: '#fff',
  },
  searchContainer: {
    backgroundColor: '#4950B8',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
    fontWeight: '300',
  },
  listContainer: {
    paddingBottom: 8,
  },
  userCard: {
    flexDirection: 'row',
    // backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5E5',
    marginLeft: 76,
  },
  avatarContainer: {
    marginRight: 14,
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4950B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '400',
  },
  timeTextUnread: {
    color: '#4950B8',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  youPrefix: {
    fontSize: 15,
    color: '#666',
    fontWeight: '400',
  },
  imageIcon: {
    fontSize: 15,
    color: '#666',
  },
  lastMessage: {
    fontSize: 15,
    color: '#666',
    flex: 1,
    fontWeight: '400',
  },
  lastMessageUnread: {
    color: '#000',
    fontWeight: '600',
  },
  noMessages: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#4950B8',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
})