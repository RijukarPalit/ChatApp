import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
export const STORAGE_KEYS = {
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  REMEMBER_ME: 'rememberMe',
  SAVED_EMAIL: 'savedEmail',
};

// Onboarding
export const setOnboardingComplete = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
  } catch (error) {
    console.error('Error saving onboarding status:', error);
  }
};

export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// User Authentication
export const saveUserToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
  } catch (error) {
    console.error('Error saving user token:', error);
  }
};

export const getUserToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
};

export const removeUserToken = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
  } catch (error) {
    console.error('Error removing user token:', error);
  }
};

// User Data
export const saveUserData = async (userData: any) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const removeUserData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error('Error removing user data:', error);
  }
};

// Remember Me functionality
export const saveRememberMe = async (email: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, email);
  } catch (error) {
    console.error('Error saving remember me:', error);
  }
};

export const clearRememberMe = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
  } catch (error) {
    console.error('Error clearing remember me:', error);
  }
};

export const getRememberMe = async (): Promise<{ remember: boolean; email: string | null }> => {
  try {
    const remember = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    const email = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
    return {
      remember: remember === 'true',
      email: email || null,
    };
  } catch (error) {
    console.error('Error getting remember me:', error);
    return { remember: false, email: null };
  }
};

// Clear all data (Logout)
export const clearAllStorage = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
    // Keep onboarding and remember me if needed
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

// Clear everything including onboarding (for testing)
export const clearEverything = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};