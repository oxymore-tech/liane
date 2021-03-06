import React from 'react';
import { View, Text, ScrollView, StatusBar, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import {Picker} from '@react-native-picker/picker';

import tailwind from 'tailwind-rn';
import { CheckBox } from 'react-native-elements'
// import CheckBox from '@react-native-community/checkbox';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import RNPickerSelect from '@react-native-picker/picker';

const SettingsScreen = ({ navigation } : any) => {

    // const [toggleCheckBox, setToggleCheckBox] = React.useState(false)
    const [checked, setToggleCheckBox] = React.useState(false)
    const [carPoolersAmount, setCoDrivers] = React.useState(0);

    const [
      nonCollidingMultiSliderValue,
      setNonCollidingMultiSliderValue,
    ] = React.useState([0, 100]);
    const nonCollidingMultiSliderValuesChange = (values:any) => setNonCollidingMultiSliderValue(values);
    const toggleCheckBoxChange = () => setToggleCheckBox(!checked);

    const carPoolersAmountN = {
        1: 1,
        2: 2,
        3: 3,
      }

    return (
        <View style={tailwind('container')}>
            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Réglages
                    </Text>
                </View>
            </View>

            <View style={tailwind('pt-12')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-800 text-lg font-semibold')}>
                        Distance de géolocalisation
                    </Text>
                </View>
            </View>

            <View style={tailwind('pt-12 items-center')}>
                <View style={tailwind('px-3')}>
                    <MultiSlider
                    values={[
                        nonCollidingMultiSliderValue[0],
                        nonCollidingMultiSliderValue[1],
                    ]}
                    sliderLength={280}
                    onValuesChange={nonCollidingMultiSliderValuesChange}
                    min={0}
                    max={100}
                    step={1}
                    allowOverlap={false}
                    snapped
                    minMarkerOverlapDistance={40}/>
                </View>
            </View>

            <View style={tailwind('pt-12')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-800 text-lg font-semibold')}>
                        Places disponibles
                    </Text>
                </View>

                <Picker
                    selectedValue={carPoolersAmount}
                    style={{height: 50, width: 100}}
                    onValueChange={(itemValue, itemIndex) =>
                        setCoDrivers(itemIndex+1)
                    }>
                    <Picker.Item label="1" value={1} />
                    <Picker.Item label="2" value={2} />
                    <Picker.Item label="3" value={3} />
                </Picker>
            </View>

            <View style={tailwind('pt-12')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-800 text-lg font-semibold')}>
                        Notifications
                    </Text>
                </View>
            </View>

            <CheckBox
                title='Activées'
                checked={checked}
                onPress={toggleCheckBoxChange}
            />

        </View>
        );
};

export default SettingsScreen;