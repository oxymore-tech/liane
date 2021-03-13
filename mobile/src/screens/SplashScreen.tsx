import React from 'react';
import { Image, ImageBackground, View } from 'react-native';
import tailwind from 'tailwind-rn';

const image = require("@assets/images/Mountains_smartphone.jpeg" );

const SplashScreen = ({route, navigation}: any) => {
  React.useEffect(() => {
    navigation.navigate('SignIn');
  }, []);

  return (
    <View>
      <ImageBackground source={image} style={tailwind("flex object-cover justify-center")}>
        <View style={tailwind("")}>
          <Image
            style={tailwind("")}
            source={require('@assets/logo_mini.png')}
          />
        </View>
      </ImageBackground>
    </View>
  )
};

export default SplashScreen;