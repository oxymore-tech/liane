import React, { useContext } from 'react';
import { View, Text, SafeAreaView, FlatList } from 'react-native';
import { AuthContext } from '../utils/authContext';
import { Header, Icon, ListItem, Avatar, Button } from 'react-native-elements';

// Style
import tailwind from 'tailwind-rn';

const AcceptTripScreen = ({ route, navigation } : any) => {      
    return (
        <View style={tailwind('container')}>
            <Header
                leftComponent={<Icon name='arrow-left' type='font-awesome-5' solid={true} color="white" onPress={() => navigation.navigate('Notifications')}/>}
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
                rightComponent={<Icon name='bell' type='font-awesome-5' solid={true} color="white"/>}/>

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Accepter le covoiturage
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
                    />
                </View>
            </View>
        </View>
    );
};

export default AcceptTripScreen;