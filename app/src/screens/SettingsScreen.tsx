import React, { useContext } from "react";
import { SafeAreaView, View } from "react-native";
import { tw } from "@/api/tailwind";
import { LocationPermissionLevel } from "@/api";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { sendTrip } from "@/api/location";
import { AppContext } from "@/components/ContextProvider";

const SettingsScreen = () => {
  const { setAuthUser, setLocationPermissionLevel } = useContext(AppContext);

  return (
    <SafeAreaView style={tw("flex h-full")}>

      <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-orange")}>
        <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Paramètres</AppText>
      </View>

      <View style={tw("h-full justify-center")}>

        <AppButton
          buttonStyle={tw("bg-liane-royal rounded-full m-1 mx-10")}
          title="Envoyer le trajet courant"
          onPress={async () => { try { await sendTrip(); } catch (e) { console.log("error while sending trip :", e); } }}
        />
        <AppButton
          buttonStyle={tw("bg-liane-royal rounded-full m-1 mx-10")}
          title="Paramètres de géolocalisation"
          onPress={() => { setLocationPermissionLevel(LocationPermissionLevel.NEVER); }}
        />
        <AppButton
          buttonStyle={tw("bg-liane-royal rounded-full m-1 mx-10")}
          title="Déconnexion"
          onPress={() => { setAuthUser(undefined); }}
        />
      </View>

    </SafeAreaView>
  );
};

export default SettingsScreen;
