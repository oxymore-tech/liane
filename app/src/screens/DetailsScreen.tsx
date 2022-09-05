import React, { useEffect } from "react";
import { SafeAreaView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTailwind } from "tailwind-rn";
import { NavigationParamList } from "@/components/Navigation";

type DetailsRouteProp = RouteProp<NavigationParamList, "Details">;
type DetailsNavigationProp = NativeStackNavigationProp<NavigationParamList, "Details">;
type DetailsProps = {
  route: DetailsRouteProp;
  navigation: DetailsNavigationProp;
};

const DetailsScreen = ({ route, navigation }: DetailsProps) => {
  const tw = useTailwind();

  useEffect(() => {
    navigation.setOptions({ headerTitle: `Détails du trajet [ID = ${route.params.tripID}]` });
  });

  return (
    <SafeAreaView>
      <View style={tw("rounded-xl bg-gray-300 m-4 p-3 content-center")} />
    </SafeAreaView>
  );
};

export default DetailsScreen;
