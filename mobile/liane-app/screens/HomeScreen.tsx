import React, { useContext } from 'react';
import { View, Text, Button } from 'react-native';
import { AuthContext } from '../utils/authContext';

const HomeScreen = ({ route, navigation } : any) => {
    const { SignOutButton } = route.params;
    return (
        <View>
            <Text>Ceci est la page principale - Welcome !</Text>
            <Button title="Menu" onPress={() => navigation.openDrawer()} />
            <SignOutButton/>
        </View>
    );
};

export default HomeScreen;