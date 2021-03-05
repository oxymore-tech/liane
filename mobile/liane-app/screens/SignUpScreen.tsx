import React from 'react';
import { View, Text, TextInput, ImageBackground, Image, StyleSheet, Alert, Button } from 'react-native';
import tailwind from 'tailwind-rn';
import { userSendSms} from '../components/apiRequest';


//the image set in the background of the app at start
const image = require("../Images/Mountains_2_smartphone.jpeg"); // Images/coucouToi.jpg"); 

// the color of the borders of the view containing the text written by the user.
const colorButton : string = '#00716F';

const SignUpScreen = ({ navigation } : any) => {
    const [phoneNumber, setPhoneNumber] = React.useState('Entrez votre 06');

    /** A set of actins triggered when the user press the button
        First we call the function that will send a SMS to the user.
        Then we print a "pop-up"  to inform the user.
        Finally we move to the second view, the page where it is asked to the user to write the code sent by SMS
    **/
    function actionsOnPress(){
        userSendSms(phoneNumber);
        console.log("PHONE NUMBER : ", phoneNumber);
        Alert.alert("Nous vous avons envoyé un code par SMS pour vous authentifier. Vous avez une minute pour nous le saisir.");
        navigation.navigate('SignInSms', {phoneNumber : phoneNumber});
    }

    return (
            <View style={{backgroundColor:"#FFF",height:"100%"}}>
                <ImageBackground source = {image} style = {styles.image} // image in the background
                >
                     
                <View style={tailwind('container')}>
                    <Image
                    style={tailwind('self-center')}
                        source={require('../assets/logo_mini.png')}
                    />
                </View>
  
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
                        onChangeText = {(text) =>setPhoneNumber(text)}
                        keyboardType = {"numeric"}
                        underlineColorAndroid = {'transparent'}
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
        flex : 1,
        paddingHorizontal : 5,
        paddingVertical : 0,
        marginLeft :  5,
        color : 'red',
        borderColor: colorButton,
    }
  });


export default SignUpScreen;