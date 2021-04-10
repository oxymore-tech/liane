import React, { useContext } from "react";
import {
  Button, Image, SafeAreaView, Text, View
} from "react-native";
import tailwind from "tailwind-rn";
import { AppContext } from "@components/ContextProvider";

const HomeScreen = ({ navigation }: any) => {

  const { setAuthUser } = useContext(AppContext);

  return (
    <View>
      <SafeAreaView style={tailwind("h-full")}>
        <View style={tailwind("pt-12 items-center")}>
          <View style={tailwind("bg-blue-200 px-3 py-1 rounded-full")}>
            <Text style={tailwind("text-blue-800 font-semibold")}>
              Bienvenue sur Liane
            </Text>
          </View>
        </View>
        <View style={tailwind("container")}>
          <Image
            style={tailwind("self-center")}
            source={require("@assets/logo_mini.png")}
          />
        </View>
        <View>
          <Button title="Menu" onPress={() => navigation.openDrawer()} />
          <Button
            title="Deconnexion"
            onPress={() => setAuthUser(undefined)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;