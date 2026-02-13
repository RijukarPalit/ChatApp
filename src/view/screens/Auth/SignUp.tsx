
import React, { useEffect, useRef, useState } from 'react'
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
    ActivityIndicator,
} from 'react-native'
import { Formik } from 'formik'
import * as Yup from 'yup';

import { hp, wp } from '../../../utils/dimention'
import { WWTextInput } from '../../components/WWTextInput'
import Toast from 'react-native-toast-message';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Geolocation from '@react-native-community/geolocation';
import Geocoder from 'react-native-geocoding';
import supabase from '../../../utils/supabase';
import ChatList from './Drawer Navigation/ChatList';
import LogIn from './LogIn';
import { ImageBackground } from 'react-native';
import { ImageName } from '../../../asserts';


const SignUp = () => {

    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();

    const [isSecureTextEntry, setIsSecureTextEntry] = useState(true)
    const [lat, setLatitude] = useState(0);
    const [long, setLongitude] = useState(0);
    const [region, setRegion] = useState({
        latitude: 0.5733796,
        longitude: 0.4282626,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    const [loading, setLoading] = useState(false);


    const userSchema = Yup.object().shape({
        firstName: Yup.string().required('*Please Enter First Name'),
        lastName: Yup.string().required('*Please Enter Last Name'),
        email: Yup.string().email('Invalid email').required('*Please Enter Email'),
        location: Yup.string().required('*Please Enter Location'),
        city: Yup.string().required('*Please Enter City'),
        password: Yup.string().required('*Please Enter Password').min(6, 'Password must be at least 6 characters'),
        confirmPassword: Yup.string()
            .required('*Please Confirm Password')
            .oneOf([Yup.ref('password')], 'Passwords must match'),
    });

    const handleSignUp = async (values: any) => {
        try {
            setLoading(true);

            const {
                firstName,
                lastName,
                email,
                location,
                city,
                password,
            } = values;

            const normalizedEmail = email.trim().toLowerCase();

            // Step 1: Create auth user
            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password.trim(),
                options: {
                    data: {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        location: location.trim(),
                        city: city.trim(),
                    },
                },
            });

            if (error) {
                setLoading(false);
                Toast.show({
                    type: 'error',
                    text1: 'Signup Failed',
                    text2: error.message,
                    position: 'top',
                });
                return;
            }

            const userId = data?.user?.id;

            if (!userId) {
                setLoading(false);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No user ID returned',
                    position: 'top',
                });
                return;
            }

            const { error: profileError } = await supabase
                .from('user')
                .insert({
                    id: userId,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: normalizedEmail,
                    location: location.trim(),
                    city: city.trim(),
                    created_at: new Date().toISOString(),
                });

            if (profileError) {
                // If it's a duplicate key error, just continue (user already exists)
                if (profileError.code === '23505') {
                    console.log('User already exists, continuing...');
                } else {
                    // Other errors - show to user
                    setLoading(false);
                    console.error('Profile error:', profileError);
                    Toast.show({
                        type: 'error',
                        text1: 'Profile Save Failed',
                        text2: profileError.message,
                        position: 'top',
                    });
                    return;
                }
            }

            setLoading(false);

            Toast.show({
                type: 'success',
                text1: 'Signup Successful',
                text2: 'Please verify your email',
                position: 'top',
            });

            navigation.navigate('LogIn' as any);

        } catch (err: any) {
            setLoading(false);
            console.error(err);

            Toast.show({
                type: 'error',
                text1: 'Unexpected Error',
                text2: err.message || 'Something went wrong',
            });
        }
    };


    const handleForgot = () => {
        console.log('Forgot password')
    }

    const handleSignin = () => {
        console.log('Signup pressed')
        navigation.navigate('LogIn')
    }

    const handleGoogleSignIn = () => {
        console.log('Google sign in')
    }

    // for location
    useEffect(() => {
        requestLocationPermission();
    }, [])
    const requestLocationPermission = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message:
                        'Cool Location App needs access to your location ' +
                        'so you can find nearby cool places.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('You can use the Location');
            } else {
                console.log('Location permission denied');
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const getCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                console.log("latitude >>>>>>>>", latitude, "longitude >>>>>>>>", longitude);

                setLatitude(latitude);
                setLongitude(longitude);

                setRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            },
            (error) => {
                console.log(error.code, error.message);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

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
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.container}>
                        {/* Header Section */}
                        <View style={styles.headerSection}>
                            <View >
                                {/* <Text style={styles.logoText}>✨</Text> */}
                            </View>
                            <Text style={styles.title}>Create Account</Text>
                            <Text style={styles.description}>
                                Join us and start your journey today
                            </Text>
                        </View>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <Formik
                                initialValues={{
                                    email: '',
                                    firstName: '',
                                    lastName: '',
                                    password: '',
                                    confirmPassword: '',
                                    location: '',
                                    city: '',
                                }}
                                validationSchema={userSchema}
                                onSubmit={handleSignUp}
                            >
                                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                    <>
                                        <View style={styles.nameRow}>
                                            <View style={styles.nameInputContainer}>
                                                <WWTextInput
                                                    label="First Name"
                                                    placeholder="First Name"
                                                    value={values.firstName}
                                                    onChangeText={handleChange('firstName')}
                                                    onBlur={handleBlur('firstName')}
                                                />
                                                {touched.firstName && errors.firstName && (
                                                    <Text style={styles.errorText}>{errors.firstName}</Text>
                                                )}
                                            </View>

                                            <View style={styles.nameInputContainer}>
                                                <WWTextInput
                                                    label="Last Name"
                                                    placeholder="Last Name"
                                                    value={values.lastName}
                                                    onChangeText={handleChange('lastName')}
                                                    onBlur={handleBlur('lastName')}
                                                />
                                                {touched.lastName && errors.lastName && (
                                                    <Text style={styles.errorText}>{errors.lastName}</Text>
                                                )}
                                            </View>
                                        </View>

                                        <WWTextInput
                                            label="Email"
                                            placeholder="your.email@example.com"
                                            value={values.email}
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                        />
                                        {touched.email && errors.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}

                                        <WWTextInput
                                            label="Password"
                                            placeholder="Create a strong password"
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
                                                        {/* {isSecureTextEntry ? 'show' : 'hide'} */}
                                                        {isSecureTextEntry ? <Image source={require('../../../asserts/images/eyeClose.png')} style={styles.eyeIcon} /> : <Image source={require('../../../asserts/images/eye.png')} style={styles.eyeIcon} />}
                                                    </Text>
                                                </TouchableOpacity>
                                            }
                                        />
                                        {touched.password && errors.password && (
                                            <Text style={styles.errorText}>{errors.password}</Text>
                                        )}

                                        <WWTextInput
                                            label="Confirm Password"
                                            placeholder="Re-enter your password"
                                            value={values.confirmPassword}
                                            secureTextEntry={isSecureTextEntry}
                                            onChangeText={handleChange('confirmPassword')}
                                            onBlur={handleBlur('confirmPassword')}
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
                                        {touched.confirmPassword && errors.confirmPassword && (
                                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                                        )}

                                        <View style={styles.locationRow}>
                                            <View style={styles.locationInputContainer}>
                                                <WWTextInput
                                                    label="City"
                                                    placeholder="Your city"
                                                    value={values.city}
                                                    onChangeText={handleChange('city')}
                                                    onBlur={handleBlur('city')}
                                                />
                                                {touched.city && errors.city && (
                                                    <Text style={styles.errorText}>{errors.city}</Text>
                                                )}
                                            </View>

                                            <View style={styles.locationInputContainer}>
                                                <WWTextInput
                                                    label="Location"
                                                    placeholder="State/Country"
                                                    value={values.location}
                                                    onChangeText={handleChange('location')}
                                                    onBlur={handleBlur('location')}
                                                />
                                                {touched.location && errors.location && (
                                                    <Text style={styles.errorText}>{errors.location}</Text>
                                                )}
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.signUpBtn, loading && styles.signUpBtnDisabled]}
                                            onPress={handleSubmit as any}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <>
                                                    <Text style={styles.signUpBtnText}>Create Account</Text>
                                                    <Text style={styles.signUpBtnIcon}>→</Text>
                                                </>
                                            )}
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

                            {/* Social Login */}
                            <TouchableOpacity
                                style={styles.googleButton}
                                onPress={handleGoogleSignIn}
                            >
                                <Image
                                    // source={require('../../../asserts/images/google.png')}
                                    source={ImageName.Google}
                                    style={styles.googleIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.googleButtonText}>Sign up with Google</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <TouchableOpacity onPress={handleSignin}>
                                <Text style={styles.signInLink}> Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    )
}

