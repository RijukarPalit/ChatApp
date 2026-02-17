// import React, { useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     KeyboardAvoidingView,
//     Platform,
//     ScrollView,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { StackNavigationProp } from '@react-navigation/stack';
// import supabase from '../../../utils/supabase';
// import { Formik } from 'formik';
// import { WWTextInput } from '../../components/WWTextInput';
// import { hp, wp } from '../../../utils/dimention';

// const ForgotPassword: React.FC = () => {
//     const navigation =
//         useNavigation<StackNavigationProp<ScreenParamList>>();

//     const [email, setEmail] = useState('');
//     const [otp, setOtp] = useState('');
//     const [otpSent, setOtpSent] = useState(false);
//     const [loading, setLoading] = useState(false);

//     const isValidEmail = (email: string) => {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         return emailRegex.test(email);
//     };

//     const handleSendOtp = async (emailValue: string) => {
//         if (!isValidEmail(emailValue)) {
//             Alert.alert('Error', 'Please enter a valid email address.');
//             return;
//         }
//         setLoading(true);
//         const { error } = await supabase.auth.signInWithOtp({
//             email: emailValue.trim().toLowerCase(),
//             options: { shouldCreateUser: false }
//         });
//         setLoading(false);
//         if (error) {
//             Alert.alert('Error', error.message);
//         } else {
//             setEmail(emailValue); // Save email for verification
//             setOtpSent(true);
//             Alert.alert(
//                 'Code Sent',
//                 'A code has been sent to your email.'
//             );
//         }
//     };
//     const handleLogin = async () => {
//         if (!otp || otp.length < 6) {
//             Alert.alert('Error', 'Please enter a valid OTP code.');
//             return;
//         }
//         setLoading(true);
//         const { data, error } = await supabase.auth.verifyOtp({
//             email: email.trim().toLowerCase(),
//             token: otp,
//             type: 'email'
//         });
//         setLoading(false);
//         if (error) {
//             Alert.alert('Error', error.message);
//         } else {
//             // Fetch complete user profile before navigating
//             const { data: profile, error: profileError } = await supabase
//                 .from('profiles') // or your user table name
//                 .select('*')
//                 .eq('id', data.user.id)
//                 .single();

//             if (profileError) {
//                 console.log('Profile fetch error:', profileError);
//                 navigation.reset({
//                     index: 0,
//                     routes: [{ name: 'ChatList', params: { user: data.user } }],
//                 });
//             } else {
//                 Alert.alert('Success', 'You have successfully logged in.');
//                 navigation.reset({
//                     index: 0,
//                     routes: [{ name: 'ChatList', params: { user: { ...data.user, ...profile } } }],
//                 });
//             }
//         }
//     };
//     return (
//         <KeyboardAvoidingView
//             behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//             style={{ flex: 1 }}
//         >
//             <ScrollView
//                 showsVerticalScrollIndicator={false}
//                 contentContainerStyle={{
//                     flexGrow: 1,
//                     justifyContent: 'center',
//                     backgroundColor: '#F7F6F1',
//                     paddingHorizontal: wp(10),
//                 }}
//                 keyboardShouldPersistTaps="handled"
//             >
//                 <View style={styles.container}>
//                     {/* Heading */}
//                     <View style={styles.logo}>
//                         <Text style={styles.title}>Forgot Password</Text>
//                         <Text style={styles.description}>
//                             Please enter your email to continue
//                         </Text>
//                     </View>

//                     <View style={styles.formContainer}>
//                         <Formik
//                             initialValues={{ email: '' }}
//                             validate={(values) => {
//                                 const errors: any = {};

//                                 if (!values.email) {
//                                     errors.email = '*Please enter email';
//                                 } else if (!/\S+@\S+\.\S+/.test(values.email)) {
//                                     errors.email = 'Invalid email format';
//                                 }

//                                 return errors;
//                             }}
//                             onSubmit={async (values, helpers) => {
//                                 helpers.setSubmitting(true);
//                                 await handleSendOtp(values.email);
//                                 helpers.setSubmitting(false);
//                             }}
//                         >
//                             {({
//                                 handleChange,
//                                 handleBlur,
//                                 handleSubmit,
//                                 values,
//                                 errors,
//                                 touched,
//                                 isSubmitting,
//                             }) => (
//                                 <>
//                                     <WWTextInput
//                                         label="Email"
//                                         placeholder="Enter email"
//                                         value={values.email}
//                                         onChangeText={handleChange('email')}
//                                         onBlur={handleBlur('email')}
//                                         editable={!otpSent}
//                                     />

//                                     {touched.email && errors.email && (
//                                         <Text style={styles.errorText}>{errors.email}</Text>
//                                     )}

