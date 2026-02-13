import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  StyleProp,
  ViewStyle,
  TextInputProps as RNTextInputProps,
  Animated,
  Easing,
  Keyboard,
  TouchableWithoutFeedback,
  View,
  Text,
} from "react-native";

export type InputFieldProps = RNTextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
};

export const WWTextInput: React.FC<InputFieldProps> = ({
  label,
  value = "",
  error,
  required,
  style,
  onChangeText,
  isPassword,
  leftIcon,
  rightIcon,
  placeholder,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: error ? 2 : isFocused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isFocused, error]);

  const animatedBorderStyle = {
    borderColor: borderAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: ["#E0E0E0", "#15AE99", "#E53935"],
    }),
    borderWidth: borderAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [1, 2, 2],
    }),
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, style]}>
        {/* Label */}
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        {/* Input */}
        <Animated.View
          style={[
            styles.inputContainer,
            animatedBorderStyle,
            styles.flexRow,
            inputStyle,
          ]}
        >
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword}
            placeholder={placeholder}
            placeholderTextColor="#9E9E9E"
            style={styles.input}
            {...props}
          />

          {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
        </Animated.View>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 8,
  },

  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  required: {
    color: "#E53935",
  },

  inputContainer: {
    borderRadius: 24,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    minHeight: 50,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#212121",
    paddingVertical: 12,
  },

  icon: {
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: "#E53935",
  },

  flexRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
