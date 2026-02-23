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