//                                     {!otpSent ? (
//                                         <TouchableOpacity
//                                             style={[
//                                                 styles.signUpbtn,
//                                                 (!isValidEmail(values.email) || loading) && styles.disableButton,
//                                             ]}
//                                             onPress={() => handleSubmit()}
//                                             disabled={!isValidEmail(values.email) || loading || isSubmitting}
//                                         >
//                                             {loading || isSubmitting ? (
//                                                 <ActivityIndicator size="small" color="white" />
//                                             ) : (
//                                                 <Text style={styles.text}>Send Code</Text>
//                                             )}
//                                         </TouchableOpacity>
//                                     ) : (
//                                         <>
//                                             <WWTextInput
//                                                 label="OTP"
//                                                 placeholder="Enter OTP"
//                                                 value={otp}
//                                                 onChangeText={setOtp}
//                                                 keyboardType="number-pad"
//                                                 maxLength={8}
//                                             />

//                                             <TouchableOpacity
//                                                 style={[
//                                                     styles.signUpbtn,
//                                                     (loading || !otp) && styles.disableButton,
//                                                 ]}
//                                                 onPress={handleLogin}
//                                                 disabled={loading || !otp}
//                                             >
//                                                 {loading ? (
//                                                     <ActivityIndicator size="small" color="white" />
//                                                 ) : (
//                                                     <Text style={styles.text}>Verify Code</Text>
//                                                 )}
//                                             </TouchableOpacity>
//                                         </>
//                                     )}

//                                     <View style={styles.backContainer}>
//                                         <TouchableOpacity
//                                             onPress={() => navigation.navigate('SignIn' as never)}
//                                         >
//                                             <Text>Back to Login</Text>
//                                         </TouchableOpacity>
//                                     </View>
//                                 </>
//                             )}
//                         </Formik>
//                     </View>
//                 </View>
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// };

// export default ForgotPassword;

// const styles = StyleSheet.create({
//     container: {
//         width: '100%',
//         justifyContent: 'center',
//     },

//     logo: {
//         alignItems: 'center',
//         marginTop: -hp(24),
//     },

//     title: {
//         fontSize: 22,
//         color: '#18795B',
//         fontWeight: 'bold',
//     },

//     description: {
//         fontFamily: 'Poppins-Medium',
//         fontSize: 16,
//         color: '#505050',
//         marginTop: hp(1),
//         textAlign: 'center',
//     },

//     formContainer: {
//         width: '100%',
//         marginTop: hp(5),
//     },

//     backContainer: {
//         marginTop: hp(2),
//         alignSelf: 'center',
//         flexDirection: 'row',
//         gap: wp(1),
//         justifyContent: 'center',
//     },

//     errorText: {
//         color: 'red',
//         fontSize: 14,
//         marginTop: hp(0.5),
//     },

//     text: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: 'bold',
//     },

//     signUpbtn: {
//         width: '100%',
//         height: 50,
//         backgroundColor: 'rgba(73, 80, 184, 0.7)',
//         justifyContent: 'center',
//         alignItems: 'center',
//         borderRadius: 10,
//         marginTop: hp(2),
//     },
//     disableButton: {
//         backgroundColor: 'gray'
//     }
// });



import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ImageBackground,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../../utils/supabase';
import { Formik } from 'formik';
import { WWTextInput } from '../../components/WWTextInput';
import { hp, wp } from '../../../utils/dimention';
import { ImageName } from '../../../asserts';

