
import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { ImageName } from '../../../asserts'
import { useChatBackground } from '../../../context/ChangeBackgrounContext'
import { hp, wp } from '../../../utils/dimention'


const ChangeBackground = () => {
  const navigation = useNavigation()

  const { setBackground } = useChatBackground();


  return (
    <ImageBackground
      source={ImageName.ChatBg}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={ImageName.Back} style={styles.backicon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Background</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10,left: 10, flexWrap: 'wrap', }}>
            <TouchableOpacity
              onPress={() => {
                setBackground(ImageName.ChatBg);
                navigation.goBack();
              }}
            >
              <Image source={ImageName.ChatBg} style={{ width: wp(30), height: hp(20) }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setBackground(ImageName.NewSplash);
                navigation.goBack();
              }}
            >
              <Image source={ImageName.NewSplash} style={{ width: wp(30), height: hp(20)}} />
            </TouchableOpacity>

             <TouchableOpacity
              onPress={() => {
                setBackground(ImageName.ChatBg2);
                navigation.goBack();
              }}
            >
              <Image source={ImageName.ChatBg2} style={{ width: wp(30), height: hp(20)}} />
            </TouchableOpacity>

             <TouchableOpacity
              onPress={() => {
                setBackground(ImageName.ChatBg3);
                navigation.goBack();
              }}
            >
              <Image source={ImageName.ChatBg3} style={{ width: wp(30), height: hp(20)}} />
            </TouchableOpacity>

             <TouchableOpacity
              onPress={() => {
                setBackground(ImageName.ChatBg4);
                navigation.goBack();
              }}
            >
              <Image source={ImageName.ChatBg4} style={{ width: wp(30), height: hp(20)}} />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </ImageBackground>
  )
}

export default ChangeBackground

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
  backicon: {
    width: 35,
    height: 35,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
  },
})