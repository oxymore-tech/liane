import React from 'react';
import { View, Text, Animated, StyleSheet, ScrollView, Button} from 'react-native';
import { SearchBar, Icon, Slider } from 'react-native-elements';
import tailwind from 'tailwind-rn'

// <>

const FilterAndSearchScreen = () => {
    const [search, setSearch] = React.useState('SEARCH');
    const [sliderValue, setSliderValue] = React.useState(12);
    const [sliderValue2, setSliderValue2] = React.useState(13);
    let hourFrom = "12:00";
    let hourTo = "13:00";
    function actionsOnPress() {

    }

    //@hour : a number between 0 and 12.
    function updateSliderValues(hour: number) {
        setSliderValue(hour);
        setSliderValue2(hour);
        hourFrom = (Math.floor(sliderValue / 24)).toString() + ":" + (sliderValue % 24).toString();
        hourTo= (Math.floor(sliderValue2 / 24)).toString() + ":" + (sliderValue2 % 24).toString();
      };
      
    return (
        <View>
            <Text style={tailwind('bg-blue-500 px-3 py-1 rounded-full content-center')}>
                Liane
            </Text>

            <Text style = {tailwind('text-blue-500')}>
                Rechercher
            </Text>

            <SearchBar 
                placeholder = "Où voulez vous chercher ?" 
                placeholderTextColor = {"#BFDBFE"}
                rightIconContainerStyle = {tailwind("bg-white")}
                inputStyle = {tailwind("bg-white")}
                inputContainerStyle = {tailwind("bg-white")}
                leftIconContainerStyle = {tailwind("blue-500")}
                containerStyle = {tailwind("bg-white border-2 border-blue-300")}
                lightTheme = {true}
                onChangeText = {(text) => setSearch(text)}/>

            <Text style = {tailwind('text-blue-500')}>
                Rechercher point d'arrivée
            </Text>

            <SearchBar 
                placeholder = "Où voulez vous chercher ?" 
                placeholderTextColor = {"#BFDBFE"}
                rightIconContainerStyle = {tailwind("bg-white")}
                inputStyle = {tailwind("bg-white")}
                inputContainerStyle = {tailwind("bg-white")}
                leftIconContainerStyle = {tailwind("blue-500")}
                containerStyle = {tailwind("bg-white border-2 border-blue-300")}
                lightTheme = {true}
                onChangeText = {(text) => setSearch(text)}/>
            <Text style = {tailwind('text-blue-500')}>
                Horaire
            </Text>

            <View style={styles.container}>
                <Text> {hourFrom} </Text>
                <Text> {hourTo}</Text>
                <View style={{ flex: 1, alignItems: 'stretch', justifyContent: 'center' }}>
                    <Slider
                        value={sliderValue}
                        onValueChange={(currentVal : number) =>  updateSliderValues(currentVal)}
                    />
                    <Text>Value: {sliderValue}</Text>
                </View>                
            </View>

            <Text style = {tailwind('text-blue-500')}>
                Jour
            </Text>

            <ScrollView>
            </ScrollView>
            <Button  
                color = {"blue"}
                onPress = {actionsOnPress} 
                title = "Lancer la recherche"
                  />
        </View>
        
    );
};
/*
                <rs.RangeSlider 
                minimumValue = {0}
                maximumValue = {144} // 24 * 6
                minimumTrackTintColor="#307ecc"
                maximumTrackTintColor="#000000"
                value = {sliderValue}
                allowTouchTrack = {true}
                step = {2}
                onValueChange = {(currentVal : number) =>  updateSliderValues(currentVal)}
                />
*/

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      justifyContent: 'center',
      backgroundColor: '#ecf0f1',
    },
  });
  

export default FilterAndSearchScreen;