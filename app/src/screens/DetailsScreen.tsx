import React, { useEffect } from "react";
import { SafeAreaView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { tw } from "@/api/tailwind";
import { NavigationParamList } from "@/components/Navigation";

type DetailsRouteProp = RouteProp<NavigationParamList, "Details">;

type DetailsNavigationProp = StackNavigationProp<NavigationParamList, "Details">;

type DetailsProps = {
  route: DetailsRouteProp;
  navigation: DetailsNavigationProp;
};

const SignUpCodeScreen = ({ route, navigation }: DetailsProps) => {

  useEffect(() => {
    navigation.setOptions({ headerTitle: `Détails du trajet [ID = ${route.params.tripID}]` });
  });

  return (
    <SafeAreaView>
      <View style={tw("rounded-xl bg-gray-300 m-4 p-3 content-center")} />
    </SafeAreaView>
  );
};

export default SignUpCodeScreen;
