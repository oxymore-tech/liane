import React from 'react';
import { View, Text, TextInput, ImageBackground, StyleSheet, Alert } from 'react-native';
import { Button } from 'react-native-elements';
import { userSendSms} from '../components/apiRequest';
const image = require("../Images/Mountains_2_smartphone.jpeg"); 

const SignUpScreen = ({ navigation } : any) => {
    const [phoneNumber, setPhoneNumber] = React.useState('Entrez votre 06');
  
    function actionsOnPress(){
        userSendSms(phoneNumber);
        console.log("PHONE NUMBER : ", phoneNumber);
        Alert.alert("Nous vous avons envoyé un code par SMS pour vous authentifier. Vous avez une minute pour nous le saisir.");
        navigation.navigate('SignInSms', {phoneNumber : phoneNumber});
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
                    Veuillez renseigner votre numéro de téléphone :
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
                        placeholderTextColor = 'black'
                        returnKeyLabel = {"next"}
                        keyboardType = "numeric"
                        onChangeText = {(text) =>setPhoneNumber(text)}
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
                      title = "Soumettre"
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


export default SignUpScreen;