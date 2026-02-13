// import messaging from '@react-native-firebase/messaging';
// import notifee, { AndroidImportance } from '@notifee/react-native';
// import { Platform, PermissionsAndroid } from 'react-native';
// import supabase from './supabase';

// class NotificationService {
//   // Request notification permissions
//   async requestUserPermission() {
//     if (Platform.OS === 'android' && Platform.Version >= 33) {
//       const granted = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
//       );
//       return granted === PermissionsAndroid.RESULTS.GRANTED;
//     }

//     const authStatus = await messaging().requestPermission();
//     const enabled =
//       authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//       authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//     if (enabled) {
//       console.log('✅ Notification permission granted');
//     }

//     return enabled;
//   }

//   // Get FCM token and save to Supabase
//   async getFCMToken(userId: string) {
//     try {
//       const token = await messaging().getToken();
//       console.log('FCM Token:', token);

//       // Save token to Supabase
//       const { error } = await supabase
//         .from('user')
//         .update({ fcm_token: token })
//         .eq('id', userId);

//       if (error) {
//         console.error('Error saving FCM token:', error);
//       } else {
//         console.log('✅ FCM token saved to Supabase');
//       }

//       return token;
//     } catch (error) {
//       console.error('Error getting FCM token:', error);
//       return null;
//     }
//   }

//   // Create notification channel for Android
//   async createNotificationChannel() {
//     await notifee.createChannel({
//       id: 'chat_messages',
//       name: 'Chat Messages',
//       importance: AndroidImportance.HIGH,
//       sound: 'default',
//     });
//   }

//   // Display local notification
//   async displayNotification(
//     title: string,
//     body: string,
//     data?: any
//   ) {
//     await notifee.displayNotification({
//       title,
//       body,
//       data,
//       android: {
//         channelId: 'chat_messages',
//         importance: AndroidImportance.HIGH,
//         pressAction: {
//           id: 'default',
//         },
//         sound: 'default',
//       },
//       ios: {
//         sound: 'default',
//       },
//     });
//   }

//   // Setup message listeners
//   setupMessageListeners(navigation: any) {
//     // Foreground messages
//     messaging().onMessage(async (remoteMessage) => {
//       console.log('Foreground message:', remoteMessage);

//       if (remoteMessage.notification) {
//         await this.displayNotification(
//           remoteMessage.notification.title || 'New Message',
//           remoteMessage.notification.body || '',
//           remoteMessage.data
//         );
//       }
//     });

//     // Background/Quit state messages
//     messaging().onNotificationOpenedApp((remoteMessage) => {
//       console.log('Notification opened app:', remoteMessage);
      
//       // Navigate to chat
//       if (remoteMessage.data?.userId && remoteMessage.data?.userName) {
//         navigation.navigate('ChatBox', {
//           userId: remoteMessage.data.userId,
//           userName: remoteMessage.data.userName,
//         });
//       }
//     });

//     // Check if app was opened from a notification (quit state)
//     messaging()
//       .getInitialNotification()
//       .then((remoteMessage) => {
//         if (remoteMessage) {
//           console.log('App opened from quit state:', remoteMessage);
          
//           if (remoteMessage.data?.userId && remoteMessage.data?.userName) {
//             navigation.navigate('ChatBox', {
//               userId: remoteMessage.data.userId,
//               userName: remoteMessage.data.userName,
//             });
//           }
//         }
//       });

//     // Handle notification tap when app is in foreground
//     notifee.onForegroundEvent(({ type, detail }) => {
//       if (type === 1) { // Press event
//         const data = detail.notification?.data;
//         if (data?.userId && data?.userName) {
//           navigation.navigate('ChatBox', {
//             userId: data.userId,
//             userName: data.userName,
//           });
//         }
//       }
//     });
//   }

//   // Background message handler
//   static setBackgroundMessageHandler() {
//     messaging().setBackgroundMessageHandler(async (remoteMessage) => {
//       console.log('Background message:', remoteMessage);
//     });
//   }
// }

// export default new NotificationService();


import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import supabase from './supabase';

class NotificationService {

  async requestUserPermission() {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Android notification permission granted');
          return true;
        } else {
          console.log('❌ Android notification permission denied');
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS notification permission granted');
      } else {
        console.log('❌ iOS notification permission denied');
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }

  async getFCMToken(userId: string) {
    try {
      const token = await messaging().getToken();
      console.log('📱 FCM Token obtained:', token);

      const { error } = await supabase
        .from('user')
        .update({ fcm_token: token })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error saving FCM token:', error);
        return null;
      }

      console.log('✅ FCM token saved to database');
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  async createNotificationChannel() {
    try {
      await notifee.createChannel({
        id: 'chat_messages',
        name: 'Chat Messages',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
      console.log('✅ Notification channel created');
    } catch (error) {
      console.error('❌ Error creating notification channel:', error);
    }
  }

  async displayNotification(title: string, body: string, data?: any) {
    try {
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: 'chat_messages',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: 'default',
        },
        ios: {
          sound: 'default',
        },
      });
      console.log('✅ Notification displayed');
    } catch (error) {
      console.error('❌ Error displaying notification:', error);
    }
  }

  setupMessageListeners(navigation: any) {
    // Foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('📲 Foreground message received:', remoteMessage);

      if (remoteMessage.notification) {
        await this.displayNotification(
          remoteMessage.notification.title || 'New Message',
          remoteMessage.notification.body || '',
          remoteMessage.data
        );
      }
    });

    // Notifee foreground press
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('🔵 Notification pressed (foreground)');
        const data = detail.notification?.data;
        if (data?.userId) {
          navigation.navigate('ChatBox', {
            userId: data.userId,
            userName: data.userName,
          });
        }
      }
    });

    console.log('✅ Message listeners setup complete');
  }
}

export default new NotificationService();