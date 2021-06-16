import React, { useContext, useState } from "react";
import { View } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { LocationPermissionLevel } from "@/api";

// const Stack = createStackNavigator();

type HeaderMenuProps = {
  name?: string
};

const HeaderMenu = ({ name }:HeaderMenuProps) => {
  const { setAuthUser, setLocationPermissionLevel } = useContext(AppContext);
  const [open, setOpen] = useState(false);

  const chooseAction = () => {
    console.log(open);
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  return (
    <View>

      {open
        ? (
          <View style={tw("pt-6 pb-4 flex-row items-center bg-blue-300")}>
            <AppButton
              buttonStyle={tw("bg-blue-300 ")}
              iconStyle={tw("text-3xl font-bold text-white")}
              icon="close-outline"
              onPress={chooseAction}
            />
            <AppText style={tw("text-3xl text-white text-center ")}>{name}</AppText>
          </View>
        )
        : (
          <View style={tw("pt-6 pb-4 flex-row items-center bg-blue-500")}>
            <AppButton
              buttonStyle={tw("bg-blue-500 ")}
              iconStyle={tw("text-3xl text-white")}
              icon="menu"
              onPress={chooseAction}
            />
            <AppText style={tw("text-3xl text-white text-center ")}>{name}</AppText>
          </View>
        )}

      {open
        ? (
          <View style={tw("bg-blue-300 p-4")}>
            <AppButton
              buttonStyle={tw("bg-blue-500 ml-10 mr-10")}
              title="Paramètres de géolocalisation"
              onPress={() => { setLocationPermissionLevel(LocationPermissionLevel.NEVER); }}
            />
            <AppButton
              buttonStyle={tw("bg-blue-500 mt-1 ml-10 mr-10")}
              title="Déconnexion"
              onPress={() => { setAuthUser(); }}
            />
          </View>
        )
        : null}

    </View>

  );

};

export default HeaderMenu;
