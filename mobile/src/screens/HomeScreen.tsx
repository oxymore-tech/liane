import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, Image, SafeAreaView, Text, View } from 'react-native';
import tailwind from 'tailwind-rn';
import * as Location from 'expo-location';
import { AppContext } from "@components/ContextProvider";
import AppLoading from "expo-app-loading";
import { registerLocationTask } from "@api/location-task";
import { PermissionDisclaimer } from "@components/PermissionDisclaimer";

const HomeScreen = ({navigation}: any) => {

  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const {setAuthUser} = useContext(AppContext);

  const askPermission = useCallback(() => {
    Alert.alert(
      "Information",
      "Liane collecte la position GPS de votre téléphone pour permettre l'enregistrement " +
      "de vos trajets même lorsque l'application est fermée ou n'est pas en cours d'utilisation.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Ok", onPress: async () => {
            const {status} = await Location.requestPermissionsAsync();
            if (status === 'granted') {
              await registerLocationTask();
              setHasPermission(true);
            }
          }
        }
      ],
      {cancelable: true}
    )
  }, []);

  useEffect(() => {
    (async () => {
      const b = await Location.hasServicesEnabledAsync();
      setHasPermission(b);
      if (!b) {
        askPermission();
      }
      setLoading(false);
    })();
  });

  if (loading) {
    return <AppLoading/>;
  }

  if (!hasPermission) {
    return <PermissionDisclaimer onAccept={askPermission}/>;
  }

  return (
    <View>
      <SafeAreaView style={tailwind('h-full')}>
        <View style={tailwind('pt-12 items-center')}>
          <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
            <Text style={tailwind('text-blue-800 font-semibold')}>
              Bienvenue sur Liane
            </Text>
          </View>
        </View>
        <View style={tailwind('container')}>
          <Image
            style={tailwind('self-center')}
            source={require('@assets/logo_mini.png')}
          />
        </View>
        <View>
          <Button title="Menu" onPress={() => navigation.openDrawer()}/>
          <Button
            title="Deconnexion"
            onPress={() => setAuthUser(undefined)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;