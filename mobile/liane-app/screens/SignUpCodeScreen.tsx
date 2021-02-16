import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, ImageBackground, StyleSheet, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import {userLogin} from '../components/apiRequest';
import { AuthContext } from '../utils/authContext';
const image = require("../Images/Mountains_2_smartphone.jpeg"); 

const SignUpCodeScreen = ({ navigation, route } : any) => {
    const [phoneNumber, _] = React.useState(route.params.phoneNumber);
    const [code, setCode] = React.useState('Entrez votre code');
    const { signIn } = useContext(AuthContext);
  
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
            <View style={{backgroundColor:"#FFF",height:"100%"}}>
              <ImageBackground source = {image} style = {styles.image}>
              <Text
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
                  borderColor:"#00716F",
                  borderRadius:23,
                  paddingVertical:2
              }}>
                  <TextInput 
                      style={styles.textInput}
                      placeholder = "Tapez ICI"
                      keyboardType = "numeric"
                      placeholderTextColor = 'black'
                      onChangeText = {setCode}
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
                  <Text style={{
                      color:"white",
                      fontFamily:"normal"
                  }}>Soumettre</Text>
                  
                  <Button  
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
    paddingHorizontal : 10,
    color : 'red',
    }
  });


export default SignUpCodeScreen;