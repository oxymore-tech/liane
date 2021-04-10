import React, { useCallback, useContext, useState } from "react";
import {
  Alert, Image, ImageBackground, Linking, Platform, View
} from "react-native";
import { AppButton } from "@components/base/AppButton";
import { AppText } from "@components/base/AppText";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { tailwind } from "@api/tailwind";
import * as IntentLauncher from "expo-intent-launcher";
import * as Constants from "expo-constants";
import { Permissions } from "react-native-unimodules";
import { AppContext } from "@components/ContextProvider";

const image = require("@assets/images/Mountains_smartphone.jpeg");
const logo = require("@assets/logo_white.png");

type Steps = 0 | 1 | 2;

type RootStackParamList = {
  LocationWizard: { step?: Steps };
};

type LocationWizardRouteProp = RouteProp<RootStackParamList, "LocationWizard">;

type LocationWizardNavigationProp = StackNavigationProp<RootStackParamList, "LocationWizard">;

type LocationWizardProps = {
  route: LocationWizardRouteProp;
  navigation: LocationWizardNavigationProp;
};

function getWizardText(step: Steps) {
  switch (step) {
    case 0:
      return (
        <AppText
          style={tailwind("text-center text-lg text-gray-500 mt-20")}
        >
          <AppText>
            Covoiturer à la campagne&nbsp;
          </AppText>
          <AppText
            style={tailwind("font-bold text-gray-800")}
          >
            en toute liberté
          </AppText>
        </AppText>
      );
    case 1:
      return (
        <View style={tailwind("flex items-center")}>
          <AppText
            style={tailwind("text-center text-lg text-white font-bold mt-5")}
          >
            je propose mes trajets du quotidien entre des points pré-établits
          </AppText>
          <View style={tailwind("flex items-start bg-gray-100 p-4 opacity-80 mt-5")}>
            <View style={tailwind("flex flex-row items-center")}>
              <AppText style={tailwind("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                1
              </AppText>
              <AppText style={tailwind("text-lg font-bold text-gray-600 uppercase")}>
                je reste anonyme
              </AppText>
            </View>
            <View style={tailwind("flex flex-row items-center")}>
              <AppText style={tailwind("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                2
              </AppText>
              <AppText style={tailwind("text-lg font-bold text-gray-600 uppercase")}>
                je reçois des demandes
              </AppText>
            </View>
            <View style={tailwind("flex flex-row items-center")}>
              <AppText style={tailwind("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                3
              </AppText>
              <AppText style={tailwind("text-lg font-bold text-gray-600 uppercase")}>
                j&apos;accepte ou pas, sans me justifier
              </AppText>
            </View>

          </View>
        </View>
      );
    default:
    case 2:
      return (
        <View style={tailwind("flex items-center")}>
          <AppText style={tailwind("text-center text-lg text-white mt-5")}>
            c&apos;est un acte citoyen
          </AppText>
          <AppText style={tailwind("text-center text-lg text-gray-600 mt-5")}>
            en autorisant liane à lire ma position GPS
          </AppText>
          <View style={tailwind("flex items-center bg-gray-100 p-4 opacity-80 mt-5")}>
            <AppText style={tailwind("text-lg font-bold text-gray-600")}>
              je mets à disposition mes trajets localement
              {" "}
            </AppText>
            <AppText style={tailwind("text-lg font-bold text-gray-800 uppercase")}>c&apos;est le seul usage</AppText>
          </View>
        </View>
      );
  }
}

function getButtonText(step: Steps) {
  switch (step) {
    case 0:
      return "J'y vais";
    case 1:
      return "C'est ma liberté";
    default:
    case 2:
      return "J'autorise";
  }
}

const pkg = Constants.default.manifest.releaseChannel
  ? Constants.default.manifest.android.package
  : "host.exp.exponent";

const LocationWizard = ({ route, navigation }: LocationWizardProps) => {
  const { setLocationPermissionGranted } = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const { step = 0 } = route.params;

  const askPermissionDialog = () => {
    Alert.alert(
      "Information",
      "Liane collecte la position GPS de votre téléphone pour permettre l'enregistrement anonyme "
      + "de vos trajets même lorsque l'application est fermée ou n'est pas en cours d'utilisation.",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Ok",
          onPress: async () => {
            const { status } = await Permissions.askAsync(Permissions.LOCATION);
            setLocationPermissionGranted(status === "granted");
          }
        }
      ],
      { cancelable: true }
    );
  };

  const openSettings = async () => {
    const permission = await Permissions.getAsync(Permissions.LOCATION);
    if (permission) {
      if (permission.status === "granted") {
        navigation.navigate("");
      } else if (!permission.canAskAgain) {
        if (Platform.OS === "ios") {
          await Linking.openURL("app-settings:");
        } else {
          await IntentLauncher.startActivityAsync(IntentLauncher.ACTION_APPLICATION_DETAILS_SETTINGS, { data: `package:${pkg}` });
        }
        setOpen(true);
      } else {
        askPermissionDialog();
      }
    } else {
      askPermissionDialog();
    }
  };

  const next = useCallback(async () => {
    if (step === 2) {
      await openSettings();
    } else {
      navigation.push("LocationWizard", { step: step + 1 });
    }
  }, [step]);

  return (
    <ImageBackground source={image} style={tailwind("h-full min-h-full")} resizeMode="cover">
      <View style={tailwind("h-20 items-center mx-20 mt-32")}>
        <Image
          style={tailwind("flex-1 w-64")}
          source={logo}
          resizeMode="contain"
        />
      </View>
      <View>
        {getWizardText(step)}
        <AppButton
          buttonStyle={tailwind("rounded-3xl p-4 m-20 bg-orange-light")}
          titleStyle={tailwind(`text-xl text-white font-bold ${step === 2 ? "text-orange" : ""}`)}
          onPress={next}
          title={getButtonText(step)}
        />
      </View>
    </ImageBackground>
  );
};

export default LocationWizard;
