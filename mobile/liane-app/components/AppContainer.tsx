import 'react-native-gesture-handler';
import  {
    ScrollView,
    StyleSheet,
    TouchableHighlight,
    TextInput,
    Text,
    View,
    Alert,
    ImageBackground,
    Button
  } from 'react-native'
  import React from 'react'
  import {userLogin, userSendSms} from './apiRequest';
  import { NavigationContainer } from '@react-navigation/native';
  import { createStackNavigator } from '@react-navigation/stack';


const image = require("../Images/Mountains_2_smartphone.jpeg"); // Images/coucouToi.jpg"); 

const LoginPage = ({navigation} : any) => {
    const [phoneNumber, setPhoneNumber] = React.useState('Entrez votre 06');
  
    function actionsOnPress(){
        userSendSms(phoneNumber);
        console.log("PHONE NUMBER : ", phoneNumber);
        Alert.alert("Nous vous avons envoyé un code par SMS pour vous authentifier. Vous avez une minute pour nous le saisir.");
        navigation.navigate('CodePage', {phoneNumber : phoneNumber});
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
  }
  
  const CodePage = ({navigation, route} : any) => {
    const [phoneNumber, _] = React.useState(route.params.phoneNumber);
    const [code, setCode] = React.useState('Entrez votre code');
  
    function actionsOnPress(){
      userLogin(phoneNumber, code);
      console.log("CODE : ", code);
      Alert.alert("Bravo, vous avez réussi à saisir le code");
      //navigation.navigate('CodePage', {phoneNumber});
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
  }
  
const Stack = createStackNavigator();  
  
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


const AppContainer = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator>
            <Stack.Screen
                name="Home"
                component={LoginPage}
                //options={{ title: 'Welcome' }}
            />
            <Stack.Screen name="CodePage" component={CodePage} />
            </Stack.Navigator>
        </NavigationContainer>
        );
}
//export default LoginPage;
export default AppContainer;
