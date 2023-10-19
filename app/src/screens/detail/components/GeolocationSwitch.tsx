import { Liane } from "@/api";
import { useAppNavigation } from "@/api/navigation";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { Alert, StyleSheet, Switch } from "react-native";
import { cancelSendLocationPings } from "@/api/service/location";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import React, { useContext, useMemo, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";

export const GeolocationSwitch = ({ liane: match }: { liane: Liane }) => {
  const { navigation } = useAppNavigation();
  const { user } = useContext(AppContext);
  const geoloc = useTripGeolocation();
  const { services } = useContext(AppContext);
  const me = useMemo(() => match.members.find(l => l.user.id === user!.id)!, [match.members, user]);
  const [isTracked, setTracked] = useState(me.geolocationLevel === "Hidden" || me.geolocationLevel === "Shared");

  const setGeolocalisationEnabled = (enabled: boolean) => {
    if (geoloc === undefined) {
      services.liane.setTracked(match.id!, enabled).then(() => setTracked(enabled));
    } else if (!geoloc.isActive) {
      navigation.replace("ShareTripLocationScreen", { liane: match });
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
            services.liane.setTracked(match.id!, enabled).then(() => setTracked(enabled));
          },
          style: "default"
        }
      ]);
    }
  };

  return (
    <Row spacing={8}>
      <Switch
        style={styles.geolocSwitch}
        trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
        thumbColor={geoloc?.isActive ? AppColors.white : AppColors.grayBackground}
        ios_backgroundColor={AppColors.grayBackground}
        value={isTracked && (geoloc === undefined || geoloc.isActive)}
        onValueChange={setGeolocalisationEnabled}
      />
      <AppText style={[styles.geolocText, { color: geoloc?.isActive ? AppColors.primaryColor : AppColorPalettes.gray[400] }]}>
        Géolocalisation
      </AppText>
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
