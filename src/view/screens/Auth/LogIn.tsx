// import React, { useEffect, useState } from 'react'
// import {
//     Image,
//     Platform,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
//     KeyboardAvoidingView,
//     ScrollView,
//     Alert,
//     ActivityIndicator,
//     ImageBackground,
// } from 'react-native'
// import { Formik } from 'formik'
// import { hp, wp } from '../../../utils/dimention'
// import { WWTextInput } from '../../components/WWTextInput'
// import Toast from 'react-native-toast-message';
// import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// import { useNavigation } from '@react-navigation/native'
// import { StackNavigationProp } from '@react-navigation/stack'
// import supabase from '../../../utils/supabase'
// import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'
// import { clearRememberMe, getRememberMe, saveRememberMe, saveUserData } from '../../../utils/storage/userDetails'
// import { ImageName } from '../../../asserts'
// import messaging from '@react-native-firebase/messaging'
// import notificationService from '../../../utils/notificationService'

// const LogIn = () => {
//     const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();
//     const [isSecureTextEntry, setIsSecureTextEntry] = useState(true)
//     const [loading, setLoading] = useState(false);

//     const [email, setEmail] = useState('');
//     const [password, setPassword] = useState('');
//     const [rememberMe, setRememberMe] = useState(false);

//     useEffect(() => {
//         loadRememberMe();
//         GoogleSignin.configure({
//             scopes: ['https://www.googleapis.com/auth/drive.readonly', 'profile', 'email'],
//             webClientId: '151627509568-msui3f072b6u303qg577bpuna6qu0ev7.apps.googleusercontent.com',
//             offlineAccess: true,
//         });
//         enableBiometrics();
//     }, []);

//     const loadRememberMe = async () => {
//         const { remember, email: savedEmail } = await getRememberMe();
//         if (remember && savedEmail) {
//             setEmail(savedEmail);
//             setRememberMe(true);
//         }
//     };

//     const showToast = (type: 'success' | 'error', text1: string, text2?: any) => {
//         Toast.show({
//             type,
//             text1,
//             text2: typeof text2 === 'string' ? text2 : JSON.stringify(text2),
//             position: 'top',
//             visibilityTime: 3000,
//         });
//     };

//     // ✅ MAIN LOGIN FUNCTION - Handles both email/password and form submission
//     const handleSignIn = async (values: any) => {
//         try {
//             setLoading(true);
//             console.log('🔵 LOGIN DATA:', values);

//             const { email, password } = values;

//             const { data, error } = await supabase.auth.signInWithPassword({
//                 email: email.trim().toLowerCase(),
//                 password: password.trim(),
//             });

//             if (error) {
//                 setLoading(false);
//                 console.error('❌ Login Error:', error);

//                 if (error.message.includes('Invalid login credentials')) {
//                     showToast('error', 'Login Failed', 'Invalid email or password');
//                 } else if (error.message.includes('Email not confirmed')) {
//                     showToast('error', 'Email Not Verified', 'Please verify your email first');
//                 } else {
//                     showToast('error', 'Login Failed', error.message);
//                 }
//                 return;
//             }

//             if (data.user) {
//                 console.log('✅ Logged in user:', data.user.id);

//                 // ✅ Get and save FCM token using notificationService
//                 await notificationService.getFCMToken(data.user.id);

//                 const { data: userProfile, error: profileError } = await supabase
//                     .from('user')
//                     .select('*')
//                     .eq('id', data.user.id)
//                     .single();

//                 if (profileError) {
//                     console.error('Error fetching user profile:', profileError);
//                 } else {
//                     console.log('✅ User Profile:', userProfile);
//                 }

//                 // Handle Remember Me
//                 if (rememberMe) {
//                     await saveRememberMe(email);
//                 } else {
//                     await clearRememberMe();
//                 }

//                 showToast('success', 'Login Successful', 'Welcome back!');
                
//                 setLoading(false);

