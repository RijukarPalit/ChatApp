import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import ProfileScreen from '../view/screens/Auth/Drawer Navigation/ProfileScreen'
import Settings from '../view/screens/Auth/Drawer Navigation/Settings'
import MainTabs from './MainTabs'
import About from '../view/screens/Auth/Drawer Navigation/About'
import Icon from 'react-native-vector-icons/MaterialIcons'

const Drawer = createDrawerNavigator()

const ChatDrawer = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerStyle: {
          width: '60%',
          backgroundColor: '#fff',
        },
        drawerActiveTintColor: '#4238C5',
        drawerInactiveTintColor: '#666',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      {/* MainTabs contains bottom navigation with ChatList, Status, and Profile */}
      <Drawer.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Profile accessible from side drawer */}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />

      {/* About in side drawer */}
      <Drawer.Screen
        name="About"
        component={About}
        options={{
          drawerLabel: 'About',
          drawerIcon: ({ color, size }) => (
            <Icon name="info" size={size} color={color} />
          ),
        }}
      />

      {/* Settings only in side drawer */}
      <Drawer.Screen
        name="Settings"
        component={Settings}
        options={{
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  )
}

export default ChatDrawer

