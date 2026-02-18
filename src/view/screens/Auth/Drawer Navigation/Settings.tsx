import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    Text,
    View,
    Alert,
    ActivityIndicator,
    Image,
    ScrollView,
    ImageBackground
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import supabase from '../../../../utils/supabase'
import { clearAllStorage } from '../../../../utils/storage/userDetails'
import Icon from 'react-native-vector-icons/Feather'
import SettingsItem from '../../../components/SettingsItem'
import { ImageName } from '../../../../asserts'

type ScreenParamList = {
    LogIn: undefined;
};

const Settings = () => {
    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();

    const [loading, setLoading] = useState(false)
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')

    /* ================= FETCH USER ================= */
    const fetchUserProfile = async () => {
        try {
            const { data: authData, error: authError } =
                await supabase.auth.getUser()

            if (authError || !authData?.user) {
                console.log('Auth error:', authError)
                return
            }

            const { data, error } = await supabase
                .from('user')
                .select('firstName, lastName, email, profileImage')
                .eq('id', authData.user.id)
                .single()

            if (error) {
                console.log('Fetch error:', error)
                return
            }

            setFirstName(data?.firstName || '')
            setLastName(data?.lastName || '')
            setEmail(data?.email || '')
            setProfileImage(data?.profileImage || null)

        } catch (err) {
            console.log('Unexpected error:', err)
        }
    }

    useEffect(() => {
        fetchUserProfile()
    }, [])

    /* ================= LOGOUT ================= */
    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await performLogout();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const performLogout = async () => {
        try {
            setLoading(true);

            const { error } = await supabase.auth.signOut();
            if (error) {
                Alert.alert('Error', 'Failed to logout.');
                return;
            }

            await clearAllStorage();

            navigation.reset({
                index: 0,
                routes: [{ name: 'LogIn' }],
            });

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            source={ImageName.ChatBg}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false}>

                    {/* Header */}
                    <Text style={styles.header}>Settings</Text>

                    {/* Profile Section */}
                    <View style={styles.profileContainer}>
                        <Image
                            source={
                                profileImage
                                    ? { uri: profileImage }
                                    : ImageName.Profile
                            }
                            style={styles.avatar}
                        />

                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>
                                {firstName && lastName
                                    ? `${firstName} ${lastName}`
                                    : 'User Name'}
                            </Text>
                            <Text style={styles.email}>
                                {email || 'email@example.com'}
                            </Text>
                        </View>

                        <Icon name="edit-2" size={18} color="#444" />
                    </View>

                    {/* Preferences */}
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <SettingsItem
                        title="Notifications"
                        leftIcon="bell"
                        onPress={() => console.log('Notifications pressed')}
                        containerStyle={{ marginBottom: 10 }}
                    />

                    <SettingsItem
                        title="Change Password"
                        leftIcon="lock"
                        onPress={() => navigation.navigate('ForgotPassword' as never)}
                        containerStyle={{ marginBottom: 10 }}
                    />

                    <SettingsItem
                        title="Change Background"
                        leftIcon="image"
                        onPress={() => navigation.navigate('ChangeBackground' as never)}
                        containerStyle={{ marginBottom: 10 }}
                    />

                    <Text style={styles.sectionTitle}>Support & Information</Text>
                    <SettingsItem
                        title="Terms & Conditions"
                        leftIcon="file-text"
                        onPress={() => navigation.navigate('TermsCondition' as never)}
                        containerStyle={{ marginBottom: 10 }}
                    />

                    <SettingsItem
                        title="About Us"
                        leftIcon="info"
                        onPress={() => navigation.navigate('About' as never)}
                        containerStyle={{ marginBottom: 10 }}
                    />


                    {/* Logout */}
                    <Text style={styles.sectionTitle}>Account & Management</Text>
                    <SettingsItem
                        title="Log Out"
                        leftIcon="log-out"
                        rightIcon={undefined}
                        textStyle={{ color: 'red', fontWeight: '600' }}
                        iconColor="red"
                        onPress={handleLogout}
                    />

                </ScrollView>
            </View>
        </ImageBackground>
    )
}

export default Settings



const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#E6EFF1',
        paddingHorizontal: 20,
        paddingTop: 50,
    },
    header: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginRight: 15,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    email: {
        fontSize: 13,
        color: '#666',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    statCard: {
        flex: 0.48,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
    },
    statText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 10,
    },
    sectionBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        marginLeft: 12,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
    },
    logoutContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
    },
    logoutText: {
        color: 'red',
        fontSize: 15,
        fontWeight: '600',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
})