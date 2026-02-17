
import React, { useEffect } from 'react'
import {
  ImageBackground,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import supabase from '../../../utils/supabase'
import { hasSeenOnboarding } from '../../../utils/storage/userDetails'
import { ImageName } from '../../../asserts'
import { hp } from '../../../utils/dimention'

type ScreenParamList = {
  OnBoarding: undefined
  LogIn: undefined
  ChatDrawer: undefined
}

const Splash = () => {
  const navigation =
    useNavigation<StackNavigationProp<ScreenParamList>>()

  useEffect(() => {
    checkAppState()
  }, [])

  const checkAppState = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))

      const seenOnboarding = await hasSeenOnboarding()

      if (!seenOnboarding) {
        navigation.replace('OnBoarding')
        return
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        navigation.replace('LogIn')
        return
      }

      if (session && session.user) {
        navigation.replace('ChatDrawer')
      } else {
        navigation.replace('LogIn')
      }
    } catch (error) {
      navigation.replace('LogIn')
    }
  }

  return (
    <ImageBackground
      source={ImageName.NewSplash}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Text Section */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>Welcome</Text>

        <Text style={styles.subtitle}>
          Experience a new way to connect.
        </Text>

        <Text style={styles.description}>
          Simple, fast, and secure messaging{'\n'}
          designed for you and your friends.
        </Text>
      </View>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <Text style={styles.continueText}>Continue</Text>

        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => navigation.replace('OnBoarding')}
          activeOpacity={0.8}
        >
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  )
}

export default Splash

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },

  textContainer: {
    paddingHorizontal: 32,
    marginTop: hp(38),
  },

  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.5,
  },

  subtitle: {
    marginTop: 16,
    fontSize: 18,
    color: '#444',
    fontWeight: '500',
    lineHeight: 26,
  },

  description: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    fontWeight: '400',
  },

  bottomContainer: {
    position: 'absolute',
    bottom: hp(6),
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },

  continueText: {
    fontSize: 16,
    color: '#888',
    marginRight: 12,
    fontWeight: '500',
  },

  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: '#F25F5C',
    backgroundColor: 'rgba(122, 24, 214, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',

    // Shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,

    // Shadow (Android)
    // elevation: 6,
  },

  arrow: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -hp(1),
  },
})
