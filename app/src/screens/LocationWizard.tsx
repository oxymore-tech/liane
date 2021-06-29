import React, { useContext, useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import { AppContext } from "@/components/ContextProvider";
import * as Location from "expo-location";
import { LocationPermissionLevel } from "@/api";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";

const logo = require("@/assets/logo_orange.png");

/**
 * Get the text of the current step.
 * @param step current step
 */
function getWizardText(step: number) {
  let view;

  switch (step) {
    case 0:
      view = (
        <ScrollView>
          <AppText style={tw("text-center text-lg text-white m-3 mt-0")}>
            Covoiturer à la campagne, en toute liberté.
            Liane relève vos trajets du quotidien entre des points pré-établis.
          </AppText>
          <AppText style={tw("text-center font-bold text-lg text-white m-3")}>
            Vos trajets sont proposés aux autres utilisateurs de façon 100% anonyme. Vous recevrez ensuite des demandes
            anonymes des autres utilisateurs, que vous pouvez refuser sans vous justifier.
          </AppText>
          <AppText style={tw("text-center text-lg text-white m-3")}>
            Pour cela Liane a besoin d&apos;accéder à vos données de géolocalisation. Vos données de géolocalisation ne sont utilisés dans aucun autre but.
          </AppText>
        </ScrollView>
      );
      break;
    case 1:
      view = (
        <ScrollView>
          <AppText style={tw("text-center text-lg text-white m-3 mt-0")}>
            Pour utiliser Liane a son potentiel maximum, elle doit pouvoir suivre votre déplacement en permanence.
          </AppText>
          <AppText style={tw("text-center font-bold text-lg text-white m-3")}>
            A quel moment voulez-vous autoriser Liane à suivre votre position ?
          </AppText>
          <AppText style={tw("text-center italic text-sm text-white m-3")}>
            Vous pourrez toujours le modifier plus tard.
          </AppText>
        </ScrollView>
      );
      break;
    default:
      view = (
        <AppText>
          Lorem ipsum.
        </AppText>
      );
  }

  return view;
}

/**
 * Alter template.
 */
function alert(message: string, callback: Function) {
  Alert.alert(
    "Information",
    message,
    [
      {
        text: "Annuler",
        style: "cancel"
      },
      {
        text: "Continuer",
        onPress: async () => callback()
      }
    ],
    { cancelable: true }
  );
}

/**
 * React component.
 */
const LocationWizard2 = () => {
  const { setLocationPermissionLevel, authUser } = useContext(AppContext);
  console.log(authUser);
  const [step, setStep] = useState(authUser ? 1 : 0);
  console.log(step);
  const [optionalText, setOptionalText] = useState("");

  // Go to next step
  const next = () => {
    if (step < 1) {
      setStep(step + 1);
    }
  };

  // Ask for foreground tracking permission
  const requestForegroundLocPerm = async () => {
    alert("Liane collecte la position GPS de votre téléphone pour permettre l'enregistrement anonyme de vos trajets lorsque l'application est en cours d'utilisation.", async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      console.log(`New foreground permission status : ${permission.status}, ${permission.canAskAgain}`);

      if (permission) {
        if (permission.status === "granted") {
          setLocationPermissionLevel(LocationPermissionLevel.ACTIVE);
        } else if (permission.canAskAgain) {
          setOptionalText("Vous avez empêché Liane de re-demander cette permission, rendez-vous dans les paramètres pour la modifier.");
        }
      }
    }); // Important alert in order to get validated by Google
  };

  // Ask for background tracking permission
  const requestBackgroundLocPerm = async () => {
    alert("Liane collecte la position GPS de votre téléphone pour permettre l'enregistrement anonyme de vos trajets même lorsque l'application est fermée ou n'est pas en cours d'utilisation.", async () => {
      const permissionForeground = await Location.requestForegroundPermissionsAsync(); // Forced to ask for foreground perms first

      console.log(`New foreground permission status : ${permissionForeground.status}, ${permissionForeground.canAskAgain}`);
      if (permissionForeground) {
        if (permissionForeground.status === "granted") {
          const permissionBackground = await Location.requestBackgroundPermissionsAsync();
          console.log(`New background permission status : ${permissionBackground.status}, ${permissionBackground.canAskAgain}`);

          if (permissionBackground) {
            if (permissionBackground.status === "granted") {
              setLocationPermissionLevel(LocationPermissionLevel.ALWAYS);
            } else if (permissionBackground.canAskAgain) {
              setLocationPermissionLevel(LocationPermissionLevel.ACTIVE);
              setOptionalText("Vous avez empêché Liane de re-demander cette permission, rendez-vous dans les paramètres pour la modifier.");
            } else {
              setLocationPermissionLevel(LocationPermissionLevel.ACTIVE);
            }
          }
        } else if (!permissionForeground.canAskAgain) {
          setOptionalText("Vous avez empêché Liane de re-demander cette permission, rendez-vous dans les paramètres pour la modifier.");
        }
      }
    });
  };

  // Ask for no tracking (for now)
  const requestNoLocPerm = async () => {
    setLocationPermissionLevel(LocationPermissionLevel.NOT_NOW);
  };

  return (
    <View style={tw("h-full min-h-full bg-liane-yellow content-center")}>
      <View style={tw("h-10 items-center my-20")}>
        <Image
          style={tw("flex-1 w-64")}
          source={logo}
          resizeMode="contain"
        />
      </View>
      { getWizardText(step) }
      { optionalText !== "" && (<AppText style={tw("text-center text-sm text-red-600 m-2")}>{ optionalText }</AppText>) }
      { step === 0
        ? (<View><AppButton buttonStyle={tw("bg-liane-orange rounded-full m-10")} onPress={next} title="Continuer" /></View>)
        : (
          <View style={tw("my-10")}>
            <AppButton buttonStyle={tw("bg-liane-orange rounded-full mt-5 ml-10 mr-10")} onPress={requestBackgroundLocPerm} title="Toujours" />
            <AppButton buttonStyle={tw("bg-liane-orange-lighter rounded-full mt-5 ml-10 mr-10")} onPress={requestForegroundLocPerm} title="Pendant l'utilisation" />
            <AppButton buttonStyle={tw("bg-liane-orange-lighter rounded-full mt-5 ml-10 mr-10")} onPress={requestNoLocPerm} title="Jamais (pour le moment)" />
          </View>
        )}
    </View>
  );
};

export default LocationWizard2;