//                 setTimeout(() => {
//                     navigation.reset({
//                         index: 0,
//                         routes: [{ name: 'ChatDrawer' }],
//                     });
//                 }, 1000);
//             }

//         } catch (err: any) {
//             setLoading(false);
//             console.error('❌ Unexpected Login Error:', err);
//             showToast('error', 'Unexpected Error', err.message || 'Something went wrong');
//         }
//     };

//     const handleForgot = () => {
//         console.log('Forgot password')
//         navigation.navigate('ForgotPassword')
//     }

//     const handleSignup = () => {
//         console.log('Signup pressed')
//         navigation.navigate('SignUp')
//     }

//     // ✅ GOOGLE SIGN IN
//     const handleGoogleSignIn = async () => {
//         try {
//             setLoading(true);
//             await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//             const userInfo = await GoogleSignin.signIn();
//             const tokens = await GoogleSignin.getTokens();
//             const idToken = tokens?.idToken;

//             if (!idToken) {
//                 throw new Error('No ID token returned from Google. Check Google Console setup.');
//             }

//             const { data, error } = await supabase.auth.signInWithIdToken({
//                 provider: 'google',
//                 token: idToken,
//             });

//             if (error) {
//                 console.error('Supabase signInWithIdToken error:', error);
//                 Alert.alert('Authentication Failed (Supabase)', error.message || 'Authentication failed');
//                 return;
//             }

//             if (data?.user) {
//                 console.log('✅ Google login successful:', data.user.id);

//                 // ✅ Get and save FCM token using notificationService
//                 await notificationService.getFCMToken(data.user.id);

//                 showToast('success', 'Signed in with Google');

//                 navigation.reset({
//                     index: 0,
//                     routes: [{ name: 'ChatDrawer' }],
//                 });
//             }
//         } catch (error: any) {
//             console.error('Google Sign-In Error:', error);

//             if (error.code === statusCodes.SIGN_IN_CANCELLED) {
//                 return;
//             } else if (error.code === statusCodes.IN_PROGRESS) {
//                 Alert.alert('Sign In In Progress', 'Sign in is already in progress. Please wait.');
//             } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
//                 Alert.alert('Play Services Error', 'Google Play services not available or outdated. Please update.');
//             } else if (error.message?.includes('DEVELOPER_ERROR')) {
//                 Alert.alert(
//                     'Developer Configuration Error',
//                     'The Google Sign-In setup is incomplete or incorrect. Please ensure your Android SHA-1 fingerprint is correctly registered in the Google Cloud Console.',
//                     [{ text: 'OK' }]
//                 );
//             } else {
//                 Alert.alert('Google Sign-In Failed', error.message || 'An unknown error occurred.');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const enableBiometrics = async () => {
//         const rnBiometrics = new ReactNativeBiometrics();
//         rnBiometrics.isSensorAvailable()
//             .then(({ available, biometryType }) => {
//                 if (available && biometryType === BiometryTypes.TouchID) {
//                     console.log('TouchID is available')
//                 }
//                 else if (available && biometryType === BiometryTypes.FaceID) {
//                     console.log('FaceID is available')
//                 } else if (available && biometryType === BiometryTypes.Biometrics) {
//                     console.log('Biometrics is available')
//                 } else {
//                     console.log('Biometrics is not available')
//                 }
//             })
//             .catch(error => {
//                 console.log(error, "Error");
//             })
//     }

//     const handleBiometrics = async () => {
//         try {
//             const rnBiometrics = new ReactNativeBiometrics();
//             const { success, error } = await rnBiometrics.simplePrompt({
//                 promptMessage: 'Fingerprint Authentication',
//             })
//             if (success) {
//                 navigation.reset({
//                     index: 0,
//                     routes: [{ name: 'ChatDrawer' }],
//                 });
//                 return true
//             }
//             else {
//                 Alert.alert("Error", "Biometrics authentication error occurred!")
//                 return false
//             }

