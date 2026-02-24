
// import {
//   StyleSheet,
//   Text,
//   View,
//   FlatList,
//   Image,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   ImageBackground,
//   TextInput,
//   StatusBar,
//   Platform,
//   Keyboard
// } from 'react-native'
// import React, { useEffect, useState } from 'react'
// import supabase from '../../../../utils/supabase'
// import Toast from 'react-native-toast-message'
// import { DrawerNavigationProp } from '@react-navigation/drawer'
// import { useNavigation } from '@react-navigation/native'
// import { ImageName } from '../../../../asserts'
// import LottieView from 'lottie-react-native';
// import { hp } from '../../../../utils/dimention'

// type DrawerNav = DrawerNavigationProp<any>

// // Define user type
// interface User {
//   id: string;
//   firstName?: string | null;
//   lastName?: string | null;
//   email: string;
//   location?: string | null;
//   city?: string | null;
//   profileImage?: string | null;
//   created_at: string;
// }

// // Define last message type
// interface LastMessage {
//   message_text: string;
//   image_url?: string;
//   created_at: string;
//   sender_id: string;
//   read: boolean;
//   file_url?: string;
//   file_name?: string;
//   file_type?: string;
// }

// // Extended user with last message
// interface UserWithMessage extends User {
//   lastMessage?: LastMessage;
//   unreadCount?: number;
// }

// const ChatList: React.FC = () => {
//   const navigation = useNavigation<DrawerNav>()

//   const [users, setUsers] = useState<UserWithMessage[]>([])
//   const [filteredUsers, setFilteredUsers] = useState<UserWithMessage[]>([])
//   const [loading, setLoading] = useState(true)
//   const [refreshing, setRefreshing] = useState(false)
//   const [currentUserId, setCurrentUserId] = useState<string | null>(null)
//   const [searchQuery, setSearchQuery] = useState('')
//   const [showMenu, setShowMenu] = useState(false);
//   const [showAllUsers, setShowAllUsers] = useState(false)


//   useEffect(() => {
//     initializeChatList()
//   }, [])

//   // Filter users when search query changes
//   useEffect(() => {
//     filterUsers()
//   }, [searchQuery, users])

//   useEffect(() => {
//     if (!users.length) return

//     const baseUsers = showAllUsers
//       ? users
//       : users.filter(user => user.lastMessage)

//     setFilteredUsers(baseUsers)
//   }, [showAllUsers, users])


//   const filterUsers = () => {
//     // if (!searchQuery.trim()) {
//     //   setFilteredUsers(users)
//     //   return
//     // }

//     if (!searchQuery.trim()) {
//       const baseUsers = showAllUsers
//         ? users
//         : users.filter(user => user.lastMessage)

//       setFilteredUsers(baseUsers)
//       return
//     }


//     const query = searchQuery.toLowerCase()
//     const filtered = users.filter(user => {
//       // Search by name
//       const fullName = getDisplayName(user.firstName, user.lastName, user.email).toLowerCase()
//       const nameMatch = fullName.includes(query)

//       // Search by email
//       const emailMatch = user.email.toLowerCase().includes(query)

//       // Search by last message
//       const messageMatch = user.lastMessage?.message_text.toLowerCase().includes(query) || false

//       return nameMatch || emailMatch || messageMatch
//     })

//     setFilteredUsers(filtered)
//   }

//   const initializeChatList = async () => {
//     const userId = await getCurrentUser()
//     if (userId) {
//       await fetchUsersWithMessages(userId)
//       subscribeToNewMessages(userId)
//     }
//   }

//   // Get current logged-in user
//   const getCurrentUser = async () => {
//     const { data: { user } } = await supabase.auth.getUser()
//     if (user) {
//       setCurrentUserId(user.id)
//       return user.id
//     }
//     return null
//   }

//   // Fetch all users with their last messages
//   const fetchUsersWithMessages = async (userId: string) => {
//     try {
//       setLoading(true)

//       // Fetch all users
//       const { data: usersData, error: usersError } = await supabase
//         .from('user')
//         .select('*')
//         .order('created_at', { ascending: false })

//       if (usersError) {
//         Toast.show({
//           type: 'error',
//           text1: 'Error',
//           text2: 'Failed to load users',
//           position: 'top',
//         })
//         return
//       }

//       // Fetch all messages involving current user
//       const { data: messagesData, error: messagesError } = await supabase
//         .from('messages')
//         .select('*')
//         .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
//         .order('created_at', { ascending: false })

//       if (messagesError) {
//         console.error('Error fetching messages:', messagesError)
//       }

