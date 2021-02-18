import React, { useContext } from 'react';
import { View, Text, Button, SafeAreaView, FlatList } from 'react-native';
import { AuthContext } from '../utils/authContext';
import { Header, Icon, ListItem, Avatar } from 'react-native-elements';

// Style
import tailwind from 'tailwind-rn';

const NotificationsScreen = ({ route, navigation } : any) => {

    const list = [
        {
          name: 'Martin souhaite covoiturer avec vous !',
          avatar_url: 'https://s3.amazonaws.com/uifaces/faces/twitter/ladylexy/128.jpg',
          subtitle: 'Demande du 12/12/12 à 12h12',
          tripId : 999
        },
        {
          name: 'Chris souhaite covoiturer avec vous :',
          avatar_url: 'https://s3.amazonaws.com/uifaces/faces/twitter/adhamdannaway/128.jpg',
          subtitle: 'Vice Chairman',
          tripId : 444
        }
      ]
    const keyExtractor = (item: any, index: { toString: () => any; }) => index.toString()
    const acceptTrip = (tripId : number) => navigation.navigate('AcceptTrip', {tripId});

    const renderItem = ({ item } : any) => (
    <ListItem bottomDivider onPress={() => acceptTrip(item.tripId)}>
        <Avatar source={{uri: item.avatar_url}} />
        <ListItem.Content>
        <ListItem.Title>{item.name}</ListItem.Title>
        <ListItem.Subtitle>{item.subtitle}</ListItem.Subtitle>
        </ListItem.Content>
        <ListItem.Chevron name='times' type='font-awesome' color='#f50' onPress={() => console.log('Supprimer notif')}/>
    </ListItem>
    )
      
    return (
        <View style={tailwind('container')}>
            <Header
                leftComponent={{ icon: 'menu', color: '#fff', onPress: () => navigation.openDrawer()}}
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
                rightComponent={<Icon name='bell' type='font-awesome-5' solid={true} color="white"/>}/>

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Notifications
                    </Text>
                </View>
            </View>

            <FlatList
                style={tailwind('pt-8')}
                keyExtractor={keyExtractor}
                data={list}
                renderItem={renderItem}
            />

        </View>
    );
};

export default NotificationsScreen;