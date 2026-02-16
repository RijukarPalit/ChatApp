import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import ProfileScreen from '../view/screens/Auth/Drawer Navigation/ProfileScreen'
import Settings from '../view/screens/Auth/Drawer Navigation/Settings'
import MainTabs from './MainTabs'

const Drawer = createDrawerNavigator()

const ChatDrawer = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
      }}
    >
      {/* MainTabs contains bottom navigation with ChatList, Status, and Profile */}
      <Drawer.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{
          drawerLabel: 'Home',
        }}
      />
      
      {/* Profile accessible from side drawer */}
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          drawerLabel: 'Profile',
        }}
      />
      
      {/* Settings only in side drawer */}
      <Drawer.Screen 
        name="Settings" 
        component={Settings}
        options={{
          drawerLabel: 'Settings',
        }}
      />
    </Drawer.Navigator>
  )
}

export default ChatDrawer