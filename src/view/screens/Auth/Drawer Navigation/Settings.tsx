import { ImageBackground, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import supabase from '../../../../utils/supabase'
import { clearAllStorage } from '../../../../utils/storage/userDetails'
import { ImageName } from '../../../../asserts'


type ScreenParamList = {
    LogIn: undefined;
};

const Settings = () => {
    const navigation = useNavigation<StackNavigationProp<ScreenParamList>>();
    const [loading, setLoading] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
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

            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();

            if (error) {
                Alert.alert('Error', 'Failed to logout. Please try again.');
                console.error('Logout error:', error);
                return;
            }

            // Clear AsyncStorage (user data and token)
            // This keeps onboarding status and remember me if needed
            await clearAllStorage();

            // Navigate to Login screen
            navigation.reset({
                index: 0,
                routes: [{ name: 'LogIn' }],
            });

        } catch (err: any) {
            console.error('Unexpected logout error:', err);
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground
            // source={require('../../../../asserts/images/Bg.png')}
            source={ImageName.Background}
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', marginTop: 50 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff' }}>Settings</Text>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity
                    style={[
                        styles.logoutButton,
                        loading && styles.logoutButtonDisabled
                    ]}
                    onPress={handleLogout}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>Logout</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ImageBackground>
    )
}

export default Settings

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    logoutButton: {
        backgroundColor: 'rgba(171, 48, 228, 0.5)',
        padding: 10,
        borderRadius: 10,
        minWidth: 120,
        alignItems: 'center',
    },
    logoutButtonDisabled: {
        backgroundColor: 'rgba(171, 48, 228, 0.3)',
    },
})