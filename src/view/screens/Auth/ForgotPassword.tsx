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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import supabase from '../../../utils/supabase';
import { Formik } from 'formik';
import { WWTextInput } from '../../components/WWTextInput';
import { hp, wp } from '../../../utils/dimention';

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
                    routes: [{ name: 'ChatList', params: { user: data.user } }],
                });
            } else {
                Alert.alert('Success', 'You have successfully logged in.');
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'ChatList', params: { user: { ...data.user, ...profile } } }],
                });
            }
        }
    };
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    backgroundColor: '#F7F6F1',
                    paddingHorizontal: wp(10),
                }}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.container}>
                    {/* Heading */}
                    <View style={styles.logo}>
                        <Text style={styles.title}>Forgot Password</Text>
                        <Text style={styles.description}>
                            Please enter your email to continue
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
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
                                <>
                                    <WWTextInput
                                        label="Email"
                                        placeholder="Enter email"
                                        value={values.email}
                                        onChangeText={handleChange('email')}
                                        onBlur={handleBlur('email')}
                                        editable={!otpSent}
                                    />

                                    {touched.email && errors.email && (
                                        <Text style={styles.errorText}>{errors.email}</Text>
                                    )}

                                    {!otpSent ? (
                                        <TouchableOpacity
                                            style={[
                                                styles.signUpbtn,
                                                (!isValidEmail(values.email) || loading) && styles.disableButton,
                                            ]}
                                            onPress={() => handleSubmit()}
                                            disabled={!isValidEmail(values.email) || loading || isSubmitting}
                                        >
                                            {loading || isSubmitting ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Text style={styles.text}>Send Code</Text>
                                            )}
                                        </TouchableOpacity>
                                    ) : (
                                        <>
                                            <WWTextInput
                                                label="OTP"
                                                placeholder="Enter OTP"
                                                value={otp}
                                                onChangeText={setOtp}
                                                keyboardType="number-pad"
                                                maxLength={8}
                                            />

                                            <TouchableOpacity
                                                style={[
                                                    styles.signUpbtn,
                                                    (loading || !otp) && styles.disableButton,
                                                ]}
                                                onPress={handleLogin}
                                                disabled={loading || !otp}
                                            >
                                                {loading ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text style={styles.text}>Verify Code</Text>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <View style={styles.backContainer}>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('SignIn' as never)}
                                        >
                                            <Text>Back to Login</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </Formik>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default ForgotPassword;

const styles = StyleSheet.create({
    container: {
        width: '100%',
        justifyContent: 'center',
    },

    logo: {
        alignItems: 'center',
        marginTop: -hp(24),
    },

    title: {
        fontSize: 22,
        color: '#18795B',
        fontWeight: 'bold',
    },

    description: {
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        color: '#505050',
        marginTop: hp(1),
        textAlign: 'center',
    },

    formContainer: {
        width: '100%',
        marginTop: hp(5),
    },

    backContainer: {
        marginTop: hp(2),
        alignSelf: 'center',
        flexDirection: 'row',
        gap: wp(1),
        justifyContent: 'center',
    },

    errorText: {
        color: 'red',
        fontSize: 14,
        marginTop: hp(0.5),
    },

    text: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },

    signUpbtn: {
        width: '100%',
        height: 50,
        backgroundColor: 'rgba(73, 80, 184, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginTop: hp(2),
    },
    disableButton: {
        backgroundColor: 'gray'
    }
});