//         } catch (error) {
//             console.log(error, "Error");
//             Alert.alert("Error", "Biometrics authentication error occurred!")
//         }
//     }

//     if (loading) {
//         return (
//             <View style={styles.loaderContainer}>
//                 <ActivityIndicator size="large" color="#00A3FF" />
//                 <Text style={styles.loadingText}>Please wait...</Text>
//             </View>
//         );
//     }

//     return (
//         <ImageBackground
//             source={ImageName.Background}
//             style={styles.backgroundImage}
//             resizeMode="cover"
//         >
//             <KeyboardAvoidingView
//                 behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//                 style={{ flex: 1 }}
//                 keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
//             >
//                 <ScrollView
//                     showsVerticalScrollIndicator={false}
//                     contentContainerStyle={styles.scrollContent}
//                     keyboardShouldPersistTaps="handled"
//                 >
//                     <View style={styles.container}>
//                         {/* Header Section */}
//                         <View style={styles.headerSection}>
//                             <Text style={styles.title}>Welcome Back</Text>
//                             <Text style={styles.description}>
//                                 Sign in to continue your journey
//                             </Text>
//                         </View>

//                         {/* Form Card */}
//                         <View style={styles.formCard}>
//                             <Formik
//                                 initialValues={{ email: email, password: '' }}
//                                 enableReinitialize
//                                 validate={(values) => {
//                                     const errors: any = {}

//                                     if (!values.email) {
//                                         errors.email = 'Please enter email'
//                                     } else if (!/\S+@\S+\.\S+/.test(values.email)) {
//                                         errors.email = 'Invalid email'
//                                     }

//                                     if (!values.password) {
//                                         errors.password = 'Please enter password'
//                                     } else if (values.password.length < 6) {
//                                         errors.password = 'Password must be at least 6 characters'
//                                     }

//                                     return errors
//                                 }}
//                                 onSubmit={handleSignIn}
//                             >
//                                 {({
//                                     handleChange,
//                                     handleBlur,
//                                     handleSubmit,
//                                     values,
//                                     errors,
//                                     touched,
//                                 }) => (
//                                     <>
//                                         <WWTextInput
//                                             label="Email"
//                                             placeholder="email@gmail.com"
//                                             value={values.email}
//                                             onChangeText={handleChange('email')}
//                                             onBlur={handleBlur('email')}
//                                         />
//                                         {touched.email && errors.email && (
//                                             <Text style={styles.errorText}>{errors.email}</Text>
//                                         )}

//                                         <WWTextInput
//                                             label="Password"
//                                             placeholder="Enter your password"
//                                             value={values.password}
//                                             secureTextEntry={isSecureTextEntry}
//                                             onChangeText={handleChange('password')}
//                                             onBlur={handleBlur('password')}
//                                             rightIcon={
//                                                 <TouchableOpacity
//                                                     onPress={() =>
//                                                         setIsSecureTextEntry((prev) => !prev)
//                                                     }
//                                                     style={styles.eyeButton}
//                                                 >
//                                                     <Text style={styles.eyeText}>
//                                                         {isSecureTextEntry ? <Image source={require('../../../asserts/images/eyeClose.png')} style={styles.eyeIcon} /> : <Image source={require('../../../asserts/images/eye.png')} style={styles.eyeIcon} />}
//                                                     </Text>
//                                                 </TouchableOpacity>
//                                             }
//                                         />
//                                         {touched.password && errors.password && (
//                                             <Text style={styles.errorText}>{errors.password}</Text>
//                                         )}

//                                         <View style={styles.optionsRow}>
//                                             <TouchableOpacity onPress={handleForgot}>
//                                                 <Text style={styles.forgotText}>Forgot Password?</Text>
//                                             </TouchableOpacity>
//                                         </View>

//                                         <TouchableOpacity
//                                             style={styles.signInBtn}
//                                             onPress={handleSubmit as any}
//                                         >
//                                             <Text style={styles.signInBtnText}>Sign In</Text>
//                                             <Text style={styles.signInBtnIcon}>→</Text>
//                                         </TouchableOpacity>
//                                     </>
//                                 )}
//                             </Formik>

