import { ImageBackground, StyleSheet } from 'react-native'
import React, { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import supabase from '../../../utils/supabase'
import { hasSeenOnboarding } from '../../../utils/storage/userDetails'
import { ImageName } from '../../../asserts'

type ScreenParamList = {
  OnBoarding: undefined;
  LogIn: undefined;
  ChatDrawer: undefined; 
};

const Splash = () => {
  const navigation = useNavigation<StackNavigationProp<ScreenParamList>>()

  useEffect(() => {
    checkAppState()
  }, [])

  const checkAppState = async () => {
    try {
      // Show splash for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check if user has seen onboarding
      const seenOnboarding = await hasSeenOnboarding()

      if (!seenOnboarding) {
        // First time user - show onboarding
        navigation.replace('OnBoarding')
        return
      }

      // Check if user is authenticated with Supabase
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Session error:', error)
        navigation.replace('LogIn')
        return
      }

      if (session && session.user) {
        // User is logged in - go to ChatDrawer (which contains ChatList as default)
        navigation.replace('ChatDrawer')
      } else {
        // User is not logged in - go to Login
        navigation.replace('LogIn')
      }
    } catch (error) {
      console.error('Error in splash screen:', error)
      // Default to Login on error
      navigation.replace('LogIn')
    }
  }

  return (
    <ImageBackground
      // source={require('../../../asserts/images/NewSplash.png')}
      source={ImageName.Splash}
      style={styles.backgroundImage}
      resizeMode="cover"
    />
  )
}

export default Splash

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
})