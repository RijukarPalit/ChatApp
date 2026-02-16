// import { StyleSheet, Text, View } from 'react-native'
// import React from 'react'

// const Status = () => {
//   return (
//     <View>
//       <Text>Status</Text>
//     </View>
//   )
// }

// export default Status

// const styles = StyleSheet.create({})


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
import { ImageName } from '../../../../asserts'

const Status = () => {
  const navigation = useNavigation()

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
          <Text style={styles.headerTitle}>Status</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* <Text style={styles.infoText}>Status updates coming soon...</Text> */}
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  )
}

export default Status

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
    width: 24,
    height: 24,
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