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
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'
import ProfileField from '../../../components/ProfileField'
import supabase from '../../../../utils/supabase'
import { decode } from 'base64-arraybuffer'
import { ImageName } from '../../../../asserts'
import { clearAllStorage } from '../../../../utils/storage/userDetails'

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


  useEffect(() => {
    fetchUserProfile()
  }, [])

  /* ================= FETCH USER PROFILE ================= */
 const fetchUserProfile = async () => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) return;

    const { data, error } = await supabase
      .from('user')
      .select('firstName, lastName, email, city, location, profileImage')
      .eq('id', authData.user.id)
      .single();

    if (error) {
      console.log('Profile fetch error:', error);
      return;
    }

    // Google metadata fallback if DB fields are empty
    const meta = authData.user.user_metadata;
    const fullName = meta?.full_name || '';
    const nameParts = fullName.split(' ');

    setFirstName(data?.firstName || meta?.given_name || nameParts[0] || '');
    setLastName(data?.lastName  || meta?.family_name || nameParts.slice(1).join(' ') || '');
    setEmail(data?.email || authData.user.email || '');
    setCity(data?.city || '');
    setLocation(data?.location || '');
    setProfileImage(data?.profileImage || meta?.avatar_url || null);

  } catch (err) {
    console.log('Unexpected error:', err);
  }
};


  /* ================= PICK IMAGE ================= */
  const pickImage = async () => {
    // Only allow image picking when in edit mode
    if (!isEditing) {
      Alert.alert('Info', 'Please click "Edit Profile" first to change your profile picture')
      return
    }

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

    // Only allow camera when in edit mode
    if (!isEditing) {
      Alert.alert('Info', 'Please click "Edit Profile" first to change your profile picture')
      return
    }

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

  /* ================= LogOut ================= */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await performLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      setLoading(true);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert('Error', 'Failed to logout. Please try again.');
        console.error('Logout error:', error);
        return;
      }

      // Clear AsyncStorage (user data and token)
      // This keeps onboarding status and remember me if needed
      await clearAllStorage();

      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'LogIn' }],
      });

    } catch (err: any) {
      console.error('Unexpected logout error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      //source={require('../../../../asserts/images/Bg.png')}
      source={ImageName.ChatBg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
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
              disabled={uploadingImage || !isEditing}
              activeOpacity={isEditing ? 0.7 : 1}
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

              {/* Camera Icon Overlay - Only show when editing */}
              {isEditing && (
                <View style={styles.cameraIconContainer}>
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.cameraIcon}>📷</Text>
                  )}
                </View>
              )}

              {/* Edit Indicator when not in edit mode
              {!isEditing && (
                <View style={styles.lockedIndicator}>
                  <Text style={styles.lockedIcon}>🔒</Text>
                </View>
              )} */}
            </TouchableOpacity>

            {/* User Name Display */}
            <Text style={styles.userName}>
              {firstName && lastName ? `${firstName} ${lastName}` : 'User Name'}
            </Text>
            <Text style={styles.userEmail}>{email || 'email@example.com'}</Text>

            {/* White Card Container */}
            <View style={styles.formCard}>
              {/* Fields */}
              <ProfileField
                label="First Name"
                value={firstName}
                editable={isEditing}
                onChangeText={setFirstName}
              />

              <View style={styles.separator} />

              <ProfileField
                label="Last Name"
                value={lastName}
                editable={isEditing}
                onChangeText={setLastName}
              />

              <View style={styles.separator} />

              <ProfileField label="Email" value={email} editable={false} />

              <View style={styles.separator} />

              <ProfileField
                label="City"
                value={city}
                editable={isEditing}
                onChangeText={setCity}
              />

              <View style={styles.separator} />

              <ProfileField
                label="Location"
                value={location}
                editable={isEditing}
                onChangeText={setLocation}
              />

              <View style={styles.separator} />

              {/* Edit/Update Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={isEditing ? updateProfile : () => setIsEditing(true)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? 'Saving...'
                    : isEditing
                      ? 'Update Profile'
                      : 'Edit Profile'}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button - Only show when editing */}
              {isEditing && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false)
                    fetchUserProfile() // Reset to original values
                  }}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {/* Logout Button */}
              <TouchableOpacity
                style={[styles.button, styles.logoutButton, loading && styles.logoutButtonDisabled]}
                onPress={handleLogout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 15,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#E91E63',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 14,
  },
  lockedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#9E9E9E',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  lockedIcon: {
    fontSize: 14,
  },
  userName: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 5,
  },
  userEmail: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  formCard: {
    // backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    paddingBottom: 40,
    minHeight: 400,
  },
  button: {
    backgroundColor: '#4238C5',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
    marginHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  logoutButton: {
    // backgroundColor: '#E91E63',
    marginTop: 10,
  },
  backicon: {
    width: 40,
    height: 40,
    marginLeft: 10,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logoutButtonDisabled: {
    backgroundColor: 'rgba(233, 30, 99, 0.3)',
  },
})