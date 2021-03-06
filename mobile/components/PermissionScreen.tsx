import React, { useContext } from 'react';
import { Alert, Text, View } from 'react-native';
import { AuthContext } from '../utils/authContext';
import { Button, Header, Icon } from 'react-native-elements';

// Style
import tailwind from 'tailwind-rn';

const PermissionScreen = ({route, navigation}: any) => {
  const {signIn} = useContext(AuthContext);
  const [token,] = React.useState(route.params.token);
  const [phoneNumber,] = React.useState(route.params.phoneNumber);

  function actionOnAccept() {
    if (token) {
      signIn({token: token});
    }
  }

  function actionOnDecline() {
    Alert.alert("Vous devez accepter les conditions pour utiliser Liane");
  }

  return (
    <View style={tailwind('container')}>
      <Header
        centerComponent={{text: 'LIANE APP', style: {color: '#fff'}}}
      />

      <View style={tailwind('pt-8 items-center')}>
        <View style={tailwind('bg-blue-200 px-3 py-1')}>
          <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
            Liane collecte votre position GPS afin de partager vos trajets locaux avec les autres utilisateurs, même
            lorsque l'application est fermée ou en arrière plan.
            Seuls les trajets en voiture effectués entre les points de ralliement sont enregistrés.
            Ces trajets sont partagés de manière anonyme avec les autres utilisateurs.
            Un audit peut être mené par une société tierce sur le code de l'application.
          </Text>
          <Text style={tailwind('text-gray-600 mt-4')}>
            This app collects location data to enable anonymous trip sharing even when the app is closed or not in use.
          </Text>
        </View>
      </View>
      <View>
        <View style={tailwind('w-1/2 p-8')}>
          <Button
            icon={
              <Icon
                name="check"
                size={40}
                color="white"
                type='font-awesome'
              />
            }
            onPress={actionOnAccept}
            title="Accepter"
          />
        </View>
        <View style={tailwind('absolute right-0 w-1/2 p-8')}>
          <Button
            icon={
              <Icon
                name="times"
                size={40}
                color="white"
                type='font-awesome'
              />
            }
            title="Refuser"
            onPress={actionOnDecline}
          />
        </View>
      </View>
    </View>
  );
};

export default PermissionScreen;