//                             {/* Divider */}
//                             <View style={styles.dividerContainer}>
//                                 <View style={styles.dividerLine} />
//                                 <Text style={styles.dividerText}>or continue with</Text>
//                                 <View style={styles.dividerLine} />
//                             </View>

//                             <View style={{ gap: 10 }}>
//                                 {/* Social Login */}
//                                 <TouchableOpacity
//                                     style={styles.googleButton}
//                                     onPress={handleGoogleSignIn}
//                                 >
//                                     <Image
//                                         source={ImageName.Google}
//                                         style={styles.googleIcon}
//                                         resizeMode="contain"
//                                     />
//                                     <Text style={styles.googleButtonText}>Sign in with Google</Text>
//                                 </TouchableOpacity>

//                                 {/* Biometric Login */}
//                                 <TouchableOpacity
//                                     style={styles.googleButton}
//                                     onPress={handleBiometrics}
//                                 >
//                                     <Image
//                                         source={ImageName.Biometric}
//                                         style={styles.googleIcon}
//                                         resizeMode="contain"
//                                     />
//                                     <Text style={styles.googleButtonText}>Sign in with Biometric</Text>
//                                 </TouchableOpacity>
//                             </View>
//                         </View>

//                         {/* Footer */}
//                         <View style={styles.footer}>
//                             <Text style={styles.footerText}>Don't have an account?</Text>
//                             <TouchableOpacity onPress={handleSignup}>
//                                 <Text style={styles.signUpLink}> Sign Up</Text>
//                             </TouchableOpacity>
//                         </View>
//                     </View>
//                 </ScrollView>
//             </KeyboardAvoidingView>
//         </ImageBackground>
//     )
// }

// export default LogIn

// const styles = StyleSheet.create({
//     backgroundImage: {
//         flex: 1,
//         width: '100%',
//         height: '100%',
//     },
//     scrollContent: {
//         flexGrow: 1,
//         paddingBottom: hp(5),
//     },
//     container: {
//         paddingHorizontal: wp(5),
//         paddingTop: hp(8),
//         paddingBottom: hp(5),
//         minHeight: hp(100),
//     },

//     // Header Section
//     headerSection: {
//         alignItems: 'center',
//         marginBottom: hp(4),
//         paddingTop: hp(4),
//     },
//     logoCircle: {
//         width: wp(18),
//         height: wp(18),
//         borderRadius: wp(9),
//         backgroundColor: 'rgba(255, 255, 255, 0.95)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: hp(2.5),
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 6 },
//         shadowOpacity: 0.2,
//         shadowRadius: 10,
//         elevation: 10,
//     },
//     logoText: {
//         fontSize: 40,
//     },
//     title: {
//         fontSize: 36,
//         fontWeight: 'bold',
//         color: '#FFFFFF',
//         marginBottom: hp(1),
//         textShadowColor: 'rgba(0, 0, 0, 0.25)',
//         textShadowOffset: { width: 0, height: 2 },
//         textShadowRadius: 4,
//     },
//     eyeIcon: {
//         width: wp(5),
//         height: wp(5),
//     },
//     description: {
//         fontSize: 16,
//         color: '#FFFFFF',
//         opacity: 0.95,
//         textAlign: 'center',
//         textShadowColor: 'rgba(0, 0, 0, 0.15)',
//         textShadowOffset: { width: 0, height: 1 },
//         textShadowRadius: 2,
//     },

//     // Form Card
//     formCard: {
//         backgroundColor: 'rgba(255, 255, 255, 0.98)',
//         borderRadius: 24,
//         padding: wp(6),
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 10 },
//         shadowOpacity: 0.15,
//         shadowRadius: 20,
//         elevation: 10,
//     },

