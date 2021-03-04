import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerLocationTask, initializeLocationTask } from './components/locationTask';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useReducer } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

import { stateConditionString } from './utils/helpers'; 
import { AuthContext } from './utils/authContext';

// Screens
import SplashScreen from './screens/SplashScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import SignUpCodeScreen from './screens/SignUpCodeScreen';

import ProfileScreen from './screens/ProfileScreen';
import FilterAndSearch from './screens/FilterAndSearchScreen';
import MapScreen from './screens/MapScreen';
import MapAndResultsScreen from './screens/MapAndResultsScreen';
import SettingsScreen from './screens/SettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AcceptTripScreen from './screens/AcceptTripScreen';
import Constants from 'expo-constants';
// Modal permissions
import PermissionScreen from './components/PermissionScreen';


// Initialize Notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

initializeLocationTask();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const createHomeStack = () => {
  const { signOut } = useContext(AuthContext);
  return (
      <Stack.Navigator>
          <Stack.Screen name="Home" component={createDrawer} options={{ headerShown : false }}/>
          <Stack.Screen name="AcceptTrip" component={AcceptTripScreen} options={{ headerShown : false }}/>
      </Stack.Navigator>
  );
};

const createLoginStack = () => {
  const { signIn } = useContext(AuthContext);
  return (
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignUpScreen}  options={{ headerShown : false }}/>
        <Stack.Screen name="SignInSms" component={SignUpCodeScreen} options={{ headerShown : false }} />
        <Stack.Screen name="Permission" component={PermissionScreen}  options={{ headerShown : false }}/>
      </Stack.Navigator>
  );
};

const createDrawer = () => {
  const { signOut } = useContext(AuthContext);
  return (
      <Drawer.Navigator>
          <Drawer.Screen
              name="Accueil"
              component={HomeScreen}
          />
        { 
        /*  
          <Drawer.Screen name="Profil" component={ProfileScreen} />
          <Drawer.Screen name="Recherche trajets" component={FilterAndSearch} />
          <Drawer.Screen name="Carte" component={MapScreen} />
          <Drawer.Screen name="Carte et résultats" component={MapAndResultsScreen} />
        */
          <Drawer.Screen name="Notifications" component={NotificationsScreen} />
        /*
          <Drawer.Screen name="Réglages" component={SettingsScreen} />
        */ 
        }
      </Drawer.Navigator>
  );
};

const chooseScreen = (state : any) => {
  let navigateTo = stateConditionString(state);
  let arr = [];
  switch (navigateTo) {
      case 'LOAD_APP':
          arr.push(<Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown : false }}/>);
          break;
      case 'LOAD_SIGNUP':
          arr.push(
              <Stack.Screen
                  name="SignUp"
                  component={SignUpScreen}
                  options={{
                      title: 'Sign Up',
                      // When logging out, a pop animation feels intuitive
                      animationTypeForReplace: state.isSignout
                          ? 'pop'
                          : 'push',
                           headerShown : false 
                  }}
              />
          );
          break;
      case 'LOAD_SIGNIN':
          arr.push(
            <Stack.Screen
                name="SignIn"
                component={createLoginStack}
                options={{
                    title: 'Login Screen Parent',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                    headerShown : false 
                }}
            />
          );
          break;
      case 'LOAD_HOME':
          // lancement service de localisation
          registerLocationTask().then(() => console.log("Task registred !"))
          .catch(err => console.error(err));

          arr.push(
              <Stack.Screen
                  name="Home"
                  component={createHomeStack}
                  options={{
                      title: 'Home Screen Parent',
                      headerStyle: { backgroundColor: 'black' },
                      headerTintColor: 'white',
                      headerShown : false 
                  }}
              />
          );
          break;
      default:
          arr.push(
            <Stack.Screen
                name="SignIn"
                component={createLoginStack}
                options={{
                    title: 'Login Screen Parent',
                    headerStyle: { backgroundColor: 'black' },
                    headerTintColor: 'white',
                    headerShown : false 
                }}
            />
          );
          break;
  }
  return arr[0];
};