//       // Process users with last message and unread count
//       const usersWithMessages: UserWithMessage[] = (usersData || []).map(user => {
//         // Find all messages between current user and this user
//         const conversationMessages = (messagesData || []).filter(msg =>
//           (msg.sender_id === userId && msg.receiver_id === user.id) ||
//           (msg.sender_id === user.id && msg.receiver_id === userId)
//         )

//         // Get the last message
//         const lastMessage = conversationMessages[0] || null

//         // Count unread messages from this user
//         const unreadCount = conversationMessages.filter(msg =>
//           msg.sender_id === user.id &&
//           msg.receiver_id === userId &&
//           msg.read === false
//         ).length

//         return {
//           ...user,
//           lastMessage: lastMessage || undefined,
//           unreadCount
//         }
//       })

//       // Sort users: those with messages first, sorted by last message time
//       const sortedUsers = usersWithMessages.sort((a, b) => {
//         if (!a.lastMessage && !b.lastMessage) return 0
//         if (!a.lastMessage) return 1
//         if (!b.lastMessage) return -1
//         return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
//       })

//       // setUsers(sortedUsers)
//       // setFilteredUsers(sortedUsers)

//       // Show only users who have chatted (have lastMessage)
//       setUsers(sortedUsers)
//     } catch (err: any) {
//       Toast.show({
//         type: 'error',
//         text1: 'Error',
//         text2: err.message || 'Something went wrong',
//         position: 'top',
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Subscribe to new messages
//   const subscribeToNewMessages = (userId: string) => {
//     const channel = supabase
//       .channel('chat-list-messages')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'messages',
//         },
//         (payload) => {
//           console.log('Message update:', payload)
//           // Refresh the list when any message is inserted/updated
//           fetchUsersWithMessages(userId)
//         }
//       )
//       .subscribe()

//     return () => {
//       supabase.removeChannel(channel)
//     }
//   }

//   const onRefresh = async () => {
//     if (currentUserId) {
//       setRefreshing(true)
//       await fetchUsersWithMessages(currentUserId)
//       setRefreshing(false)
//     }
//   }

//   const clearSearch = () => {
//     setSearchQuery('')
//     Keyboard.dismiss()
//   }

//   const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
//     if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
//     if (firstName) return firstName[0].toUpperCase()
//     if (lastName) return lastName[0].toUpperCase()
//     if (email) return email[0].toUpperCase()
//     return '?'
//   }

//   const getDisplayName = (firstName?: string | null, lastName?: string | null, email?: string) => {
//     if (firstName && lastName) return `${firstName} ${lastName}`
//     if (firstName) return firstName
//     if (lastName) return lastName
//     if (email) return email.split('@')[0]
//     return 'Unknown User'
//   }

//   const formatTime = (timestamp: string) => {
//     const date = new Date(timestamp)
//     const now = new Date()
//     const diffMs = now.getTime() - date.getTime()
//     const diffDays = Math.floor(diffMs / 86400000)

//     // Today
//     if (diffDays === 0 && date.getDate() === now.getDate()) {
//       return date.toLocaleTimeString('en-US', {
//         hour: 'numeric',
//         minute: '2-digit',
//         hour12: true
//       })
//     }

//     // Yesterday
//     const yesterday = new Date(now)
//     yesterday.setDate(yesterday.getDate() - 1)
//     if (date.getDate() === yesterday.getDate()) {
//       return 'Yesterday'
//     }

//     // This week (show day name)
//     if (diffDays < 7) {
//       return date.toLocaleDateString('en-US', { weekday: 'short' })
//     }

//     // Older (show date)
//     return date.toLocaleDateString('en-US', {
//       month: 'short',
//       day: 'numeric'
//     })
//   }

//   const handleUserPress = (user: UserWithMessage) => {
//     navigation.navigate('ChatBox', {
//       userId: user.id,
//       userName: getDisplayName(user.firstName, user.lastName, user.email)
//     });
//   }

//   const handleFabPress = () => {
//     // Navigate to a "New Chat" screen or open a contact list
//     console.log('FAB Pressed - Open new chat');
//     // Example: navigation.navigate('AllContacts');
//     Toast.show({
//       type: 'info',
//       text1: 'New Chat',
//       text2: 'Select a contact to start chatting',
//     });
//   }

//   const renderUserItem = ({ item }: { item: UserWithMessage }) => {
//     const isCurrentUser = item.id === currentUserId
//     const lastMessage = item.lastMessage
//     const unreadCount = item.unreadCount || 0

//     if (isCurrentUser) return null

