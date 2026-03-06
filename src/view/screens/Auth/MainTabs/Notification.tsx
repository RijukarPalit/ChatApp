// import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
// import React, { useEffect } from 'react'

// const Notification = () => {
//     const [loading, setLoading] = React.useState(false);
//     const [userData, setUserData] = React.useState(null);
//     const [memeData, setMemeData] = React.useState(null);

//     // useEffect(() => {
//     //     handleLogout();
//     // }, []);

//     // const handleFetchData = async () => {
//     //     // console.log('hiiii')
//     //     try {
//     //         setLoading(true);
//     //         const url = "https://dummyjson.com/users";
//     //         const response = await fetch(url);
//     //         const data = await response.json();
//     //         // return data;

//     //         setUserData(data.users);

//     //     } catch (error) {
//     //         console.error('Error fetching data:', error);
//     //     } finally {
//     //         setLoading(false);
//     //     }
//     // };

//     const handleFetchData = async () => {
//         try {
//             setLoading(true);

//             const url = "https://meme-api.com/gimme";
//             const response = await fetch(url);
//             const data = await response.json();

//             setMemeData(data);
//         } catch (error) {
//             console.error('Error fetching data:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <View>
//             <Text>Notification</Text>


//             {/* Logout Button */}
//             <View style={{ marginTop: 60, justifyContent: 'center' }}>
//                 <TouchableOpacity
//                     style={[styles.button, styles.logoutButton, loading && styles.logoutButtonDisabled]}
//                     onPress={handleFetchData}
//                     disabled={loading}
//                 >
//                     {loading ? (
//                         <ActivityIndicator color="#fff" />
//                     ) : (
//                         <Text style={styles.buttonText}>Press Here!!</Text>
//                     )}
//                 </TouchableOpacity>
//                 {/* Show Data */}
//                 {userData && userData.map((item) => (
//                     <View key={item.id} style={{ marginTop: 10 }}>
//                         <Text>Name: {item.firstName} {item.lastName}</Text>
//                         <Text>Email: {item.email}</Text>
//                     </View>
//                 ))}

//                 {memeData && (
//                     <View style={{ marginTop: 20 }}>
//                         {/* <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
//                         {memeData.title}
//                     </Text> */}

//                         <Image
//                             source={{ uri: memeData.url }}
//                             style={{ width: '100%', height: 300, borderRadius: 10 }}
//                             resizeMode="contain"
//                         />
//                     </View>
//                 )}
//             </View>
//         </View>
//     )
// }

// export default Notification

// const styles = StyleSheet.create({
//     button: {
//         backgroundColor: '#4238C5',
//         paddingVertical: 15,
//         borderRadius: 25,
//         alignItems: 'center',
//         marginTop: 15,
//         marginHorizontal: 20,
//     },
//     buttonText: {
//         color: '#fff',
//         fontWeight: '600',
//         fontSize: 16,
//     },
//     cancelButton: {
//         backgroundColor: '#757575',
//     },
//     logoutButton: {
//         // backgroundColor: '#E91E63',
//         marginTop: 10,
//     },
//     backicon: {
//         width: 40,
//         height: 40,
//         marginLeft: 10,
//     },
//     backgroundImage: {
//         flex: 1,
//         width: '100%',
//         height: '100%',
//     },
//     logoutButtonDisabled: {
//         backgroundColor: 'rgba(233, 30, 99, 0.3)',
//     },
// })



import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useQuery } from '@tanstack/react-query'

// API function defined outside the component
const fetchMeme = async () => {
    const url = "https://meme-api.com/gimme";
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
};

const Notification = () => {
    const { 
        data: memeData, 
        isLoading, 
        refetch, 
        isFetching 
    } = useQuery({
        queryKey: ['meme'],
        queryFn: fetchMeme,
        enabled: false, // Prevents auto-fetching on mount, similar to your original code
    });

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Notification</Text>

            <View style={{ marginTop: 60, justifyContent: 'center' }}>
                <TouchableOpacity
                    style={[
                        styles.button, 
                        styles.logoutButton, 
                        (isLoading || isFetching) && styles.logoutButtonDisabled
                    ]}
                    onPress={() => refetch()} // Trigger the manual fetch
                    disabled={isLoading || isFetching}
                >
                    {(isLoading || isFetching) ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Press Here!!</Text>
                    )}
                </TouchableOpacity>

                {/* Meme Display */}
                {memeData && (
                    <View style={{ marginTop: 20 }}>
                        <Image
                            source={{ uri: memeData.url }}
                            style={{ width: '100%', height: 300, borderRadius: 10 }}
                            resizeMode="contain"
                        />
                    </View>
                )}
            </View>
        </View>
    )
}

export default Notification

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 10
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
    logoutButton: {
        marginTop: 10,
    },
    logoutButtonDisabled: {
        backgroundColor: 'rgba(66, 56, 197, 0.5)',
    },
})