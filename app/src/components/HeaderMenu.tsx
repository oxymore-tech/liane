import React, { useContext, useState } from "react";
import { StatusBar, View } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { getColor, tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { LocationPermissionLevel } from "@/api";
import { sendTrip } from "@/api/location";

type HeaderMenuProps = {
  name: string
};

function HeaderMenu({ name }:HeaderMenuProps) {
  const { setAuthUser, setLocationPermissionLevel } = useContext(AppContext);
  const [open, setOpen] = useState(false);

  const chooseAction = () => {
    setOpen(!open);
  };

  return (
    <View>
      <StatusBar
        animated
        backgroundColor={getColor("liane-blue")}
      />
      {open
        ? (
          <>
            <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
              <AppText style={tw("absolute text-2xl text-center text-white w-full")}>{name}</AppText>
              <AppButton
                buttonStyle={tw("bg-liane-blue")}
                iconStyle={tw("text-3xl font-bold text-white")}
                icon="close-outline"
                onPress={chooseAction}
              />
            </View>
            <View style={tw("bg-liane-blue p-4")}>
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
          </>
        )
        : (
          <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
            <AppText style={tw("absolute text-2xl text-white text-center w-full ")}>{name}</AppText>
            <AppButton
              buttonStyle={tw("bg-liane-blue")}
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
