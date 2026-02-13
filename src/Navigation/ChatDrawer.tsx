import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { View, Text } from 'react-native'
import ChatList from '../view/screens/Auth/Drawer Navigation/ChatList'
import ProfileScreen from '../view/screens/Auth/Drawer Navigation/ProfileScreen'
import Settings from '../view/screens/Auth/Drawer Navigation/Settings'

const Drawer = createDrawerNavigator()

const ChatDrawer = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
      }}
    >
      <Drawer.Screen name="ChatList" component={ChatList} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name = 'Settings' component={Settings} />

    </Drawer.Navigator>
  )
}

export default ChatDrawer