const ForgotPassword: React.FC = () => {
    const navigation =
        useNavigation<StackNavigationProp<ScreenParamList>>();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSendOtp = async (emailValue: string) => {
        if (!isValidEmail(emailValue)) {
            Alert.alert('Error', 'Please enter a valid email address.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email: emailValue.trim().toLowerCase(),
            options: { shouldCreateUser: false }
        });
        setLoading(false);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setEmail(emailValue); // Save email for verification
            setOtpSent(true);
            Alert.alert(
                'Code Sent',
                'A code has been sent to your email.'
            );
        }
    };

    const handleLogin = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert('Error', 'Please enter a valid OTP code.');
            return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: otp,
            type: 'email'
        });
        setLoading(false);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Fetch complete user profile before navigating
            const { data: profile, error: profileError } = await supabase
                .from('profiles') // or your user table name
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                console.log('Profile fetch error:', profileError);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatDrawer' }],
                });
            } else {
                Alert.alert('Success', 'You have successfully logged in.');
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatDrawer' }],
                });
            }
        }
    };

    return (
        <ImageBackground
            source={ImageName.ChatBg}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View style={styles.container}>
                        {/* Header with Back Button */}
                        <View style={styles.header}>
                            <TouchableOpacity 
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <Image
                                    source={ImageName.Back}
                                    style={styles.backIcon}
                                />
                            </TouchableOpacity>
                            <View style={styles.headerTitleContainer}>
                                <Text style={styles.headerTitle}>Forgot Password</Text>
                            </View>
                            <View style={{ width: 40 }} />
                        </View>

                        {/* Icon/Illustration */}
                        <View style={styles.iconContainer}>
                            {/* <View style={styles.iconCircle}>
                                <Text style={styles.iconEmoji}>🔐</Text>
                            </View> */}
                        </View>

                        {/* Description */}
                        <Text style={styles.description}>
                            {!otpSent 
                                ? 'Enter your email address and we\'ll send you a verification code'
                                : 'Enter the verification code sent to your email'
                            }
                        </Text>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Formik
                                initialValues={{ email: '' }}
                                validate={(values) => {
                                    const errors: any = {};

                                    if (!values.email) {
                                        errors.email = '*Please enter email';
                                    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
                                        errors.email = 'Invalid email format';
                                    }

                                    return errors;
                                }}
                                onSubmit={async (values, helpers) => {
                                    helpers.setSubmitting(true);
                                    await handleSendOtp(values.email);
                                    helpers.setSubmitting(false);
                                }}
                            >
                                {({
                                    handleChange,
                                    handleBlur,
                                    handleSubmit,
                                    values,
                                    errors,
                                    touched,
                                    isSubmitting,
                                }) => (
                                    <View style={styles.formContainer}>
                                        <WWTextInput
                                            label="Email Address"
                                            placeholder="Enter your email"
                                            value={values.email}
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                            editable={!otpSent}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />

                                        {touched.email && errors.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}

                                        {!otpSent ? (
                                            <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    (!isValidEmail(values.email) || loading) && styles.disableButton,
                                                ]}
                                                onPress={() => handleSubmit()}
                                                disabled={!isValidEmail(values.email) || loading || isSubmitting}
                                            >
                                                {loading || isSubmitting ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text style={styles.buttonText}>Send Verification Code</Text>
                                                )}
                                            </TouchableOpacity>
                                        ) : (
                                            <>
                                                <WWTextInput
                                                    label="Verification Code"
                                                    placeholder="Enter 6-digit code"
                                                    value={otp}
                                                    onChangeText={setOtp}
                                                    keyboardType="number-pad"
                                                    maxLength={8}
                                                />

                                                <TouchableOpacity
                                                    style={[
                                                        styles.button,
                                                        (loading || !otp) && styles.disableButton,
                                                    ]}
                                                    onPress={handleLogin}
                                                    disabled={loading || !otp}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator size="small" color="white" />
                                                    ) : (
                                                        <Text style={styles.buttonText}>Verify & Login</Text>
                                                    )}
                                                </TouchableOpacity>

                                                {/* Resend Code Option */}
                                                <TouchableOpacity
                                                    onPress={() => handleSendOtp(email)}
                                                    style={styles.resendContainer}
                                                    disabled={loading}
                                                >
                                                    <Text style={styles.resendText}>
                                                        Didn't receive code?{' '}
                                                        <Text style={styles.resendLink}>Resend</Text>
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}

                                        {/* Back to Login */}
                                        <View style={styles.backContainer}>
                                            <TouchableOpacity
                                                onPress={() => navigation.navigate('LogIn' as never)}
                                            >
                                                <Text style={styles.backToLogin}>
                                                    ← Back to Login
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </Formik>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

export default ForgotPassword;

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    container: {
        flex: 1,
        paddingHorizontal: wp(5),
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: hp(6),
        paddingBottom: hp(2),
    },
    backButton: {
        padding: 5,
    },
    backIcon: {
        width: 35,
        height: 35,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginLeft: -40, // Compensate for back button width
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
    },

    // Icon
    iconContainer: {
        alignItems: 'center',
        marginTop: hp(15),
        marginBottom: hp(2),
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    iconEmoji: {
        fontSize: 50,
    },

    // Description
    description: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: hp(3),
        paddingHorizontal: wp(5),
        lineHeight: 22,
    },

    // Form Card
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: wp(6),
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    formContainer: {
        width: '100%',
    },

    // Error Text
    errorText: {
        color: '#E91E63',
        fontSize: 13,
        marginTop: hp(0.5),
        marginLeft: 5,
    },

    // Button
    button: {
        width: '100%',
        height: 52,
        backgroundColor: '#4238C5',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        marginTop: hp(3),
        elevation: 3,
        shadowColor: '#4238C5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    disableButton: {
        backgroundColor: '#B0B0B0',
        elevation: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Resend
    resendContainer: {
        marginTop: hp(2),
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#666',
    },
    resendLink: {
        color: '#4238C5',
        fontWeight: '600',
    },

    // Back to Login
    backContainer: {
        marginTop: hp(3),
        alignItems: 'center',
    },
    backToLogin: {
        fontSize: 15,
        color: '#4238C5',
        fontWeight: '600',
    },
});