


import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { launchImageLibrary,launchCamera } from 'react-native-image-picker'
import ProfileField from '../../../components/ProfileField'
import supabase from '../../../../utils/supabase'
import { decode } from 'base64-arraybuffer'
import { ImageName } from '../../../../asserts'

const ProfileScreen = () => {
  const navigation = useNavigation<StackNavigationProp<ScreenParamList>>()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [location, setLocation] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
   const [showImageOptions, setShowImageOptions] = useState(false)

  /* ================= FETCH USER PROFILE ================= */
  const fetchUserProfile = async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData?.user) {
        console.log('Auth error:', authError)
        return
      }

      const { data, error } = await supabase
        .from('user')
        .select('firstName, lastName, email, city, location, profileImage')
        .eq('id', authData.user.id)
        .single()

      if (error) {
        console.log('Profile fetch error:', error)
        return
      }

      console.log('Fetched profile:', data)

      setFirstName(data?.firstName || '')
      setLastName(data?.lastName || '')
      setEmail(data?.email || '')
      setCity(data?.city || '')
      setLocation(data?.location || '')
      setProfileImage(data?.profileImage || null)
    } catch (err) {
      console.log('Unexpected error:', err)
    }
  }
  

  /* ================= PICK IMAGE ================= */
  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1000,
        maxHeight: 1000,
        includeBase64: true,
      })

      if (result.didCancel) {
        console.log('User cancelled image picker')
        return
      }

      if (result.errorCode) {
        console.log('ImagePicker Error: ', result.errorMessage)
        Alert.alert('Error', result.errorMessage || 'Failed to pick image')
        return
      }

      if (result.assets && result.assets[0] && result.assets[0].base64) {
        await uploadImage(result.assets[0].base64, result.assets[0].uri || '')
      }
    } catch (error) {
      console.log('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }


  /* ================= TAKE PHOTO FROM CAMERA ================= */
  const takePhotoFromCamera = async () => {
    setShowImageOptions(false)
    
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1000,
        maxHeight: 1000,
        includeBase64: true,
        saveToPhotos: true,
      })

      if (result.didCancel) {
        console.log('User cancelled camera')
        return
      }

      if (result.errorCode) {
        console.log('Camera Error: ', result.errorMessage)
        Alert.alert('Error', result.errorMessage || 'Failed to take photo')
        return
      }

      if (result.assets && result.assets[0] && result.assets[0].base64) {
        await uploadImage(result.assets[0].base64, result.assets[0].uri || '')
      }
    } catch (error) {
      console.log('Camera error:', error)
      Alert.alert('Error', 'Failed to take photo')
    }
  }

  /* ================= UPLOAD IMAGE TO SUPABASE ================= */
  const uploadImage = async (base64: string, uri: string) => {
    try {
      setUploadingImage(true)

      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) {
        Alert.alert('Error', 'User not authenticated')
        return
      }

      // Create unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `${authData.user.id}/${Date.now()}.${fileExt}`

      // Decode base64 to array buffer
      const arrayBuffer = decode(base64)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        })

      if (uploadError) {
        console.log('Upload error:', uploadError)
        Alert.alert('Error', `Failed to upload: ${uploadError.message}`)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Update database
      const { error: dbError } = await supabase
        .from('user')
        .update({ profileImage: publicUrl })
        .eq('id', authData.user.id)

      if (dbError) {
        console.log('Database update error:', dbError)
        Alert.alert('Error', 'Failed to save image')
        return
      }

      setProfileImage(publicUrl)
      Alert.alert('Success', 'Profile image updated!')
    } catch (error: any) {
      console.log('Upload failed:', error)
      Alert.alert('Error', error?.message || 'Something went wrong')
    } finally {
      setUploadingImage(false)
    }
  }

  /* ================= UPDATE PROFILE ================= */
  const updateProfile = async () => {
    try {
      setLoading(true)

      const { data: authData } = await supabase.auth.getUser()
      if (!authData?.user) return

      const { error } = await supabase
        .from('user')
        .update({
          firstName,
          lastName,
          city,
          location,
        })
        .eq('id', authData.user.id)

      if (error) {
        console.log('Update error:', error)
        Alert.alert('Error', 'Failed to update profile')
        return
      }

      Alert.alert('Success', 'Profile updated!')
      setIsEditing(false)
    } catch (err) {
      console.log('Update failed:', err)
      Alert.alert('Error', 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  /* ================= LOAD DATA ON OPEN ================= */
  useEffect(() => {
    fetchUserProfile()
  }, [])

  return (
    <ImageBackground
      //source={require('../../../../asserts/images/Bg.png')}
      source={ImageName.ChatBg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image
                  // source={require('../../../../asserts/images/back.png')}
                  source={ImageName.Back}
                  style={styles.backicon}
                />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Profile</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Avatar with Upload */}
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
              disabled={uploadingImage}
            >
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    // : require('../../../../asserts/images/profile.jpg')
                    : ImageName.Profile
                }
                style={styles.avatar}
              />

              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconContainer}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.cameraIcon}>📷</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Fields */}
            <ProfileField
              label="First Name"
              value={firstName}
              editable={isEditing}
              onChangeText={setFirstName}
            />

            <View style={styles.sperator} />

            <ProfileField
              label="Last Name"
              value={lastName}
              editable={isEditing}
              onChangeText={setLastName}
            />

            <View style={styles.sperator} />

            <ProfileField label="Email" value={email} editable={false} />

            <View style={styles.sperator} />

            <ProfileField
              label="City"
              value={city}
              editable={isEditing}
              onChangeText={setCity}
            />

            <View style={styles.sperator} />

            <ProfileField
              label="Location"
              value={location}
              editable={isEditing}
              onChangeText={setLocation}
            />

            <View style={styles.sperator} />

            {/* Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={isEditing ? updateProfile : () => setIsEditing(true)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Profile'
                    : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  )
}

export default ProfileScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
sperator: {
  height: 1,
  backgroundColor: '#ccc',
  marginHorizontal: 20,
  marginTop: -5,
  bottom: 10,
  // marginVertical: 10,
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 45,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4950B8',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4950B8',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    height: 50,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backicon: {
    width: 40,
    height: 40,
    marginLeft: -10,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
})