//     // Determine message type
//     const hasImage = !!lastMessage?.image_url
//     const hasFile = !!lastMessage?.file_url
//     const hasText = !!lastMessage?.message_text?.trim()
//     const isSentByMe = lastMessage?.sender_id === currentUserId

//     // Determine what to display
//     let displayText = ''
//     let showImageIcon = false
//     let showFilesIcon = false


//     if (hasImage) {
//       showImageIcon = true
//       displayText = hasText ? lastMessage!.message_text : 'Photo'
//     }
//     else if (hasFile) {
//       showFilesIcon = true
//       displayText = lastMessage?.file_name || 'File'
//     }
//     else if (hasText) {
//       displayText = lastMessage!.message_text
//     }

//     return (
//       <TouchableOpacity
//         style={styles.userCard}
//         onPress={() => handleUserPress(item)}
//         activeOpacity={0.7}
//       >
//         {/* Avatar */}
//         <View style={styles.avatarContainer}>
//           {item.profileImage ? (
//             <Image
//               source={{ uri: item.profileImage }}
//               style={styles.avatarImage}
//             />
//           ) : (
//             <View style={[styles.avatar, styles.defaultAvatar]}>
//               <Text style={styles.avatarText}>
//                 {getInitials(item.firstName, item.lastName, item.email)}
//               </Text>
//             </View>
//           )}
//         </View>


//         {/* Content */}
//         <View style={styles.contentWrapper}>
//           <View style={styles.rowTop}>
//             <Text
//               style={[
//                 styles.userName,
//                 unreadCount > 0 ? styles.userNameBold : null
//               ]}
//               numberOfLines={1}
//             >
//               {getDisplayName(item.firstName, item.lastName, item.email)}
//             </Text>
//             {lastMessage && (
//               <Text style={[
//                 styles.timeText,
//                 unreadCount > 0 && styles.timeTextHighlight
//               ]}>
//                 {formatTime(lastMessage.created_at)}
//               </Text>
//             )}
//           </View>

//           <View style={styles.rowBottom}>
//             <View style={styles.messagePreviewContainer}>
//               {lastMessage ? (
//                 <>
//                   {isSentByMe && <Text style={styles.prefixText}>You: </Text>}
//                   {showImageIcon && <Text style={styles.iconText}>📷 </Text>}
//                   {showFilesIcon && <Text style={styles.iconText}>📎 </Text>}
//                   <Text
//                     style={[
//                       styles.lastMessage,
//                       unreadCount > 0 ? styles.lastMessageBold : null
//                     ]}
//                     numberOfLines={1}
//                   >
//                     {displayText}
//                   </Text>
//                 </>
//               ) : (
//                 <Text style={styles.emptyMessageText}>Tap to start chatting</Text>
//               )}
//             </View>

//             {unreadCount > 0 && (
//               <View style={styles.badgeContainer}>
//                 <Text style={styles.badgeText}>
//                   {unreadCount > 99 ? '99+' : unreadCount}
//                 </Text>
//               </View>
//             )}
//           </View>


//         </View>
//       </TouchableOpacity>
//     )
//   }

//   if (loading) {
//     return (
//       <ImageBackground
//         source={ImageName.ChatBg}
//         style={styles.backgroundImage}
//         resizeMode="cover"
//       >
//         <View style={styles.loadingOverlay}>
//           <ActivityIndicator size="large" color="#4950B8" />
//           <Text style={styles.loadingText}>Loading conversations...</Text>
//         </View>
//       </ImageBackground>
//     )
//   }

//   return (
//     <View style={styles.mainContainer}>
//       <StatusBar barStyle="light-content" backgroundColor="#4950B8" />

//       {/* Background with Header */}
//       <ImageBackground
//         source={ImageName.ChatBg}
//         style={styles.backgroundImage}
//         resizeMode="cover"
//       >
//         <View style={styles.headerContainer}>
//           <View style={styles.topBar}>
//             <Text style={styles.headerTitle}>Messages</Text>
//             <TouchableOpacity
//               onPress={() => navigation.openDrawer()}
//               style={styles.menuButton}
//             >
//               <Image source={ImageName.Menu} style={styles.menuIcon} />
//             </TouchableOpacity>
//           </View>

//           {/* Search Bar Embedded in Header */}
//           <View style={styles.searchSection}>
//             <View style={styles.searchFieldContainer}>
//               {/* <Text style={styles.searchIcon}>🔍</Text> */}
//               <TextInput
//                 style={styles.input}
//                 placeholder="Search messages..."
//                 placeholderTextColor="#8E8E93"
//                 value={searchQuery}
//                 onChangeText={setSearchQuery}
//                 returnKeyType="search"
//               />
//               {searchQuery.length > 0 && (
//                 <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
//                   <View style={styles.clearCircle}>
//                     <Text style={styles.clearX}>✕</Text>
//                   </View>
//                 </TouchableOpacity>

