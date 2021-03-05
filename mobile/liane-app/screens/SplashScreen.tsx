import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image } from 'react-native';
import tailwind from 'tailwind-rn';

//the image set in the background of the app at start
const image = require("../Images/Mountains_2_smartphone.jpeg"); // Image

const SplashScreen = ({ route, navigation } : any) => {
    React.useEffect(() => {
        navigation.navigate('SignIn');
    }, []);

    return (
        <View style={{backgroundColor:"#FFF",height:"100%"}}>
            <ImageBackground source = {image} style = {styles.image}> 
            <View style={tailwind('container')}>
                <Image
                    style={tailwind('self-center')}
                    source={require('../assets/logo_mini.png')}
                />
            </View>
            </ImageBackground>
        </View>
    )
};

const styles = StyleSheet.create({
image: {
  flex: 1,
  resizeMode: "cover",
  justifyContent: "center"
},
});

export default SplashScreen;