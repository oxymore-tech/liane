import React, { useState, useContext } from 'react';
import { View, Text, TextInput, ImageBackground, StyleSheet, Alert, Button } from 'react-native';
import {userLogin} from '../components/apiRequest';
import { AuthContext } from '../utils/authContext';


//the image set in the background of the app at start
const image = require("../Images/Mountains_2_smartphone.jpeg"); 

// the color of the borders of the view containing the text written by the user.
const colorButton : string = '#00716F';

const SignUpCodeScreen = ({ navigation, route } : any) => {
    const [phoneNumber, _] = React.useState(route.params.phoneNumber);
    const [code, setCode] = React.useState('Entrez votre code');
    const { signIn } = useContext(AuthContext);
  
    /** almost the same function than the one in "LoginPage".
     * However here we call the function to "userLogin" to generate a token of
     * auithentification. 
     * In the end we move to the next page, the core of the app.
     * For the moment this page is purely simple but it needs to be changed
     * in the future to welcome the map with the traffic etc...
    **/
    function actionsOnPress(){
      userLogin(phoneNumber, code).then(token => {
        if(token) {
            console.log('SIGN_IN :', signIn);
            signIn({ token : token });
            console.log("CODE : ", code);
            console.log("TOKEN : ", token);
            Alert.alert("Bravo, vous avez réussi à saisir le code");
            navigation.navigate('Home', {phoneNumber});
        }
      });
    }
  
    return (
            <View style={{backgroundColor:"#FFF",height:"100%"}} // image in the background 
            > 
              <ImageBackground source = {image} style = {styles.image}>
              <Text // we print "Liane"
               style={{
                   fontSize:50,
                   fontFamily:"normal",
                   alignSelf:"center",
                   marginTop: 100
               }}
              >Liane</Text>
    
              <Text
              style={{
                  fontFamily:"normal",
                  fontSize: 20,
                  marginHorizontal:75,
                  textAlign:'center',
                  marginTop:100,
                  opacity:8
              }}
              >
                  Veuillez renseigner le code reçu par SMS
              </Text>
    
              <View style={{
                  flexDirection:"row",
                  alignItems:"center",
                  marginHorizontal:55,
                  borderWidth:2,
                  marginTop:10,
                  paddingHorizontal:10,
                  borderColor:colorButton,
                  borderRadius:23,
                  paddingVertical:2
              }}>
                  <TextInput 
                      style={styles.textInput}
                      placeholder = "Tapez ICI"
                      placeholderTextColor = 'black'
                      onChangeText = {setCode}
                      keyboardType = {"numeric"}
                  />
    
              </View>
    
              <View style={{
                  marginHorizontal:55,
                  alignItems:"center",
                  justifyContent:"center",
                  marginTop:30,
                  backgroundColor:"#00716F",
                  paddingVertical:10,
                  borderRadius:23
              }}>
                  <Button  
                    color = {colorButton}
                    onPress = {actionsOnPress} 
                    title = "Envoyer"
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
  textInput : {
    flex : 1,
    paddingHorizontal : 5,
    paddingVertical : 0,
    marginLeft :  5,
    color : 'red',
    borderColor: colorButton,
  }
});

export default SignUpCodeScreen;