//               )}
//             </View>
//           </View>

//         </View>

//         {/* Content List - Styled as a Sheet */}
//         <View style={styles.listSheet}>
//           <FlatList
//             data={filteredUsers}
//             renderItem={renderUserItem}
//             keyExtractor={(item) => item.id}
//             refreshControl={
//               <RefreshControl
//                 refreshing={refreshing}
//                 onRefresh={onRefresh}
//                 colors={['#4950B8']}
//                 tintColor="#4950B8"
//               />
//             }
//             contentContainerStyle={styles.listContent}
//             showsVerticalScrollIndicator={false}
//             ItemSeparatorComponent={() => <View style={styles.separator} />}
//             ListEmptyComponent={
//               <View style={styles.emptyStateContainer}>
//                 {searchQuery ? (
//                   <>
//                     <LottieView
//                       source={require('../../../../asserts/images/no-user-found.json')}
//                       autoPlay
//                       loop
//                       style={styles.lottie}
//                     />
//                     <Text style={styles.emptyTitle}>No results found</Text>
//                     <Text style={styles.emptyDescription}>
//                       We couldn't find any matches for "{searchQuery}"
//                     </Text>
//                   </>
//                 ) : (
//                   <>
//                     {/* <View style={styles.emptyIconCircle}>
//                       <Text style={styles.emptyIconEmoji}>💬</Text>
//                     </View>
//                     <Text style={styles.emptyTitle}>No chats yet</Text>
//                     <Text style={styles.emptyDescription}>Start a new conversation to see it here</Text> */}
//                     {/* <LottieView
//                       source={require('../../../../asserts/images/NoChats.json')}
//                       autoPlay
//                       loop
//                       style={styles.lottie2}
//                     />
//                     <Text style={styles.emptyTitle}>No chats yet</Text>
//                     <Text style={styles.emptyDescription}>
//                       Start a new conversation to see it here
//                     </Text> */}

//                     <View style={styles.emptyContainer}>
//                       <LottieView
//                         source={require('../../../../asserts/images/NoChats.json')}
//                         autoPlay
//                         loop
//                         style={styles.lottie2}
//                       />
//                       <Text style={styles.emptyTitle}>No chats yet</Text>
//                       <Text style={styles.emptyDescription}>
//                         Start a new conversation to see it here
//                       </Text>
//                     </View>

//                   </>
//                 )}
//               </View>
//             }
//           />
//         </View>

//         {/* Floating Action Button (FAB) */}
//         <TouchableOpacity
//           style={styles.fab}
//           onPress={() => {
//             setShowAllUsers(prev => !prev)
//           }}
//           activeOpacity={0.8}
//         >
//           <Text style={styles.fabIcon}>
//             {showAllUsers ? '×' : '+'}
//           </Text>
//         </TouchableOpacity>


//       </ImageBackground>
//     </View>
//   )
// }

// export default ChatList

// const styles = StyleSheet.create({
//   mainContainer: {
//     flex: 1,
//     backgroundColor: '#F2F2F7', // iOS system gray
//   },
//   backgroundImage: {
//     flex: 1,
//     width: '100%',
//   },
//   // Header Styles
//   headerContainer: {
//     backgroundColor: '#4950B8',
//     paddingTop: Platform.OS === 'ios' ? 50 : 40,
//     paddingBottom: 24,
//     paddingHorizontal: 20,
//     borderBottomLeftRadius: 0,
//     borderBottomRightRadius: 0,
//   },
//   topBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   headerTitle: {
//     fontSize: 30,
//     fontWeight: '800',
//     color: '#FFFFFF',
//     letterSpacing: 0.3,
//   },
//   menuButton: {
//     padding: 8,
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     borderRadius: 12,
//   },
//   menuIcon: {
//     width: 22,
//     height: 22,
//     tintColor: '#FFFFFF',
//   },

//   // Search Styles
//   searchSection: {
//     marginTop: 4,
//   },
//   searchFieldContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     height: 48,
//     paddingHorizontal: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   searchIcon: {
//     fontSize: 18,
//     marginRight: 10,
//     opacity: 0.5,
//   },
//   input: {
//     flex: 1,
//     fontSize: 16,
//     color: '#1C1C1E',
//     height: '100%',
//   },
//   clearCircle: {
//     backgroundColor: '#E5E5EA',
//     borderRadius: 10,
//     width: 20,
//     height: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   clearX: {
//     fontSize: 12,
//     color: '#8E8E93',
//     fontWeight: 'bold',
//   },