async function registerForPushNotificationsAsync() {
    let token;
    if (Constants.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
    } else {
      alert('Must use physical device for Push Notifications');
    }
  
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  
    return token;
}

export default function App() {
    const [expoPushToken, setExpoPushToken] = useState('');
    const notificationListener = useRef();
    const responseListener = useRef();
    
  const authContextValue = useMemo(
    () => ({
        getPushToken: () => {
            return expoPushToken;
        },
        signIn: async (data : any) => {
              if (
                  data.token !== undefined
              ) {
                  dispatch({ type: 'SIGN_IN', token: data.token });
              } else {
                  dispatch({ type: 'TO_SIGNIN_PAGE' });
              }
        },
        signOut: async () => {
            await AsyncStorage.removeItem('tokenJWT');
            dispatch({ type: 'SIGN_OUT' });
        },
        signUp: async (data : any) => {
              if (
                  data &&
                  data.emailAddress !== undefined &&
                  data.password !== undefined
              ) {
                  dispatch({ type: 'SIGNED_UP', token: 'dummy-auth-token' });
              } else {
                  dispatch({ type: 'TO_SIGNUP_PAGE' });
              }
        }
    }), [expoPushToken]
  );

  const [state, dispatch] = useReducer(
    (prevState : any , action : any) => {
        switch (action.type) {
            case 'TO_SIGNUP_PAGE':
                return {
                    ...prevState,
                    isLoading: false,
                    isSignedUp: false,
                    noAccount: true
                };
            case 'TO_SIGNIN_PAGE':
                return {
                    ...prevState,
                    isLoading: false,
                    isSignedIn: false,
                    noAccount: false
                };
            case 'RESTORE_TOKEN':
                return {
                    ...prevState,
                    userToken: action.token,
                    isLoading: false
                };
            case 'SIGNED_UP':
                return {
                    ...prevState,
                    isSignedIn: true,
                    isSignedUp: true,
                    isLoading: false,
                    userToken: action.token
                };
            case 'SIGN_IN':
                return {
                    ...prevState,
                    isSignedOut: false,
                    isSignedIn: true,
                    isSignedUp: true,
                    userToken: action.token
                };
            case 'SIGN_OUT':
                return {
                    ...prevState,
                    isSignedOut: true,
                    isSignedIn: false,
                    isSignedUp: true,
                    userToken: null
                };
        }
    },
    {
        isLoading: true,
        isSignedOut: false,
        isSignedUp: false,
        noAccount: false,
        isSignedIn: false,
        userToken: null
    }
  );

  useEffect(() => {

    registerForPushNotificationsAsync().then(token => {
        console.log('TOKEN :', token);
        setExpoPushToken(token);
    });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(data => {
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
      var notification = response.notification.request.content.data;
      /*
      if(notification.type == 'covoiturage_notification') {
        var newList = askNotifications.concat({
            name : notification.name + ' souhaite covoiturer avec vous',
            subtitle : 'Son numéro est le ' + notification.number,
            tripId : 1
        });
        setAskNotifications(newList);
      }
      */
    });
/*
    registerLocationTask().then(() => console.log("Task registred !"))
      .catch(err => console.error(err));
*/

    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;
      try {
          userToken = await AsyncStorage.getItem('tokenJWT');
          if(userToken != null) {
            console.log('Toke here');
            dispatch({ type: 'SIGNED_UP', token: userToken });
          } else {
            // dispatch({ type: 'TO_SIGNUP_PAGE' });
            dispatch({ type: 'RESTORE_TOKEN', token: '' });
          }
      } catch (e) {
            // Restoring token failed
            console.log('Impossible de récupérer le token : ', e);
            dispatch({ type: 'TO_SIGNUP_PAGE' });
      }
      // RESTORE_TOKEN
      // dispatch({ type: 'SIGN_IN', token: userToken });
    };
    bootstrapAsync();

    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };

  }, []);

  return (     
    <AuthContext.Provider value={authContextValue}>
        <NavigationContainer>
            <Stack.Navigator>{chooseScreen(state)}</Stack.Navigator>
        </NavigationContainer>
    </AuthContext.Provider>
  );
}

