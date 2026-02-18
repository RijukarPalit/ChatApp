import React from 'react'
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
    TextStyle
} from 'react-native'
import Icon from 'react-native-vector-icons/Feather'

interface SettingsItemProps {
    title: string
    leftIcon?: string
    rightIcon?: string
    onPress?: () => void
    width?: number | string
    height?: number
    backgroundColor?: string
    containerStyle?: ViewStyle
    textStyle?: TextStyle
    iconColor?: string
}

const SettingsItem: React.FC<SettingsItemProps> = ({
    title,
    leftIcon = 'bell',
    rightIcon = 'chevron-right',
    onPress,
    width = '100%',
    height = 65,
    backgroundColor = '#fff',
    // backgroundColor = 'rgba(59, 201, 130, 0.45)',
    containerStyle,
    textStyle,
    iconColor = '#444',
}) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.container,
                {
                    width: width as import('react-native').DimensionValue,
                    height: height as import('react-native').DimensionValue,
                    backgroundColor,
                },
                containerStyle,
            ]}
        >
            <View style={styles.leftSection}>
                {leftIcon && (
                    <Icon name={leftIcon} size={22} color={iconColor} />
                )}
                <Text style={[styles.title, textStyle]}>
                    {title}
                </Text>
            </View>

            {rightIcon && (
                <Icon name={rightIcon} size={25} color="#999" />
            )}
        </TouchableOpacity>
    )
}

export default SettingsItem
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderRadius: 12,
        backgroundColor: '#4238C5'
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        letterSpacing: 0.2,
    },
})
