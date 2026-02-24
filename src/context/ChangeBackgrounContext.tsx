
import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ImageName } from '../asserts'

const STORAGE_KEY = 'chat_background'

interface BackgroundContextType {
  background: any
  setBackground: (bg: any) => void
}

const ChatBackgroundContext = createContext<BackgroundContextType | undefined>(undefined)

export const ChatBackgroundProvider = ({ children }: any) => {
  const [background, setBackgroundState] = useState(ImageName.ChatBg)

  // 🔥 Load background on app start
  useEffect(() => {
    loadBackground()
  }, [])

  const loadBackground = async () => {
    try {
      const savedBg = await AsyncStorage.getItem(STORAGE_KEY)
      if (savedBg) {
        setBackgroundState(JSON.parse(savedBg))
      }
    } catch (e) {
      console.log('Failed to load background')
    }
  }

  const setBackground = async (bg: any) => {
    try {
      setBackgroundState(bg)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bg))
    } catch (e) {
      console.log('Failed to save background')
    }
  }

  return (
    <ChatBackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </ChatBackgroundContext.Provider>
  )
}

export const useChatBackground = () => {
  const context = useContext(ChatBackgroundContext)
  if (!context) throw new Error('useChatBackground must be used inside provider')
  return context
}