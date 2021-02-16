import React, { useContext } from 'react';
import { View, Text, Button } from 'react-native';
import { AuthContext } from '../utils/authContext';

const HomeScreen = () => {
    const { signOut } = useContext(AuthContext);
    function signOutAction() {
        signOut();
        console.log('Utilisateur deconnecté');
    }

    return (
        <View>
            <Text>Ceci est la page principale - Welcome !</Text>
            <Button title="Deconnexion" onPress={signOutAction} />
        </View>
    );
};

export default HomeScreen;