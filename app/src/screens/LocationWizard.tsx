import React, { useCallback, useContext } from "react";
import { Alert, Image, ImageBackground, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Location from "expo-location";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/ContextProvider";
import { NavigationParamList } from "@/components/Navigation";
import { tw } from "@/api/tailwind";

const image = require("@/assets/images/bg-mountains.jpg");
const logo = require("@/assets/logo_white.png");

type LocationWizardRouteProp = RouteProp<NavigationParamList, "LocationWizard">;

type LocationWizardNavigationProp = StackNavigationProp<NavigationParamList, "LocationWizard">;

type LocationWizardProps = {
  route: LocationWizardRouteProp;
  navigation: LocationWizardNavigationProp;
};

function getWizardText(step: number) {
  switch (step) {
    case 0:
      return (
        <AppText
          style={tw("text-center text-lg text-gray-500 mt-20")}
        >
          <AppText>
            Covoiturer à la campagne&nbsp;
          </AppText>
          <AppText
            style={tw("font-bold text-gray-800")}
          >
            en toute liberté
          </AppText>
        </AppText>
      );
    case 1:
      return (
        <View style={tw("flex items-center")}>
          <AppText
            style={tw("text-center text-lg text-white font-bold mt-5")}
          >
            je propose mes trajets du quotidien entre des points pré-établits
          </AppText>
          <View style={tw("flex items-start bg-gray-100 p-4 opacity-80 mt-5")}>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                1
              </AppText>
              <AppText style={tw("text-lg font-bold text-gray-600 uppercase")}>
                je reste anonyme
              </AppText>
            </View>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                2
              </AppText>
              <AppText style={tw("text-lg font-bold text-gray-600 uppercase")}>
                je reçois des demandes
              </AppText>
            </View>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("bg-gray-900 text-white font-bold text-center rounded-full py-1 px-3 m-1 mr-2")}>
                3
              </AppText>
              <AppText style={tw("text-lg font-bold text-gray-600 uppercase")}>
                j&apos;accepte ou pas, sans me justifier
              </AppText>
            </View>

          </View>
        </View>
      );
    default:
    case 2:
      return (
        <View style={tw("flex items-center")}>
          <AppText style={tw("text-center text-lg text-white mt-5")}>
            c&apos;est un acte citoyen
          </AppText>
          <AppText style={tw("text-center text-lg text-gray-600 mt-5")}>
            j&apos;autorise liane à lire ma position GPS
            pour permettre le partage de mes trajets
          </AppText>
          <View style={tw("flex items-center bg-gray-100 p-2 opacity-80 mt-5")}>
            <AppText style={tw("text-lg font-bold text-gray-800 uppercase")}>c&apos;est le seul usage</AppText>
          </View>
        </View>
      );
  }
}

function getButtonText(step: number) {
  switch (step) {
    case 0:
      return "J'y vais";
    case 1:
      return "C'est ma liberté";
    default:
    case 2:
      return "Quand l'application est active";
    case 3:
      return "Toujours";
    case 4:
      return "Jamais";
  }
}

const LocationWizard = ({ route, navigation }: LocationWizardProps) => {
  const { setLocationPermissionGranted } = useContext(AppContext);
  const { step = 0 } = route.params;

  const askPermissionDialog = async () => {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground) {
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
              const permission = await Location.requestBackgroundPermissionsAsync();
              setLocationPermissionGranted(permission.status === "granted");
            }
          }
        ],
        { cancelable: true }
      );
    }
  };

  const allowBackgroundLocation = useCallback(async () => {
    const permission = await Location.getBackgroundPermissionsAsync();
    if (permission && permission.status === "granted") {
      setLocationPermissionGranted(true);
    } else {
      await askPermissionDialog();
    }
  }, [setLocationPermissionGranted]);

  const next = useCallback(async () => {
    if (step < 2) {
      navigation.push("LocationWizard", { step: step + 1 });
    } else {
      await allowBackgroundLocation();
    }
  }, [step]);

  return (
    <ImageBackground source={image} style={tw("h-full min-h-full")} resizeMode="cover">
      <View style={tw("h-20 items-center mx-20 mt-32")}>
        <Image
          style={tw("flex-1 w-64")}
          source={logo}
          resizeMode="contain"
        />
      </View>
      <View>
        {getWizardText(step)}
        <AppButton
          buttonStyle={tw("bg-orange-light text-white font-bold py-2 px-1 mr-4 ml-4 my-3 rounded")}
          titleStyle={tw("text-xl text-white font-bold ")}
          onPress={next} // Popup for foreground permission
          title={getButtonText(step)}
        />
        {step === 2
          && (
          <>
            <AppButton
              buttonStyle={tw("bg-orange-light text-white font-bold py-2 px-1 mr-4 ml-4 my-3 rounded")}
              titleStyle={tw("text-xl text-white font-bold ")}
              onPress={next} // Popup for background permission
              title={getButtonText(step + 1)}
            />
            <AppButton
              buttonStyle={tw("bg-orange-light text-white font-bold py-2 px-1 mr-4 ml-4 my-3 rounded")}
              titleStyle={tw("text-xl text-white font-bold ")}
              onPress={next} // Popup saying you cannot use Liane ?
              title={getButtonText(step + 2)}
            />
          </>
          )}
      </View>
    </ImageBackground>
  );
};

export default LocationWizard;
