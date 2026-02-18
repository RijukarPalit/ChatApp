import React, { createContext, useState, useContext } from 'react';
import { ImageSourcePropType } from 'react-native';
import { ImageName } from '../asserts';
interface BackgroundContextType {
  background: ImageSourcePropType;
  setBackground: (bg: ImageSourcePropType) => void;
}

const ChatBackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const ChatBackgroundProvider = ({ children }: any) => {
  const [background, setBackground] = useState<ImageSourcePropType>(ImageName.ChatBg);

  return (
    <ChatBackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </ChatBackgroundContext.Provider>
  );
};

export const useChatBackground = () => {
  const context = useContext(ChatBackgroundContext);
  if (!context) {
    throw new Error('useChatBackground must be used inside ChatBackgroundProvider');
  }
  return context;
};
