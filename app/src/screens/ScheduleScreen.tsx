import React from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import {ListItem} from "react-native-elements";

const stubTrips = [
  {
    name: "Départ école",
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

  return (
      <SafeAreaView style={tw("flex h-full")}>
        <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
          <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
        </View>

        <FlatList style={tw("flex")}
                  data={stubTrips}
                  renderItem={renderItem}
        />

      </SafeAreaView>
  );
};

export default ScheduleScreen;