//   // List Container Styles (Sheet Look)
//   listSheet: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     marginTop: -16, // Pull up over the header slightly
//     overflow: 'hidden',
//   },
//   listContent: {
//     paddingTop: 12,
//     paddingBottom: 40,
//   },
//   separator: {
//     height: 1,
//     backgroundColor: '#F2F2F7',
//     marginLeft: 84, // Align with text start
//     marginRight: 0,
//   },

//   // User Card Styles
//   userCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//     backgroundColor: '#FFFFFF',
//     //backgroundColor: '#E5E5EA',
//     borderRadius: 30,
//     // marginHorizontal: 10,
//   },
//   avatarContainer: {
//     position: 'relative',
//     marginRight: 16,
//   },
//   avatarImage: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     borderWidth: 1,
//     borderColor: '#EFEFEF',
//   },
//   avatar: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   defaultAvatar: {
//     backgroundColor: '#E0E7FF', // Lighter purple shade
//   },
//   avatarText: {
//     color: '#4950B8',
//     fontSize: 22,
//     fontWeight: '700',
//   },

//   // Content Styles
//   contentWrapper: {
//     flex: 1,
//     justifyContent: 'center',
//   },
//   rowTop: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   userName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1C1C1E',
//     flex: 1,
//     marginRight: 10,
//   },
//   userNameBold: {
//     fontWeight: '800',
//     color: '#000',
//   },
//   timeText: {
//     fontSize: 12,
//     color: '#8E8E93',
//     fontWeight: '500',
//   },
//   timeTextHighlight: {
//     color: '#4950B8',
//     fontWeight: '700',
//   },
//   rowBottom: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   messagePreviewContainer: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   prefixText: {
//     fontSize: 14,
//     color: '#4950B8',
//     fontWeight: '500',
//   },
//   iconText: {
//     fontSize: 12,
//     color: '#8E8E93',
//   },
//   lastMessage: {
//     fontSize: 14,
//     color: '#8E8E93',
//     flex: 1,
//     lineHeight: 20,
//   },
//   lastMessageBold: {
//     color: '#1C1C1E',
//     fontWeight: '600',
//   },
//   emptyMessageText: {
//     fontSize: 14,
//     color: '#AEAEB2',
//     fontStyle: 'italic',
//   },

//   // Badge Styles
//   badgeContainer: {
//     backgroundColor: '#4950B8',
//     minWidth: 22,
//     height: 22,
//     borderRadius: 11,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 6,
//   },
//   badgeText: {
//     color: '#FFFFFF',
//     fontSize: 11,
//     fontWeight: '800',
//   },

//   // Loading & Empty States
//   loadingOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(255,255,255,0.8)',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#4950B8',
//     fontWeight: '600',
//   },
//   emptyStateContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingTop: 60,
//     paddingHorizontal: 40,
//   },
//   lottie: {
//     width: 200,
//     height: 200,
//   },
//   lottie2: {
//     width: 200,
//     height: 200,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   emptyIconCircle: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: '#F2F2F7',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   emptyIconEmoji: {
//     fontSize: 32,
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#1C1C1E',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   emptyDescription: {
//     fontSize: 15,
//     color: '#8E8E93',
//     textAlign: 'center',
//     lineHeight: 22,
//   },

//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 30,
//     marginTop: hp(20),
//   },


