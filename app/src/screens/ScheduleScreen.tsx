import React, {useState} from "react";
import {FlatList, SafeAreaView, TouchableOpacity, View} from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { ListItem } from "react-native-elements";
import Autocomplete from 'react-native-autocomplete-input';

export interface Trip {
  name: string;
  start: string;
  end: string;
}

const stubTrips: Trip[] = [
  {
    name: "Depart école",
    start: "Saint-Paul-des-Landes",
    end: "Aurillac"
  },
  {
    name: "Retour école",
    start: "Aurillac",
    end: "Saint-Paul-des-Landes",
  },
  {
    name: "Vacances",
    start: "Saint-Paul-des-Landes",
    end: "Saint-Bauzille-de-Putois"
  }
]

const ScheduleScreen = () => {

  // Refresh planned trips on render ?
  
  // Temporary render function for a scheduled trip item
  const renderItem = ({ item }) => (
      <ListItem  hasTVPreferredFocus={undefined}
                 tvParallaxProperties={undefined} 
                 bottomDivider
                 style={tw("flex flex-row items-center")}
      >
        <ListItem.Content>
          <ListItem.Title>{item.name}</ListItem.Title>
          <ListItem.Subtitle>{item.start + " -> " + item.end}</ListItem.Subtitle>
        </ListItem.Content>
      </ListItem>
  )

  ////
  const [filteredPoints, setFilteredPoints] = useState<Trip[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<Trip | null>(null);
  const [shownPoint, setShownPoint] = useState("");
  
  const findTrip = (query) => {
    setShownPoint(query);
    setSelectedPoint(null);
    if (query) {
      const regex = new RegExp(`${query.trim()}`, 'i');
      setFilteredPoints(stubTrips.filter((point) => point.name.search(regex) >= 0));
    } else {
      setFilteredPoints([]);
    }
  };
  ////
  
  return (
      <SafeAreaView style={tw("flex flex-col h-full")}>
        
        <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
          <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
        </View>

        <View style={tw("flex-row mt-10 absolute inset-0 z-10")}>
          <Autocomplete
              data={filteredPoints}
              placeholder="Point de départ"
              value={shownPoint}
              onChangeText={(text) => findTrip(text)}
              flatListProps={{
                renderItem: ({item}) => (
                    <TouchableOpacity
                        onPress={() => {
                          setSelectedPoint(item);
                          setShownPoint(item.name);
                          setFilteredPoints([]);
                        }}>
                      <AppText style={tw("flex-row bg-white py-2 pl-2")}>{item.name}</AppText>
                    </TouchableOpacity>
                ),
              }}
          />
        </View>

        
          <View style={tw("flex-row relative top-20")}>
            <FlatList style={tw("flex")}
                      data={stubTrips}
                      renderItem={renderItem}
            />
          </View>
        

      </SafeAreaView>
  );
};

export default ScheduleScreen;
