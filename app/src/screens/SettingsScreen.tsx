import React, { useContext } from "react";
import { SafeAreaView, View } from "react-native";
import { useTailwind } from "tailwind-rn";
import { LocationPermissionLevel } from "@/api";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/ContextProvider";

const SettingsScreen = () => {
  const { setAuthUser, setLocationPermission } = useContext(AppContext);
  const tw = useTailwind();

  return (
    <SafeAreaView style={tw("flex h-full")}>

      <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-orange")}>
        <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Paramètres</AppText>
      </View>

      <View style={tw("h-full justify-center")}>
        <AppButton
          style={tw("bg-blue-800 rounded-full m-1 p-1 mx-10")}
          title="Paramètres de géolocalisation"
          onPress={() => { setLocationPermission(LocationPermissionLevel.NEVER); }}
        />
        <AppButton
          style={tw("bg-blue-800 rounded-full m-1 p-3 mx-10")}
          title="Déconnexion"
          onPress={() => { setAuthUser(undefined); }}
        />
      </View>

    </SafeAreaView>
  );
};

export default SettingsScreen;
