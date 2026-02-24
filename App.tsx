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
import { ChatBackgroundProvider } from './src/context/ChangeBackgrounContext'

// ✅ 1. Register background handler at the very top (Outside component)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('🌙 Background message received:', remoteMessage);
});

const Stack = createStackNavigator<RootStackParamList>()

const App = () => {
  const navigationRef = useRef<any>(null)

  useEffect(() => {
    // ✅ 2. Initialize permissions and channel only once
    const init = async () => {
      await notificationService.requestUserPermission();
      await notificationService.createNotificationChannel();
    }
    init();
  }, [])

  return (
    <>
      <ChatBackgroundProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            if (navigationRef.current) {
              // ✅ 3. Single source of truth for all listeners
              notificationService.setupMessageListeners(navigationRef.current)
            }
          }}
        >
          <Stack.Navigator>
            <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
            <Stack.Screen name="OnBoarding" component={OnBoarding} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: false }} />
            <Stack.Screen name="LogIn" component={LogIn} options={{ headerShown: false }} />
            <Stack.Screen name="ChatDrawer" component={ChatDrawer} options={{ headerShown: false }} />
            <Stack.Screen name="ChatBox" component={ChatBox} options={{ headerShown: false }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ChatBackgroundProvider>
      <Toast config={CustomToast} />
    </>
  )
}

export default App