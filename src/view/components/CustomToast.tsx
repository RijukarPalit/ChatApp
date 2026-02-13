// toastConfig.ts
import React from 'react';
import { StyleSheet } from 'react-native';
import { BaseToast, ErrorToast } from 'react-native-toast-message';

const CustomToast = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={styles.toastContainer}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={styles.toastText}
      text2Style={styles.toastSubText}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={styles.toastContainer}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={styles.toastText}
      text2Style={styles.toastSubText}
    />
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    backgroundColor: 'rgba(10, 26, 170, 0.88)',
    borderLeftWidth: 0, // removes default green/red bar\
    borderRadius: 12,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toastSubText: {
    color: '#ddd',
    fontSize: 14,
  },
});

export default CustomToast;
