import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerLocationTask, initializeLocationTask } from './components/locationTask';


// TEST
import { Button, TextInput } from 'react-native'
import { userSendSms } from './components/apiRequest';

initializeLocationTask();


export default function App() {

  const [phoneNumber, onChangeText] = React.useState('Entrez votre 06');
  const [myText, setMyText] = useState("My Original Text");

  useEffect(() => {
    registerLocationTask().then(() => console.log("Task registred !"))
      .catch(err => console.error(err));
  }, []);

  function sendSMS() {
    userSendSms(phoneNumber).then((result) => setMyText("RESULT : " + result)).catch(e => console.log('error : ', e));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.container}>Bonjourno !</Text>
        <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
        onChangeText={text => onChangeText(text)}
        value={phoneNumber}
        />
        <Button title="Register" onPress={sendSMS}/>
        <View>
            <Text>{myText}</Text>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
