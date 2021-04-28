import React from 'react';
import { View, Text } from 'react-native';
import tailwind from 'tailwind-rn';
import { Header, Badge, Icon, ListItem, Avatar, Button } from 'react-native-elements';

const ProfileScreen = ({ route, navigation } : any) => {
    return (
        <View style={tailwind('container')}>
            <Header
                leftComponent={{ icon: 'menu', color: '#fff', onPress: () => navigation.openDrawer()}}
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
                rightComponent={<Icon name='bell' type='font-awesome-5' solid={true} color="white"/>}/>

            <Text style={tailwind('text-center text-xl font-semibold bg-white')}>Merci, vous allez prochainement être contacté par Martin Eden</Text>

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Profil
                    </Text>
                </View>
            </View>

            <ListItem style={tailwind('pt-8 items-center')}>
                <Avatar
                size="xlarge"
                rounded
                source={{
                    uri:
                    'https://s3.amazonaws.com/uifaces/faces/twitter/ladylexy/128.jpg',
                }}
                />
            <ListItem.Content>
                <ListItem.Title style={tailwind('text-blue-800 text-xl font-semibold')}>Nom d'utilisateur</ListItem.Title>
                <ListItem.Subtitle style={tailwind('text-blue-800 font-semibold')}>Actif depuis décembre 2020</ListItem.Subtitle>
            </ListItem.Content>
            </ListItem>

            <View style={tailwind('pt-8')}>
                    <Text style={tailwind('text-blue-800 text-lg font-semibold')}>
                        Ceci est ma super bio, je covoiture pour aider mais aussi me faire un max de blé
                    </Text>
            </View>

            <View>
                <View style={tailwind('w-1/2 p-3')}>
                    <Button
                        icon={
                            <Icon
                            name="phone-alt"
                            size={20}
                            color="white"
                            type='font-awesome-5'
                            />
                        }
                        title=" Appeler"
                    />
                </View>
                <View style={tailwind('absolute right-0 w-1/2 p-3')}>
                    <Button
                        icon={
                            <Icon
                            name="comment"
                            size={20}
                            color="white"
                            type='font-awesome'
                            />
                        }
                        title=" Envoyer un message"
                    />
                </View>
            </View>

            <View style={tailwind('p-8')}>
                    <Button
                        icon={
                            <Icon
                            name="exclamation-triangle"
                            size={15}
                            color="white"
                            type='font-awesome'
                            />
                        }
                        title="Signaler cet utilisateur"
                    />
            </View>

        </View>
    );
};

export default ProfileScreen;