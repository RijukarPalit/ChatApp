import React, { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import Splash from './src/view/screens/Auth/Splash'
import OnBoarding from './src/view/screens/Auth/OnBoarding'
import SignUp from './src/view/screens/Auth/SignUp'
import LogIn from './src/view/screens/Auth/LogIn'
import ChatBox from './src/view/screens/Auth/ChatBox'
import ForgotPassword from './src/view/screens/Auth/ForgotPassword'
import ChatDrawer from './src/Navigation/ChatDrawer'
import CustomToast from './src/view/components/CustomToast'
import Toast from 'react-native-toast-message'
import messaging from '@react-native-firebase/messaging'
import notificationService from './src/utils/notificationService'

export type RootStackParamList = {
  Splash: undefined;
  OnBoarding: undefined;
  SignUp: undefined;
  LogIn: undefined;
  ChatBox: any;
  ForgotPassword: undefined;
  ChatDrawer: undefined;
}

const Stack = createStackNavigator<RootStackParamList>()

// Background handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log(' Background message:', remoteMessage)
})

const App = () => {
  const navigationRef = useRef<any>(null)

  useEffect(() => {
    initializeNotifications()
    handleNotificationOpen()
  }, [])

  const initializeNotifications = async () => {
    // Request permissions
    const hasPermission = await notificationService.requestUserPermission()
    console.log('Permission granted:', hasPermission)
    
    // Create notification channel
    await notificationService.createNotificationChannel()
  }

  const handleNotificationOpen = () => {
    // Background tap
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(' Opened from background:', remoteMessage)
      
      const data = remoteMessage.data
      if (navigationRef.current && data?.userId && data?.userName) {
        navigationRef.current.navigate('ChatBox', {
          userId: data.userId,
          userName: data.userName,
        })
      }
    })

    // Quit state tap
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Opened from quit state:', remoteMessage)
          
          const data = remoteMessage.data
          if (navigationRef.current && data?.userId && data?.userName) {
            navigationRef.current.navigate('ChatBox', {
              userId: data.userId,
              userName: data.userName,
            })
          }
        }
      })
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          if (navigationRef.current) {
            notificationService.setupMessageListeners(navigationRef.current)
          }
        }}
      >
        <Stack.Navigator>
          <Stack.Screen
            name="Splash"
            component={Splash}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OnBoarding"
            component={OnBoarding}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="LogIn"
            component={LogIn}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatDrawer"
            component={ChatDrawer}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatBox"
            component={ChatBox}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPassword}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      <Toast config={CustomToast} />
    </>
  )
}

export default App