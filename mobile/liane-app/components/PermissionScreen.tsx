import React, { useContext } from 'react';
import { View, Text, Alert } from 'react-native';
import { AuthContext } from '../utils/authContext';
import { Header, Icon, Button } from 'react-native-elements';

// Style
import tailwind from 'tailwind-rn';

const PermissionScreen = ({ route, navigation } : any) => {
    const { signIn } = useContext(AuthContext);
    const [token, ] = React.useState(route.params.token);
    const [phoneNumber, ] = React.useState(route.params.phoneNumber);

    function actionOnAccept(){
          if(token) {
              signIn({ token : token });
          }
    } 

    function actionOnDecline() {
        Alert.alert("Vous devez accepter les conditions pour utiliser Liane");
    }

    return (
        <View style={tailwind('container')}>
            <Header
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
            />

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                    Cette application de l'association Oxymore collecte des données de localisation  
                    pour permettre l'enregistrement des positions d'un conducteur même quand l'application est fermée ou pas en cours d'utilisation.
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