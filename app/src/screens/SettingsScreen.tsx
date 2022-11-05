import React, { useContext } from "react";
import { SafeAreaView, View } from "react-native";
import { LocationPermissionLevel } from "@/api";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/ContextProvider";

const SettingsScreen = () => {
  const { setAuthUser, setLocationPermission } = useContext(AppContext);

  return (
    <SafeAreaView className="h-full bg-gray-700">

      <View className="pt-5 pb-5 flex-row items-center">
        <AppText className="absolute text-2xl text-center text-white w-full">Paramètres</AppText>
      </View>

      <View className="flex h-full justify-center m-2">
        <AppButton
          className="m-2"
          color="yellow"
          title="Paramètres de géolocalisation"
          onPress={() => { setLocationPermission(LocationPermissionLevel.NEVER); }}
        />
        <AppButton
          className="m-2"
          color="orange"
          title="Déconnexion"
          onPress={() => { setAuthUser(undefined); }}
        />
      </View>

    </SafeAreaView>
  );
};

export default SettingsScreen;
