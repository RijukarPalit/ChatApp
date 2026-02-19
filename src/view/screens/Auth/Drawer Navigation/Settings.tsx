import React, { useState, useEffect, useRef } from 'react'
import {
    StyleSheet,
    Text,
    View,
    Alert,
    ActivityIndicator,
    Image,
    ScrollView,
    ImageBackground,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet'
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

    const actionSheetRef = useRef<ActionSheetRef>(null)

    const [loading, setLoading] = useState(false)
    const [profileImage, setProfileImage] = useState<string | null>(null)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')

    // Edit form state
    const [editFirstName, setEditFirstName] = useState('')
    const [editLastName, setEditLastName] = useState('')
    const [editEmail, setEditEmail] = useState('')
    const [saving, setSaving] = useState(false)

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

    /* ================= OPEN EDIT SHEET ================= */
    const openEditSheet = () => {
        setEditFirstName(firstName)
        setEditLastName(lastName)
        setEditEmail(email)
        actionSheetRef.current?.show()
    }

    /* ================= SAVE PROFILE ================= */
    const handleSaveProfile = async () => {
        if (!editFirstName.trim() || !editLastName.trim()) {
            Alert.alert('Validation', 'First name and last name cannot be empty.')
            return
        }

        try {
            setSaving(true)

            const { data: authData, error: authError } = await supabase.auth.getUser()
            if (authError || !authData?.user) {
                Alert.alert('Error', 'Unable to get current user.')
                return
            }

            const { error } = await supabase
                .from('user')
                .update({
                    firstName: editFirstName.trim(),
                    lastName: editLastName.trim(),
                    email: editEmail.trim(),
                })
                .eq('id', authData.user.id)

            if (error) {
                Alert.alert('Error', 'Failed to update profile.')
                return
            }

            setFirstName(editFirstName.trim())
            setLastName(editLastName.trim())
            setEmail(editEmail.trim())

            actionSheetRef.current?.hide()
            Alert.alert('Success', 'Profile updated successfully.')

        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong')
        } finally {
            setSaving(false)
        }
    }

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

                        <Icon
                            name="edit"
                            size={22}
                            color="#444"
                            style={styles.editIcon}
                            onPress={openEditSheet}
                        />
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

            {/* ================= EDIT PROFILE ACTION SHEET ================= */}
            <ActionSheet
                ref={actionSheetRef}
                gestureEnabled={true}
                indicatorStyle={styles.sheetHandle}
                containerStyle={styles.sheet}
                keyboardHandlerEnabled={true}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    {/* Title Row */}
                    <View style={styles.sheetTitleRow}>
                        <Text style={styles.sheetTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={() => actionSheetRef.current?.hide()}>
                            <Icon name="x" size={22} color="#444" />
                        </TouchableOpacity>
                    </View>

                    {/* First Name */}
                    <Text style={styles.inputLabel}>First Name</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="user" size={16} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={editFirstName}
                            onChangeText={setEditFirstName}
                            placeholder="First name"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {/* Last Name */}
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="user" size={16} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={editLastName}
                            onChangeText={setEditLastName}
                            placeholder="Last name"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {/* Email */}
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <Icon name="mail" size={16} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.nonEditableInput}
                            value={editEmail}
                            onChangeText={setEditEmail}
                            placeholder="Email"
                            placeholderTextColor="#aaa"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={false}
                        />
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.saveBtnText}>Save Changes</Text>
                        }
                    </TouchableOpacity>

                </KeyboardAvoidingView>
            </ActionSheet>

        </ImageBackground>
    )
}

export default Settings

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 50,
    },
    editIcon: {
        right: 5,
        top: 0,
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
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 10,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },

    /* ── ActionSheet ── */
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 4,
        backgroundColor: '#fff',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 4,
    },
    sheetTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: 46,
        fontSize: 14,
        // color: '#999',
        color: '#333',
    },
    nonEditableInput: {
        flex: 1,
        height: 46,
        fontSize: 14,
        color: '#999',
    },
    saveBtn: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
})