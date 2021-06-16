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

  if (open) {
    return (
      <View>
        <View style={tw("pt-6 pb-4 flex-row items-center bg-blue-400")}>
          <AppButton
            iconStyle={tw("text-2xl text-white")}
            icon="menu"
            onPress={chooseAction}
          />
          <AppText style={tw("text-3xl text-white text-center ")}>{name}</AppText>
        </View>
        <View>
          <AppButton
            buttonStyle={tw("bg-blue-500 rounded-full mt-5 ml-10 mr-10")}
            title="Paramètres de géolocalisation"
            onPress={() => { setAuthUser(); }}
          />
          <AppButton
            buttonStyle={tw("bg-blue-500 rounded-full mt-5 ml-10 mr-10")}
            title="Déconnexion"
            onPress={() => { setLocationPermissionLevel(LocationPermissionLevel.NEVER); }}
          />
        </View>
      </View>

    );
  }

  return (
    <View style={tw("pt-6 pb-4 flex-row items-center bg-blue-400")}>
      <AppButton
        iconStyle={tw("text-2xl text-white")}
        icon="menu"
        onPress={chooseAction}
      />
      <AppText style={tw("text-3xl text-white text-center ")}>{name}</AppText>
    </View>
  );

};

export default HeaderMenu;