export default SignUp


const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: hp(15),
    },
    container: {
        // flex: 1,
        paddingHorizontal: wp(5),
        paddingTop: hp(8),
        paddingBottom: hp(15),
        minHeight: hp(100),
    },

    // Header Section
    headerSection: {
        alignItems: 'center',
        marginBottom: hp(3),
        paddingTop: hp(2),
    },
    logoCircle: {
        width: wp(16),
        height: wp(16),
        borderRadius: wp(8),
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: hp(1),
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    description: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.95,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Form Card
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 24,
        padding: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },

    // Name Row
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: wp(3),
    },
    nameInputContainer: {
        flex: 1,
    },

    // Location Row
    locationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: wp(3),
    },
    locationInputContainer: {
        flex: 1,
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

    // Sign Up Button
    signUpBtn: {
        width: '100%',
        height: hp(6.5),
        backgroundColor: '#00A3FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        marginTop: hp(3),
        flexDirection: 'row',
        shadowColor: '#00A3FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    signUpBtnDisabled: {
        backgroundColor: '#B0E0FF',
        shadowOpacity: 0.1,
    },
    signUpBtnText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: wp(2),
    },
    signUpBtnIcon: {
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
    eyeIcon: {
        width: wp(5),
        height: wp(5),
    },

    // Footer
    footer: {
        marginTop: hp(3),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '500',
    },
    signInLink: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
})