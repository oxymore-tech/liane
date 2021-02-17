import React, { useContext } from 'react';
import { View, Text, Button, SafeAreaView } from 'react-native';
import { AuthContext } from '../utils/authContext';

// Style
import tailwind from 'tailwind-rn';

const HomeScreen = ({ route, navigation } : any) => {
    const { SignOutButton } = route.params;
    return (
        <><SafeAreaView style={tailwind('h-full')}>
            <View style={tailwind('pt-12 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 font-semibold')}>
                        Hello Tailwind
                    </Text>
                </View>
            </View>
            <View>
                <Text>Ceci est la page principale - Welcome !</Text>
                <Button title="Menu" onPress={() => navigation.openDrawer()} />
                <SignOutButton />
            </View>
        </SafeAreaView>
        </>
    );
};

export default HomeScreen;