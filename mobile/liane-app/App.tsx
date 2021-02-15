import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Button, Alert } from 'react-native';
import { registerLocationTask, initializeLocationTask } from './components/locationTask';

import {create} from 'tailwind-rn';
import styles from './styles.json';
import { useHover, useFocus, useActive, } from 'react-native-web-hooks';
import {getColor, t, mapFromStyles, tailwind } from './tailwind_fcts'
import { TextInput } from 'react-native-gesture-handler';
import Login from './frontEndReactNative'
import { userSendSms } from './components/apiRequest';
import AppContainer from './AppContainer'

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
    <AppContainer>
    </AppContainer>   
  );
}

