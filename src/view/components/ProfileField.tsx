import React from 'react'
import { StyleSheet, Text, View, TextInput } from 'react-native'

interface ProfileFieldProps {
    label: string
    value: string
    secure?: boolean
    editable?: boolean
    onChangeText?: (text: string) => void
}

const ProfileField = ({
    label,
    value,
    secure = false,
    editable = false,
    onChangeText,
}: ProfileFieldProps) => {
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                secureTextEntry={secure}
                editable={editable}
                onChangeText={onChangeText}
                style={[
                    styles.input,
                    !editable && styles.readOnlyInput,
                ]}
            />
        </View>
    )
}

export default ProfileField

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16
    },
    backArrow: {
        fontSize: 20
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600'
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 30
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignSelf: 'center',
        marginVertical: 20
    },
    fieldContainer: {
        marginBottom: 16,
        paddingHorizontal: 20
    },
    label: {
        fontSize: 16,
        // color: '#8E8E93',
        color: "#333",
        marginBottom: 4
    },
    input: {
        fontSize: 15,
        // color: '#000',
        color: "#212121",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA'
    },
    button: {
        marginTop: 30,
        backgroundColor: '#2F80ED',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    readOnlyInput: {
        color: '#999',
    },
})
