import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button } from 'react-native';
import { registerLocationTask, initializeLocationTask } from './components/locationTask';
import AsyncStorage from '@react-native-async-storage/async-storage';

// import {create} from 'tailwind-rn';
// import styles from './styles.json';
// import { useHover, useFocus, useActive, } from 'react-native-web-hooks';
// import {getColor, t, mapFromStyles, tailwind } from './tailwind_fcts'

import { useReducer } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

import { stateConditionString } from './utils/helpers'; 
import { AuthContext } from './utils/authContext';

import SplashScreen from './screens/SplashScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import SecondScreen from './screens/SecondScreen';
import SignUpCodeScreen from './screens/SignUpCodeScreen';

initializeLocationTask();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const createHomeStack = () => {
  const { signOut } = useContext(AuthContext);
  return (
      <Stack.Navigator>
          <Stack.Screen
              name="Home Screen"
              component={createDrawer}
              initialParams={{ signOut }}
          />
      </Stack.Navigator>
  );
};

const createLoginStack = () => {
  const { signIn } = useContext(AuthContext);
  return (
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignUpScreen} />
        <Stack.Screen name="SignInSms" component={SignUpCodeScreen} initialParams={{ signIn, phoneNumber : null }}/>
      </Stack.Navigator>
  );
};

const createDrawer = () => {
  const { signOut } = useContext(AuthContext);
  return (
      <Drawer.Navigator>
          <Drawer.Screen
              name="Home Screen"
              component={HomeScreen}
              initialParams={{
                  id: 111,
                  SignOutButton: () => (
                      <Button
                          title="Sign Me out"
                          onPress={signOut}
                      />
                  )
              }}
          />
          <Drawer.Screen name="SecondScreen" component={SecondScreen} />
      </Drawer.Navigator>
  );
};

const chooseScreen = (state : any) => {
  let navigateTo = stateConditionString(state);
  let arr = [];
  switch (navigateTo) {
      case 'LOAD_APP':
          arr.push(<Stack.Screen name="Splash" component={SplashScreen} />);
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
                          : 'push'
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
                    headerTintColor: 'white'
                }}
            />
          );
          break;
      case 'LOAD_HOME':
          arr.push(
              <Stack.Screen
                  name="Home"
                  component={createHomeStack}
                  options={{
                      title: 'Home Screen Parent',
                      headerStyle: { backgroundColor: 'black' },
                      headerTintColor: 'white'
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
                    headerTintColor: 'white'
                }}
            />
          );
          break;
  }
  return arr[0];
};

export default function App() {
  const authContextValue = useMemo(
    () => ({
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
    }), []
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
    registerLocationTask().then(() => console.log("Task registred !"))
      .catch(err => console.error(err));

    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;
      try {
          userToken = await AsyncStorage.getItem('tokenJWT');
          if(userToken != null) {
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
  }, []);

  return ( 
    <AuthContext.Provider value={authContextValue}>
        <NavigationContainer>
            <Stack.Navigator>{chooseScreen(state)}</Stack.Navigator>
        </NavigationContainer>
    </AuthContext.Provider>
  );
}
