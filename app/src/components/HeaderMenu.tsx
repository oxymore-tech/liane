import React, { useContext } from "react";
import { View } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { sendLocations } from "@/api/location-task";
import { Header } from "react-native-elements";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger
} from "react-native-popup-menu";

type HeaderMenuProps = {
  name?: string
};

const HeaderMenu = ({ name }:HeaderMenuProps) => {
  // name = name || "Liane";
  const { setAuthUser } = useContext(AppContext);

  return (
    <View>
      <Header
        leftComponent={(
          /* <AppButton
            iconStyle={tw("text-2xl text-white")}
            icon="menu"
            onPress={() => sendLocations()}
          /> */
          <Menu>
            <MenuTrigger text="Select action" />
            <MenuOptions>
              <MenuOption onSelect={() => alert("Save")} text="Save" />
              <MenuOption onSelect={() => alert("Delete")}>
                <AppText style={tw("text-3xl text-white")}>Bouton 1</AppText>
              </MenuOption>
              <MenuOption onSelect={() => alert("Not called")} disabled text="Disabled" />
            </MenuOptions>
          </Menu>
                )}
        centerComponent={<AppText style={tw("text-3xl text-white")}>{name}</AppText>}
        rightComponent={(
          <AppButton
            iconStyle={tw("text-2xl text-white")}
            icon="exit"
            onPress={() => setAuthUser(undefined)}
          />
                )}
      />
    </View>
  );
};
export default HeaderMenu;