//     // Error Text
//     errorText: {
//         color: '#FF3B30',
//         fontSize: 12,
//         marginTop: hp(0.5),
//         marginLeft: wp(1),
//         fontWeight: '500',
//     },

//     // Eye Button
//     eyeButton: {
//         padding: wp(2),
//     },
//     eyeText: {
//         fontSize: 20,
//     },

//     // Sign In Button
//     signInBtn: {
//         width: '100%',
//         height: hp(6.5),
//         backgroundColor: '#00A3FF',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderRadius: 16,
//         marginTop: hp(2),
//         flexDirection: 'row',
//         shadowColor: '#00A3FF',
//         shadowOffset: { width: 0, height: 4 },
//         shadowOpacity: 0.3,
//         shadowRadius: 8,
//         elevation: 6,
//     },
//     signInBtnText: {
//         color: '#FFFFFF',
//         fontSize: 18,
//         fontWeight: 'bold',
//         marginRight: wp(2),
//     },
//     signInBtnIcon: {
//         color: '#FFFFFF',
//         fontSize: 20,
//         fontWeight: 'bold',
//     },

//     // Divider
//     dividerContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginVertical: hp(3),
//     },
//     dividerLine: {
//         flex: 1,
//         height: 1,
//         backgroundColor: '#E0E0E0',
//     },
//     dividerText: {
//         color: '#888888',
//         fontSize: 14,
//         paddingHorizontal: wp(3),
//         fontWeight: '500',
//     },

//     // Google Button
//     googleButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         backgroundColor: '#FFFFFF',
//         borderWidth: 1.5,
//         borderColor: '#E0E0E0',
//         borderRadius: 16,
//         paddingVertical: hp(1.8),
//         gap: wp(3),
//     },
//     googleIcon: {
//         width: wp(6),
//         height: wp(6),
//     },
//     googleButtonText: {
//         color: '#333333',
//         fontSize: 16,
//         fontWeight: '600',
//     },

