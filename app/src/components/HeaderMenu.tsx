import React, { useContext, useState } from "react";
import { StatusBar, View } from "react-native";
import { useTailwind } from "tailwind-rn";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { LocationPermissionLevel } from "@/api";
import { sendTrip } from "@/api/location";

type HeaderMenuProps = {
  name: string
};

function HeaderMenu({ name }:HeaderMenuProps) {
  const { setAuthUser, setLocationPermission } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const tw = useTailwind();

  const chooseAction = () => {
    setOpen(!open);
  };

  return (
    <View>
      <StatusBar
        animated
      />
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
                buttonStyle={tw("bg-blue-800 rounded-full m-1 mx-10")}
                title="Envoyer le trajet courant"
                onPress={async () => { try { await sendTrip(); } catch (e) { console.log("error while sending trip :", e); } }}
              />
              <AppButton
                buttonStyle={tw("bg-blue-800 rounded-full m-1 mx-10")}
                title="Paramètres de géolocalisation"
                onPress={() => { setLocationPermission(LocationPermissionLevel.NEVER); }}
              />
              <AppButton
                buttonStyle={tw("bg-blue-800 rounded-full m-1 mx-10")}
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
              buttonStyle={tw("bg-blue-500")}
              iconStyle={tw("text-3xl text-white")}
              icon="menu"
              onPress={chooseAction}
            />
          </View>
        )}
    </View>
  );
}

export default HeaderMenu;
