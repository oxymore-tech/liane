import { LianeMatch } from "@/api";
import { useAppNavigation } from "@/api/navigation";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { Alert, StyleSheet, Switch } from "react-native";
import { cancelSendLocationPings } from "@/api/service/location";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import React from "react";

export const GeolocationSwitch = ({ liane: match }: { liane: LianeMatch }) => {
  const { navigation } = useAppNavigation();
  const geoloc = useTripGeolocation();

  const setGeolocalisationEnabled = () => {
    if (geoloc === undefined) {
      //TODO
    } else if (!geoloc.isActive) {
      navigation.navigate("ShareTripLocationScreen", { liane: match.liane });
    } else {
      Alert.alert("Arrêter la géolocalisation ?", "Vous pourrez relancer le partage en réappuyant sur ce bouton.", [
        {
          text: "Annuler",
          onPress: () => {},
          style: "cancel"
        },
        {
          text: "Continuer",
          onPress: async () => {
            // Cancel ongoing geolocation
            await cancelSendLocationPings();
          },
          style: "default"
        }
      ]);
    }
  };

  return (
    <Row spacing={8}>
      <AppText style={[styles.geolocText, { color: geoloc?.isActive ? AppColors.primaryColor : AppColorPalettes.gray[400] }]}>
        Géolocalisation
      </AppText>
      <Switch
        style={styles.geolocSwitch}
        trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
        thumbColor={geoloc?.isActive ? AppColors.white : AppColors.grayBackground}
        ios_backgroundColor={AppColors.grayBackground}
        value={geoloc?.isActive}
        onValueChange={setGeolocalisationEnabled}
      />
    </Row>
  );
};

const styles = StyleSheet.create({
  geolocText: {
    marginBottom: -2,
    alignSelf: "center"
  },
  geolocSwitch: {
    marginBottom: -4
  }
});
