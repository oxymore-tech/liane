import React from 'react';
import { View, Text, Animated, StyleSheet, ScrollView, Button} from 'react-native';
import { Header, SearchBar, Icon, Slider } from 'react-native-elements';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import tailwind from 'tailwind-rn'

// <>

const FilterAndSearchScreen = ({ route, navigation } : any) => {
    const [search, setSearch] = React.useState('SEARCH');
    const [sliderValue, setSliderValue] = React.useState(12);
    const [sliderValue2, setSliderValue2] = React.useState(13);

    const [ nonCollidingMultiSliderValue, setNonCollidingMultiSliderValue, ] = React.useState([0, 100]);
    const nonCollidingMultiSliderValuesChange = (values:any) => setNonCollidingMultiSliderValue(values);

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
        <View style={tailwind('container')}>
            <Header
                leftComponent={{ icon: 'menu', color: '#fff', onPress: () => navigation.openDrawer()}}
                centerComponent={{ text: 'LIANE APP', style: { color: '#fff' } }}
                rightComponent={{ icon: 'home', color: '#fff' }}
            />

            <View style={tailwind('pt-8 items-center')}>
                <View style={tailwind('bg-blue-200 px-3 py-1 rounded-full')}>
                    <Text style={tailwind('text-blue-800 text-xl font-semibold')}>
                        Recherche de trajet
                    </Text>
                </View>
            </View>

            <View style={tailwind('pt-12')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-500 text-lg font-semibold')}>
                        Rechercher
                    </Text>
                </View>
            </View>
            <View style={tailwind('border-8 border-white')}>
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
            </View>

            <View style={tailwind('pt-8')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-500 text-lg font-semibold')}>
                    Rechercher point d'arrivée
                    </Text>
                </View>
            </View>

            <View style={tailwind('border-8 border-white')}>
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
            </View>

            <View style={tailwind('pt-8')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-500 text-lg font-semibold')}>
                        Horaire
                    </Text>
                </View>
            </View>

            <View style={tailwind('pt-8 items-center')}>
            <Text style={tailwind('absolute left-3 top-0 h-16 w-16 text-blue-500 text-xl font-semibold')}> {hourFrom} </Text>
            <Text style={tailwind('absolute top-0 right-3 h-16 w-16 text-blue-500 text-xl font-semibold')}> {hourTo}</Text>
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

            <View style={tailwind('pt-8')}>
                <View style={tailwind('px-3')}>
                    <Text style={tailwind('text-blue-500 text-lg font-semibold')}>
                    Jour
                    </Text>
                </View>
            </View>

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