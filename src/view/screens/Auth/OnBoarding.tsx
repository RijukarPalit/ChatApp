import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect } from 'react'
import { hp } from '../../../utils/dimention'
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { setOnboardingComplete } from '../../../utils/storage/userDetails';
import { ImageName } from '../../../asserts';

type ScreenParamList = {
  SignUp: undefined;
  LogIn: undefined;
};

const OnBoarding = () => {
  const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();

  // Mark onboarding as complete when this screen is shown
  useEffect(() => {
    markOnboardingComplete();
  }, []);

  const markOnboardingComplete = async () => {
    await setOnboardingComplete();
    console.log('Onboarding marked as complete');
  };

  const handleSignup = () => {
    navigation.navigate('SignUp')
  }

  const handleLogin = () => {
    navigation.navigate('LogIn')
  }

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        // source={require('../../../asserts/images/OnboardingImage.png')}
        source={ImageName.OnboardingImage}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.containerBox}>
          <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', marginTop: hp(55) }}>
            <Text style={styles.desc}>Our chat app is the perfect way to stay </Text>
            <Text style={styles.desc}>connect with friends and family</Text>
          </View>

          {/* Social Login */}
          <View style={styles.socialContainer}>
            <View style={styles.iconContainer}>
              <TouchableOpacity style={styles.iconButton} >
                {/* onPress={handleGoogleSignIn}> */}
                <Image
                  // source={require('../../../asserts/images/google.png')}
                  source={ImageName.Google}
                  style={styles.icon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.or}>---------------- OR --------------</Text>

          {/* SignUp button */}
          <TouchableOpacity style={styles.signUpbtn} onPress={handleSignup}>
            <Text style={styles.text}>Sign Up</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: hp(2) }}>
            <Text style={styles.alreadyText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLogin}>
              <Text style={styles.logintext}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

export default OnBoarding

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  signUpbtn: {
    width: '90%',
    height: 50,
    backgroundColor: 'rgba(73, 80, 184, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: hp(2)
  },
  containerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  desc: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    opacity: 0.7
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  iconButton: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(234, 235, 245, 0.96)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20
  },
  icon: {
    width: 30,
    height: 30
  },
  or: {
    color: '#000',
    fontSize: 16,
    marginTop: hp(2),
    textAlign: 'center',
    opacity: 0.5,
  },
  logintext: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.5
  },
  alreadyText: {
    color: '#000',
    fontSize: 16,
    opacity: 0.5
  }
})