//     // Footer
//     footer: {
//         marginTop: hp(4),
//         alignSelf: 'center',
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     footerText: {
//         color: '#000',
//         fontSize: 15,
//         fontWeight: '500',
//     },
//     signUpLink: {
//         color: '#000',
//         fontSize: 15,
//         fontWeight: 'bold',
//         textDecorationLine: 'underline',
//     },

//     // Loader
//     loaderContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0, 163, 255, 0.1)',
//     },
//     loadingText: {
//         marginTop: hp(2),
//         fontSize: 16,
//         color: '#00A3FF',
//         fontWeight: '600',
//     },

//     // Options Row (Forgot Password + Biometric)
//     optionsRow: {
//         flexDirection: 'row',
//         justifyContent: 'flex-end',
//         alignItems: 'center',
//         marginTop: hp(1),
//         marginBottom: hp(1),
//     },
//     forgotText: {
//         color: '#00A3FF',
//         fontSize: 14,
//         fontWeight: '600',
//     },
//     biometricButton: {
//         padding: wp(1.5),
//         backgroundColor: 'rgba(0, 163, 255, 0.1)',
//         borderRadius: 12,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     biometricImage: {
//         width: wp(7),
//         height: wp(7),
//     },
// })





// // 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25


// // 151627509568-ba1i4kim529ig8k2l7ol1m14mibrhod0.apps.googleusercontent.com,151627509568-msui3f072b6u303qg577bpuna6qu0ev7.apps.googleusercontent.com

import React, { useEffect, useState } from 'react'
import {
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    ScrollView,
    PermissionsAndroid,
    Alert,
    ActivityIndicator,
    ImageBackground,
} from 'react-native'
import { Formik } from 'formik'
import { hp, wp } from '../../../utils/dimention'
import { WWTextInput } from '../../components/WWTextInput'
import Toast from 'react-native-toast-message';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import Geolocation from '@react-native-community/geolocation'
import supabase from '../../../utils/supabase'
import ChatList from './Drawer Navigation/ChatList'
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'
import ChatDrawer from '../../../Navigation/ChatDrawer'
import { clearRememberMe, getRememberMe, saveRememberMe, saveUserData } from '../../../utils/storage/userDetails'
import { ImageName } from '../../../asserts'
import messaging from '@react-native-firebase/messaging'


const LogIn = () => {
    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();
    const [isSecureTextEntry, setIsSecureTextEntry] = useState(true)
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);



    useEffect(() => {
        loadRememberMe();
    }, []);

    const loadRememberMe = async () => {
        const { remember, email: savedEmail } = await getRememberMe();
        if (remember && savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (error) {
                Alert.alert('Login Failed', error.message);
                return;
            }

            if (data.user) {
                // Save user data
                await saveUserData(data.user);

                // Handle Remember Me
                if (rememberMe) {
                    await saveRememberMe(email);
                } else {
                    await clearRememberMe();
                }

                // ✅ FIX: Use reset to clear navigation stack
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatDrawer' }],
                });
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = () => {
        console.log('Forgot password')
        navigation.navigate('ForgotPassword')
    }



    const handleSignup = () => {
        console.log('Signup pressed')
        navigation.navigate('SignUp')
    }

    const showToast = (type: 'success' | 'error', text1: string, text2?: any) => {
        Toast.show({
            type,
            text1,
            text2: typeof text2 === 'string' ? text2 : JSON.stringify(text2),
            position: 'top',
            visibilityTime: 3000,
        });
    };

    const handleSignIn = async (values: any) => {
        try {
            setLoading(true);
            console.log('LOGIN DATA:', values);

            const { email, password } = values;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password: password.trim(),
            });

            if (error) {
                setLoading(false);
                console.error('Login Error:', error);

                if (error.message.includes('Invalid login credentials')) {
                    showToast('error', 'Login Failed', 'Invalid email or password');
                } else if (error.message.includes('Email not confirmed')) {
                    showToast('error', 'Email Not Verified', 'Please verify your email first');
                } else {
                    showToast('error', 'Login Failed', error.message);
                }
                return;
            }

            if (data.user) {
                console.log('✅ Logged in user:', data.user);
                console.log('✅ Session:', data.session);

                // Get FCM token
                const fcmToken = await messaging().getToken();
                console.log('FCM TOKEN:', fcmToken);

                await supabase
                    .from('user')
                    .update({ fcm_token: fcmToken })
                    .eq('id', data.user.id);

                const { data: userProfile, error: profileError } = await supabase
                    .from('user')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                setLoading(false);

                if (profileError) {
                    console.error('Error fetching user profile:', profileError);
                } else {
                    console.log('✅ User Profile:', userProfile);
                }

                showToast('success', 'Login Successful', 'Welcome back!');
                setTimeout(() => {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'ChatDrawer' }],
                    });
                }, 1000);
            }

        } catch (err: any) {
            setLoading(false);
            console.error('❌ Unexpected Login Error:', err);
            showToast('error', 'Unexpected Error', err.message || 'Something went wrong');
        }
    };

    useEffect(() => {
        GoogleSignin.configure({
            scopes: ['https://www.googleapis.com/auth/drive.readonly', 'profile', 'email'],
            webClientId: '151627509568-msui3f072b6u303qg577bpuna6qu0ev7.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }, []);

    useEffect(() => {
        enableBiometrics()
    }, [])

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const userInfo = await GoogleSignin.signIn();
            const tokens = await GoogleSignin.getTokens();
            const idToken = tokens?.idToken;


            if (!idToken) {
                throw new Error('No ID token returned from Google. Check Google Console setup.');
            }
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,


            });

            if (error) {
                console.error('Supabase signInWithIdToken error:', error);
                Alert.alert('Authentication Failed (Supabase)', error.message || 'Authentication failed');
            } else if (data?.user) {

                // Get FCM token
                const fcmToken = await messaging().getToken();
                console.log('FCM TOKEN (Google):', fcmToken);

                //  Save token in your "user" table
                await supabase
                    .from('user')   // ✅ your correct table name
                    .update({ fcm_token: fcmToken })
                    .eq('id', data.user.id);
                    
                showToast('success', 'Signed in with Google');

                // ✅ FIX: Use reset instead of navigate
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatDrawer' }],
                });
            }
        } catch (error: any) {
            console.error('Google Sign-In Error:', error);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                return;
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Alert.alert('Sign In In Progress', 'Sign in is already in progress. Please wait.');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Play Services Error', 'Google Play services not available or outdated. Please update.');
            } else if (error.message?.includes('DEVELOPER_ERROR')) {
                Alert.alert(
                    'Developer Configuration Error',
                    'The Google Sign-In setup is incomplete or incorrect. Please ensure your Android SHA-1 fingerprint is correctly registered in the Google Cloud Console.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Google Sign-In Failed', error.message || 'An unknown error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    const enableBiometrics = async () => {
        const rnBiometrics = new ReactNativeBiometrics();
        rnBiometrics.isSensorAvailable()
            .then(({ available, biometryType }) => {
                if (available && biometryType === BiometryTypes.TouchID) {
                    console.log('TouchID is available')
                }
                else if (available && biometryType === BiometryTypes.FaceID) {
                    console.log('FaceID is available')
                } else if (available && biometryType === BiometryTypes.Biometrics) {
                    console.log('Biometrics is available')
                } else {
                    console.log('Biometrics is not available')
                }
            })
            .catch(error => {
                console.log(error, "Error");
            })
    }

    const handleBiometrics = async () => {
        try {
            const rnBiometrics = new ReactNativeBiometrics();
            const { success, error } = await rnBiometrics.simplePrompt({
                promptMessage: 'Fingerprint Authentication',
            })
            if (success) {
                // ✅ FIX: Use reset instead of navigate
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatDrawer' }],
                });
                return true
            }
            else {
                Alert.alert("Error", "Biometrics authentication error occurred!")
                return false
            }

        } catch (error) {
            console.log(error, "Error");
            Alert.alert("Error", "Biometrics authentication error occurred!")
        }
    }

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#00A3FF" />
                <Text style={styles.loadingText}>Please wait...</Text>
            </View>
        );
    }

    return (
        <ImageBackground
            // source={require('../../../asserts/images/Bg.png')}
            source={ImageName.Background}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <Text style={styles.title}>Welcome Back</Text>
                            <Text style={styles.description}>
                                Sign in to continue your journey
                            </Text>
                        </View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Formik
                                initialValues={{ email: '', password: '' }}
                                validate={(values) => {
                                    const errors: any = {}

                                    if (!values.email) {
                                        errors.email = 'Please enter email'
                                    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
                                        errors.email = 'Invalid email'
                                    }

                                    if (!values.password) {
                                        errors.password = 'Please enter password'
                                    } else if (values.password.length < 6) {
                                        errors.password = 'Password must be at least 6 characters'
                                    }

                                    return errors
                                }}
                                onSubmit={handleSignIn}
                            >
                                {({
                                    handleChange,
                                    handleBlur,
                                    handleSubmit,
                                    values,
                                    errors,
                                    touched,
                                }) => (
                                    <>
                                        <WWTextInput
                                            label="Email"
                                            placeholder="email@gmail.com"
                                            value={values.email}
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                        />
                                        {touched.email && errors.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}

                                        <WWTextInput
                                            label="Password"
                                            placeholder="Enter your password"
                                            value={values.password}
                                            secureTextEntry={isSecureTextEntry}
                                            onChangeText={handleChange('password')}
                                            onBlur={handleBlur('password')}
                                            rightIcon={
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        setIsSecureTextEntry((prev) => !prev)
                                                    }
                                                    style={styles.eyeButton}
                                                >
                                                    <Text style={styles.eyeText}>
                                                        {isSecureTextEntry ? <Image source={require('../../../asserts/images/eyeClose.png')} style={styles.eyeIcon} /> : <Image source={require('../../../asserts/images/eye.png')} style={styles.eyeIcon} />}
                                                    </Text>
                                                </TouchableOpacity>
                                            }
                                        />
                                        {touched.password && errors.password && (
                                            <Text style={styles.errorText}>{errors.password}</Text>
                                        )}

                                        <View style={styles.optionsRow}>
                                            <TouchableOpacity onPress={handleForgot}>
                                                <Text style={styles.forgotText}>Forgot Password?</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.signInBtn}
                                            onPress={handleSubmit as any}
                                        >
                                            <Text style={styles.signInBtnText}>Sign In</Text>
                                            <Text style={styles.signInBtnIcon}>→</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </Formik>

                            {/* Divider */}
                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>or continue with</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <View style={{ gap: 10 }}>

                                {/* Social Login */}
                                <TouchableOpacity
                                    style={styles.googleButton}
                                    onPress={handleGoogleSignIn}
                                >
                                    <Image
                                        source={ImageName.Google}
                                        style={styles.googleIcon}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                                </TouchableOpacity>

                                {/* Biometric Login */}
                                <TouchableOpacity
                                    style={styles.googleButton}
                                    onPress={handleBiometrics}
                                >
                                    <Image
                                        // source={require('../../../asserts/images/bioMetric.png')}
                                        source={ImageName.Biometric}
                                        style={styles.googleIcon}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.googleButtonText}>Sign in with Biometric</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account?</Text>
                            <TouchableOpacity onPress={handleSignup}>
                                <Text style={styles.signUpLink}> Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    )
}

