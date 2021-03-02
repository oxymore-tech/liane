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
                leftComponent={<Icon name='arrow-left' type='font-awesome-5' solid={true} color="white" onPress={() => navigation.navigate('Notifications')}/>}
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
                rightComponent={<Icon name='bell' type='font-awesome-5' solid={true} color="white"/>}/>

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Acceptez l'utilisation de vos données de localisation, BLABLABLA
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