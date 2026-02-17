import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ImageName } from '../../../../asserts'
import { hp, wp } from '../../../../utils/dimention'

const About = () => {
  const navigation = useNavigation()

  return (
    <ImageBackground
      source={ImageName.ChatBg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Image source={ImageName.Back} style={styles.backicon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Inserting Any Fantasy Text</Text>
              <Text style={styles.text}>
                It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. Lorem ipsum dolor sit amet. Aut galisum error et dolorem quos aut tenetur cupiditate est omnis saepe.
              </Text>
              <Text style={styles.text}>
                Qui sint natus quo nemo sunt hic provident aspernatur sed enim fugiat est nihil consequuntur. It is a long established fact that a reader will be distracted.
              </Text>
            </View>

            <View style={styles.border} />

            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>Our Mission</Text>
              <Text style={styles.text}>
                It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. It is a long established fact that a reader will be distracted.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  )
}

export default About

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    // Background color added for better readability if background is busy
    // backgroundColor: 'rgba(255,255,255,0.8)', 
    marginTop: hp(3),
  },
  headerTitle: {
    fontSize: 20,
    color: '#000',
    fontWeight: '700',
  },
  backButton: {
    padding: 5,
  },
  backicon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
  placeholder: {
    width: 34, // Matches backButton area for perfect centering
  },
  scrollContent: {
    paddingBottom: hp(5),
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: wp(5),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  titleContainer: {
    marginBottom: hp(1),
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: hp(1.5),
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: hp(1.5),
    textAlign: 'justify',
  },
  border: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: hp(2.5),
  },
})