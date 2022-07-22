import React, {useEffect, useState} from "react";
import {FlatList, SafeAreaView, TouchableOpacity, View} from "react-native";
import {tw} from "@/api/tailwind";
import {AppText} from "@/components/base/AppText";
import {ListItem} from "react-native-elements";
import Autocomplete from "react-native-autocomplete-input";
import {Liane, RallyingPoint, TripIntent} from "@/api";
import {Ionicons} from "@expo/vector-icons";
import {AppButton} from "@/components/base/AppButton";
import {StackNavigationProp} from "@react-navigation/stack";
import {NavigationParamList} from "@/components/Navigation";
import {HomeNavigationProp} from "@/screens/HomeScreen";
import TripListItem from "@/components/TripListItem";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import {getTripIntents} from "@/api/client";
import {useFocusEffect} from "@react-navigation/native";

const aurillac: RallyingPoint = {
  "id": "62b99d1982229ff1d341098f",
  "label": "Aurillac",
  "location": {
    "lat": 44.9285441,
    "lng": 2.4433101
  }
};

const saintpaul: RallyingPoint = {
  "id": "62b99d1982229ff1d3414ba3",
  "label": "Saint-Paul-des-Landes",
  "location": {
    "lat": 44.9439943,
    "lng": 2.3125999
  }
};

const saintbau: RallyingPoint = {
  "id": "62b99d1982229ff1d34125ba",
  "label": "Saint-Bauzille-de-Putois",
  "location": {
    "lat": 43.895497,
    "lng": 3.7352498
  }
};

const stubTrips: TripIntent[] = [
  {
    id: "id1",
    from: saintpaul,
    to: aurillac,
    fromTime: new Date().toISOString(),
  },
    
  {
    id: "id2",
    from: aurillac,
    to: saintpaul,
    fromTime: new Date().toISOString(),
  },
  {
    id: "id3",
    from: saintpaul,
    to: saintbau,
    fromTime: new Date().toISOString(),
  }
     
];

export type ScheduleNavigationProp = StackNavigationProp<NavigationParamList, "Schedule">;

type ScheduleProps = {
  navigation: ScheduleNavigationProp;
};

const ScheduleScreen = ({ navigation }: ScheduleProps) => {
  const [tripIntents, setTripIntents] = useState<TripIntent[]>([]);
  
  const refreshIntents = () => {
    getTripIntents().then(intents => setTripIntents(intents))
  }
  
  useFocusEffect(
      React.useCallback(refreshIntents, [])
  );
  
  return (
      <SafeAreaView style={tw("flex flex-col h-full")}>

        <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-orange")}>
          <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
        </View>
        
        <FlatList 
            style={tw("flex")} 
            data={tripIntents} 
            renderItem={({ item }) => (
                <ScheduleTripItem 
                    tripIntent={item} 
                    toDetails={navigation}
                    refreshList={refreshIntents}
                />
            )}
            keyExtractor={(data: TripIntent) => data.id!}
        />
      </SafeAreaView>
  );
};

export default ScheduleScreen;