export default LogIn

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: hp(5),
    },
    container: {
        paddingHorizontal: wp(5),
        paddingTop: hp(8),
        paddingBottom: hp(5),
        minHeight: hp(100),
    },

    // Header Section
    headerSection: {
        alignItems: 'center',
        marginBottom: hp(4),
        paddingTop: hp(4),
    },
    logoCircle: {
        width: wp(18),
        height: wp(18),
        borderRadius: wp(9),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(2.5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    logoText: {
        fontSize: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: hp(1),
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    eyeIcon: {
        width: wp(5),
        height: wp(5),
    },
    description: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.95,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Form Card
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 24,
        padding: wp(6),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },

    // Error Text
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: hp(0.5),
        marginLeft: wp(1),
        fontWeight: '500',
    },

    // Eye Button
    eyeButton: {
        padding: wp(2),
    },
    eyeText: {
        fontSize: 20,
    },

    // Sign In Button
    signInBtn: {
        width: '100%',
        height: hp(6.5),
        backgroundColor: '#00A3FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        marginTop: hp(2),
        flexDirection: 'row',
        shadowColor: '#00A3FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    signInBtnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: wp(2),
    },
    signInBtnIcon: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },

    // Divider
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: hp(3),
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        color: '#888888',
        fontSize: 14,
        paddingHorizontal: wp(3),
        fontWeight: '500',
    },

    // Google Button
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        paddingVertical: hp(1.8),
        gap: wp(3),
    },
    googleIcon: {
        width: wp(6),
        height: wp(6),
    },
    googleButtonText: {
        color: '#333333',
        fontSize: 16,
        fontWeight: '600',
    },

    // Footer
    footer: {
        marginTop: hp(4),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '500',
    },
    signUpLink: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },

    // Loader
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 163, 255, 0.1)',
    },
    loadingText: {
        marginTop: hp(2),
        fontSize: 16,
        color: '#00A3FF',
        fontWeight: '600',
    },

    // Options Row (Forgot Password + Biometric)
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: hp(1),
        marginBottom: hp(1),
    },
    forgotText: {
        color: '#00A3FF',
        fontSize: 14,
        fontWeight: '600',
    },
    biometricButton: {
        padding: wp(1.5),
        backgroundColor: 'rgba(0, 163, 255, 0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    biometricImage: {
        width: wp(7),
        height: wp(7),
    },
})