import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, StyleSheet, View, Image } from 'react-native'
import ChatList from '../view/screens/Auth/Drawer Navigation/ChatList'
import ProfileScreen from '../view/screens/Auth/Drawer Navigation/ProfileScreen'
import Status from '../view/screens/Auth/MainTabs/Status'
import { ImageName } from '../asserts'
import Settings from '../view/screens/Auth/Drawer Navigation/Settings'
// import Status from '../view/screens/Auth/MainTabs/Status'

const Tab = createBottomTabNavigator()

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#4238C5',
                tabBarInactiveTintColor: '#8E8E93',
                tabBarLabelStyle: styles.tabBarLabel,
            }}
        >
            <Tab.Screen
                name="Chats"
                component={ChatList}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Image
                                // source={require('../../../../asserts/images/back.png')}
                                source={ImageName.ChatIcon}
                                style={[styles.chatIcon]}
                            // style={[styles.iconText, { color }]}
                            />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Status"
                component={Status}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Image
                                source={ImageName.StatusIcon}
                                style={[styles.chatIcon]}
                            // style={[styles.iconText, { color }]}
                            />
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Image
                                // source={require('../../../../asserts/images/back.png')}
                                source={ImageName.Profile}
                                style={[styles.ProfileIcon]}
                            // style={[styles.iconText, { color }]}
                            />
                        </View>
                    ),
                }}
            />

             <Tab.Screen
                name="Settings"
                component={Settings}
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Image
                                // source={require('../../../../asserts/images/back.png')}
                                source={ImageName.SettingsImg}
                                style={[styles.chatIcon]}
                            // style={[styles.iconText, { color }]}
                            />
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    )
}

export default MainTabs

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerActive: {
        transform: [{ scale: 1.1 }],
    },
    iconText: {
        fontSize: 24,
    },
    chatIcon: {
        width: 24,
        height: 24
    },
    ProfileIcon: {
        width: 35,
        height: 35
    }
})