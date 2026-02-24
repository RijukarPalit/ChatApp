import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import supabase from './supabase';

class NotificationService {
  private lastNotificationId: string = ''
  private lastNotificationTime: number = 0

  private isDuplicate(id: string): boolean {
    const now = Date.now()
    if (this.lastNotificationId === id && now - this.lastNotificationTime < 2000) {
      return true
    }
    this.lastNotificationId = id
    this.lastNotificationTime = now
    return false
  }

  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const authStatus = await messaging().requestPermission();
    return authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  }

  async createNotificationChannel() {
    await notifee.createChannel({
      id: 'chat_messages',
      name: 'Chat Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // ✅ Unified Navigation Logic
  private handleNavigation(navigation: any, data: any) {
    if (data?.userId && navigation) {
      navigation.navigate('ChatBox', {
        userId: data.userId,
        userName: data.userName || 'Chat',
      });
    }
  }

  setupMessageListeners(navigation: any) {
    // 1. Foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('📲 Foreground message:', remoteMessage);
      const data = remoteMessage.data;
      if (data) {
        await notifee.displayNotification({
          title: (data.title as string) || 'New Message',
          body: `${data.senderName}: ${data.body}`,
          data: data,
          android: { 
            channelId: 'chat_messages',
            pressAction: { id: 'default' } 
          }
        });
      }
    });

    // 2. Background Tap
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📂 Background tap:', remoteMessage.data);
      this.handleNavigation(navigation, remoteMessage.data);
    });

    // 3. Quit State Tap
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('🚀 Quit state tap:', remoteMessage.data);
        this.handleNavigation(navigation, remoteMessage.data);
      }
    });

    // 4. Notifee Foreground Press
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNavigation(navigation, detail.notification?.data);
      }
    });
  }
}

export default new NotificationService();