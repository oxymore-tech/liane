import React, { useContext, useState } from "react";
import { View } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { LocationPermissionLevel } from "@/api";

// const Stack = createStackNavigator();

type HeaderMenuProps = {
  name: string
};

const HeaderMenu = ({ name }:HeaderMenuProps) => {
  const { setAuthUser, setLocationPermissionLevel } = useContext(AppContext);
  const [open, setOpen] = useState(false);

  const chooseAction = () => {
    setOpen(!open);
  };

  return (
    <View>
      {open
        ? (
          <>
            <View style={tw("pt-5 pb-5 flex-row items-center bg-blue-500")}>
              <AppText style={tw("absolute text-2xl text-center text-white w-full")}>{name}</AppText>
              <AppButton
                buttonStyle={tw("bg-blue-500")}
                iconStyle={tw("text-3xl font-bold text-white")}
                icon="close-outline"
                onPress={chooseAction}
              />
            </View>
            <View style={tw("bg-blue-500 p-4")}>
              <AppButton
                buttonStyle={tw("bg-blue-600 ml-10 mr-10")}
                title="Paramètres de géolocalisation"
                onPress={() => { setLocationPermissionLevel(LocationPermissionLevel.NEVER); }}
              />
              <AppButton
                buttonStyle={tw("bg-blue-600 mt-1 ml-10 mr-10")}
                title="Déconnexion"
                onPress={() => { setAuthUser(undefined); }}
              />
            </View>
          </>

        )
        : (
          <View style={tw("pt-5 pb-5 flex-row items-center bg-blue-500")}>
            <AppText style={tw("absolute text-2xl text-white text-center w-full ")}>{name}</AppText>
            <AppButton
              buttonStyle={tw("bg-blue-500 ")}
              iconStyle={tw("text-3xl text-white")}
              icon="menu"
              onPress={chooseAction}
            />

          </View>
        )}
    </View>

  );

};

export default HeaderMenu;
