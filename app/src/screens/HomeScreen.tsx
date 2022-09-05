import React from "react";
import { SafeAreaView, StatusBar, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTailwind } from "tailwind-rn";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/Navigation";

const t = scopedTranslate("Home");

export type HomeNavigationProp = NativeStackNavigationProp<NavigationParamList, "Home">;

const HomeScreen = () => {
  const tw = useTailwind();
  return (
    <SafeAreaView style={tw("flex h-full")}>
      <View>
        <StatusBar />
        <View style={tw("pt-5 pb-5 flex-row items-center bg-orange-400")}>
          <AppText style={tw("absolute text-2xl text-white text-center w-full ")}>Trajets</AppText>
        </View>
      </View>

      <View style={tw("rounded-xl bg-orange-light m-4 py-2 items-center")}>
        <AppText style={tw("text-white font-bold text-lg")}>
          {t("Bienvenue sur liane")}
        </AppText>
      </View>

    </SafeAreaView>
  );
};

export default HomeScreen;