//   // Floating Action Button (FAB)
//   fab: {
//     position: 'absolute',
//     bottom: 30,
//     right: 25,
//     width: 65,
//     height: 65,
//     borderRadius: 35,
//     backgroundColor: '#4950B8',
//     justifyContent: 'center',
//     alignItems: 'center',
//     // Shadow for depth
//     shadowColor: '#4950B8',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.4,
//     shadowRadius: 6,
//     elevation: 8,
//     borderWidth: 6,
//     borderColor: 'rgba(73, 80, 184, 0.2)', // Semi-transparent blue ring
//   },
//   fabIcon: {
//     fontSize: 32,
//     color: '#FFFFFF',
//     fontWeight: '300',
//     marginTop: -2, // Optical adjustment
//     marginLeft: 1,
//   },
// })



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
  TextInput,
  StatusBar,
  Platform,
  Keyboard
} from 'react-native'
import React, { useEffect, useState } from 'react'
import supabase from '../../../../utils/supabase'
import Toast from 'react-native-toast-message'
import { DrawerNavigationProp } from '@react-navigation/drawer'
import { useNavigation } from '@react-navigation/native'
import { ImageName } from '../../../../asserts'
import LottieView from 'lottie-react-native';
import { hp } from '../../../../utils/dimention'

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
  const [showMenu, setShowMenu] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false)

  // Group creation states
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')


  useEffect(() => {
    initializeChatList()
  }, [])

  // Filter users when search query changes
  useEffect(() => {
    filterUsers()
  }, [searchQuery, users])

  useEffect(() => {
    if (!users.length) return

    const baseUsers = showAllUsers
      ? users
      : users.filter(user => user.lastMessage)

    setFilteredUsers(baseUsers)
  }, [showAllUsers, users])


  const filterUsers = () => {
    // if (!searchQuery.trim()) {
    //   setFilteredUsers(users)
    //   return
    // }

    if (!searchQuery.trim()) {
      const baseUsers = showAllUsers
        ? users
        : users.filter(user => user.lastMessage)

      setFilteredUsers(baseUsers)
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

      // setUsers(sortedUsers)
      // setFilteredUsers(sortedUsers)

      // Show only users who have chatted (have lastMessage)
      setUsers(sortedUsers)
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



  // for create group

  const createGroup = async (
    groupName: string,
    selectedUserIds: string[]
  ) => {
    if (!currentUserId) return null // Return null if fails

    try {
      // 1️⃣ Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: groupName,
          is_group: true,
          created_by: currentUserId,
        })
        .select()
        .single()

      if (convError) throw convError

      // 2️⃣ Add participants
      const participants = [
        ...selectedUserIds,
        currentUserId
      ].map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }))

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants)

      if (partError) throw partError

      Toast.show({
        type: 'success',
        text1: 'Group Created',
        text2: `${groupName} created successfully`,
      })

      // NEW: Return the conversation so we can navigate to it
      return conversation;

    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message,
      })
      return null;
    }
  }


  // const handleCreateGroupSubmit = async () => {
  //   // 1. Validations
  //   if (!groupName.trim()) {
  //     Toast.show({ type: 'error', text1: 'Wait!', text2: 'Please enter a group name' })
  //     return
  //   }
  //   if (selectedUserIds.length < 2) {
  //     Toast.show({ type: 'error', text1: 'Wait!', text2: 'Select at least 2 other members' })
  //     return
  //   }

  //   // 2. Call createGroup and capture the new group data
  //   const newGroup = await createGroup(groupName, selectedUserIds)

  //   // 3. If successful, reset UI and navigate!
  //   if (newGroup) {
  //     setIsCreatingGroup(false)
  //     setSelectedUserIds([])
  //     setGroupName('')
  //     setShowAllUsers(false)

  //     // Navigate to your ChatBox! 
  //     // Note: Make sure your ChatBox knows how to handle a group ID vs a user ID
  //     navigation.navigate('ChatBox', {
  //       userId: newGroup.id, // Passing the conversation/group ID here
  //       userName: newGroup.name, // Passing the custom Group Name
  //       isGroup: true // Optional flag in case ChatBox needs to know it's a group
  //     });
  //   }
  // }
  // Fetch conversations where user is participant
  const fetchConversations = async () => {
    if (!currentUserId) return

    const { data } = await supabase
      .from('conversation_participants')
      .select(`
      conversation_id,
      conversations (
        id,
        name,
        is_group,
        created_at
      )
    `)
      .eq('user_id', currentUserId)

    console.log(data)
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
    Keyboard.dismiss()
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
    const diffDays = Math.floor(diffMs / 86400000)

    // Today
    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate()) {
      return 'Yesterday'
    }

    // This week (show day name)
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    // Older (show date)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // const handleUserPress = (user: UserWithMessage) => {
  //   navigation.navigate('ChatBox', {
  //     userId: user.id,
  //     userName: getDisplayName(user.firstName, user.lastName, user.email)
  //   });
  // }

  const handleUserPress = (user: UserWithMessage) => {
    if (isCreatingGroup) {
      // Toggle selection for group
      setSelectedUserIds(prev =>
        prev.includes(user.id)
          ? prev.filter(id => id !== user.id) // Deselect
          : [...prev, user.id]                // Select
      )
    } else {
      // Normal 1-on-1 chat behavior
      navigation.navigate('ChatBox', {
        userId: user.id,
        userName: getDisplayName(user.firstName, user.lastName, user.email)
      });
    }
  }

  const handleCreateGroupSubmit = async () => {
    // 1. Validations
    if (!groupName.trim()) {
      Toast.show({ type: 'error', text1: 'Wait!', text2: 'Please enter a group name' })
      console.log('errorrr >>>>>>>>>' + groupName)
      return
    }
    if (selectedUserIds.length < 2) {
      Toast.show({ type: 'error', text1: 'Wait!', text2: 'Select at least 2 other members' })
      return
    }

    // 2. Call createGroup and capture the new group data
    const newGroup = await createGroup(groupName, selectedUserIds)

    // 3. If successful, reset UI and navigate!
    if (newGroup) {
      setIsCreatingGroup(false)
      setSelectedUserIds([])
      setGroupName('')
      setShowAllUsers(false)

      // Navigate to your ChatBox! 
      // Note: Make sure your ChatBox knows how to handle a group ID vs a user ID
      navigation.navigate('ChatBox', {
        userId: newGroup.id, // Passing the conversation/group ID here
        userName: newGroup.name, // Passing the custom Group Name
        isGroup: true // Optional flag in case ChatBox needs to know it's a group
      });
    }
  }

  const handleFabPress = () => {
    // Navigate to a "New Chat" screen or open a contact list
    console.log('FAB Pressed - Open new chat');
    // Example: navigation.navigate('AllContacts');
    Toast.show({
      type: 'info',
      text1: 'New Chat',
      text2: 'Select a contact to start chatting',
    });
  }

  const renderListHeader = () => {
    if (!showAllUsers) return null;

    if (isCreatingGroup) {
      return (
        <View style={styles.createGroupHeader}>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Enter Group Name..."
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#8E8E93"
            autoFocus
          />
          <Text style={styles.selectedCountText}>
            {selectedUserIds.length} members selected
          </Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.createGroupButton}
        onPress={() => setIsCreatingGroup(true)}
      >
        <View style={styles.createGroupIconCircle}>
          <Text style={styles.createGroupIconEmoji}>👥</Text>
        </View>
        <Text style={styles.createGroupTitle}>Create New Group</Text>
      </TouchableOpacity>
    );
  }

  const renderUserItem = ({ item }: { item: UserWithMessage }) => {
    const isCurrentUser = item.id === currentUserId
    const lastMessage = item.lastMessage
    const unreadCount = item.unreadCount || 0
    const isSelected = selectedUserIds.includes(item.id) // Check if user is selected

    if (isCurrentUser) return null

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
        style={[styles.userCard, isSelected && styles.userCardSelected]} // Highlight if selected
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {/* Checkbox for Group Creation */}
        {isCreatingGroup && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {getInitials(item.firstName, item.lastName, item.email)}
              </Text>
            </View>
          )}
        </View>


        {/* Content */}
        <View style={styles.contentWrapper}>
          <View style={styles.rowTop}>
            <Text
              style={[
                styles.userName,
                unreadCount > 0 ? styles.userNameBold : null
              ]}
              numberOfLines={1}
            >
              {getDisplayName(item.firstName, item.lastName, item.email)}
            </Text>
            {lastMessage && (
              <Text style={[
                styles.timeText,
                unreadCount > 0 && styles.timeTextHighlight
              ]}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>

          <View style={styles.rowBottom}>
            <View style={styles.messagePreviewContainer}>
              {lastMessage ? (
                <>
                  {isSentByMe && <Text style={styles.prefixText}>You: </Text>}
                  {showImageIcon && <Text style={styles.iconText}>📷 </Text>}
                  {showFilesIcon && <Text style={styles.iconText}>📎 </Text>}
                  <Text
                    style={[
                      styles.lastMessage,
                      unreadCount > 0 ? styles.lastMessageBold : null
                    ]}
                    numberOfLines={1}
                  >
                    {displayText}
                  </Text>
                </>
              ) : (
                <Text style={styles.emptyMessageText}>Tap to start chatting</Text>
              )}
            </View>

            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
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
        source={ImageName.ChatBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4950B8" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </ImageBackground>
    )
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4950B8" />

      {/* Background with Header */}
      <ImageBackground
        source={ImageName.ChatBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.headerContainer}>
          <View style={styles.topBar}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity
              onPress={() => navigation.openDrawer()}
              style={styles.menuButton}
            >
              <Image source={ImageName.Menu} style={styles.menuIcon} />
            </TouchableOpacity>
          </View>

          {/* Search Bar Embedded in Header */}
          <View style={styles.searchSection}>
            <View style={styles.searchFieldContainer}>
              {/* <Text style={styles.searchIcon}>🔍</Text> */}
              <TextInput
                style={styles.input}
                placeholder="Search messages..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View style={styles.clearCircle}>
                    <Text style={styles.clearX}>✕</Text>
                  </View>
                </TouchableOpacity>

              )}
            </View>
          </View>

        </View>

        {/* Content List - Styled as a Sheet */}
        <View style={styles.listSheet}>
          <FlatList
            data={filteredUsers}
            ListHeaderComponent={renderListHeader}
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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                {searchQuery ? (
                  <>
                    <LottieView
                      source={require('../../../../asserts/images/no-user-found.json')}
                      autoPlay
                      loop
                      style={styles.lottie}
                    />
                    <Text style={styles.emptyTitle}>No results found</Text>
                    <Text style={styles.emptyDescription}>
                      We couldn't find any matches for "{searchQuery}"
                    </Text>
                  </>
                ) : (
                  <>
                    {/* <View style={styles.emptyIconCircle}>
                      <Text style={styles.emptyIconEmoji}>💬</Text>
                    </View>
                    <Text style={styles.emptyTitle}>No chats yet</Text>
                    <Text style={styles.emptyDescription}>Start a new conversation to see it here</Text> */}
                    {/* <LottieView
                      source={require('../../../../asserts/images/NoChats.json')}
                      autoPlay
                      loop
                      style={styles.lottie2}
                    />
                    <Text style={styles.emptyTitle}>No chats yet</Text>
                    <Text style={styles.emptyDescription}>
                      Start a new conversation to see it here
                    </Text> */}

                    <View style={styles.emptyContainer}>
                      <LottieView
                        source={require('../../../../asserts/images/NoChats.json')}
                        autoPlay
                        loop
                        style={styles.lottie2}
                      />
                      <Text style={styles.emptyTitle}>No chats yet</Text>
                      <Text style={styles.emptyDescription}>
                        Start a new conversation to see it here
                      </Text>
                    </View>

                  </>
                )}
              </View>
            }
          />
        </View>

        {/* Floating Action Button (FAB) */}
        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          style={[styles.fab, isCreatingGroup && styles.fabCreateMode]}
          onPress={() => {
            if (isCreatingGroup) {
              //THIS IS THE PART THAT CREATES THE GROUP AND OPENS THE CHAT BOX!
              handleCreateGroupSubmit()
            } else {
              // Toggle normal view
              setShowAllUsers(prev => !prev)
              setIsCreatingGroup(false) // Reset if toggling off
              setSelectedUserIds([])
              setGroupName('')
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>
            {isCreatingGroup ? '✓' : (showAllUsers ? '×' : '+')}
          </Text>
        </TouchableOpacity>


      </ImageBackground>
    </View>
  )
}

export default ChatList

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS system gray
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  // Header Styles
  headerContainer: {
    backgroundColor: '#4950B8',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  menuButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  menuIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },

  // Search Styles
  searchSection: {
    marginTop: 4,
  },
  searchFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    height: '100%',
  },
  clearCircle: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearX: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: 'bold',
  },

  // List Container Styles (Sheet Look)
  listSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16, // Pull up over the header slightly
    overflow: 'hidden',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginLeft: 84, // Align with text start
    marginRight: 0,
  },

  // --- New Group Creation Styles ---
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  createGroupIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createGroupIconEmoji: {
    fontSize: 24,
  },
  createGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4950B8',
  },
  createGroupHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: '#FAFAFA',
  },
  groupNameInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  selectedCountText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4950B8',
    borderColor: '#4950B8',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userCardSelected: {
    backgroundColor: '#F0F0F8', // Light highlight when selected
  },
  fabCreateMode: {
    backgroundColor: '#34C759', // Green for success/confirm
    shadowColor: '#34C759',
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },

  // User Card Styles
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    //backgroundColor: '#E5E5EA',
    borderRadius: 30,
    // marginHorizontal: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  defaultAvatar: {
    backgroundColor: '#E0E7FF', // Lighter purple shade
  },
  avatarText: {
    color: '#4950B8',
    fontSize: 22,
    fontWeight: '700',
  },

  // Content Styles
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 10,
  },
  userNameBold: {
    fontWeight: '800',
    color: '#000',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeTextHighlight: {
    color: '#4950B8',
    fontWeight: '700',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreviewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  prefixText: {
    fontSize: 14,
    color: '#4950B8',
    fontWeight: '500',
  },
  iconText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    lineHeight: 20,
  },
  lastMessageBold: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  emptyMessageText: {
    fontSize: 14,
    color: '#AEAEB2',
    fontStyle: 'italic',
  },

  // Badge Styles
  badgeContainer: {
    backgroundColor: '#4950B8',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // Loading & Empty States
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4950B8',
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  lottie2: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: hp(20),
  },


  // Floating Action Button (FAB)
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#4950B8',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for depth
    shadowColor: '#4950B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 6,
    borderColor: 'rgba(73, 80, 184, 0.2)', // Semi-transparent blue ring
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -2, // Optical adjustment
    marginLeft: 1,
  },
})