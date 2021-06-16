import React, { useContext, useState } from "react";
import { View, StyleSheet, StyleProp } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { Header } from "react-native-elements";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import {Button, Menu, Divider, Provider} from "react-native-paper";


type HeaderMenuProps = {
  name?: string
};

const HeaderMenu = ({ name }:HeaderMenuProps) => {

  const { setAuthUser } = useContext(AppContext);
  const [state, setState] = useState(false);
  const openMenu = () => {
    setState(true);
  };
  const closeMenu = () => {
    setState(false);
  };
  return (
      <View style={tw("pt-8 items-center")}>
              <Header
                  leftComponent={(
                      <Provider>
                          <Menu
                              visible={state}
                              onDismiss={closeMenu}
                              anchor={
                                  <AppButton iconStyle={tw("text-2xl text-white")}
                                             icon="menu"
                                             onPress={openMenu} />
                              }
                          >
                              <Menu.Item onPress={() => {}} title="Paramètres de géolocalisation" />
                              <Divider />
                              <Menu.Item icon="exit-to-app" onPress={() => setAuthUser(undefined)} title="Déconnexion" />
                          </Menu>
                      </Provider>
                  )}
                  centerComponent={<AppText style={tw("text-3xl text-white")}>{name}</AppText>}

              />
      
    </View>
  );
};

const styles = StyleSheet.create({
    menu : {
        position : 'absolute',
        zIndex : 1,
    }
    }
)

export default HeaderMenu;
