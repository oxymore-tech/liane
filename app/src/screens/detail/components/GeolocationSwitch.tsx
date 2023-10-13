import { Liane } from "@liane/common";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { ActivityIndicator, Alert, StyleSheet, Switch } from "react-native";
import { LianeGeolocation } from "@/api/service/location";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { getTripFromLiane } from "@/components/trip/trip";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { useAppNavigation } from "@/api/navigation";
import { useIsFocused } from "@react-navigation/native";

export const startGeolocationService = async (liane: Liane, force: boolean = false) => {
  const user = await AppStorage.getUser();
  const me = liane.members.find(l => l.user.id === user!.id)!;
  if (force || (me.geolocationLevel && me.geolocationLevel !== "None")) {
    //TODO: return this promise with an error specifying if gps is disable or if service failed to start
    // and let the caller display it (through Alert or notification) to the user
    LianeGeolocation.requestEnableGPS()
      .then(async () => {
        try {
          const trip = getTripFromLiane(liane, user!.id!);
          await LianeGeolocation.startSendingPings(liane.id!, trip.wayPoints);
        } catch (e) {
          AppLogger.error("GEOLOC", e);
        }
      })
      .catch(e => {
        AppLogger.error("GEOLOC", e);
        Alert.alert("Localisation requise", "Liane a besoin de suivre votre position pour pouvoir valider votre trajet.");
      });
  }
};
export const GeolocationSwitch = ({ liane: match }: { liane: Liane }) => {
  const { user } = useContext(AppContext);
  const geoloc = useTripGeolocation();
  const { services } = useContext(AppContext);
  const me = useMemo(() => match.members.find(l => l.user.id === user!.id)!, [match.members, user]);
  const [isTracked, setTracked] = useState<boolean | undefined>(me.geolocationLevel === "Hidden" || me.geolocationLevel === "Shared");
  const { navigation } = useAppNavigation();

  const [geolocPermission, setGeolocPermission] = useState<boolean | null>(null);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) {
      return;
    }
    LianeGeolocation.checkBackgroundGeolocationPermission().then(p => setGeolocPermission(p));
  }, [focused]);

  const setGeolocalisationEnabled = async (enabled: boolean) => {
    const oldValue = isTracked;
    if (enabled && !geolocPermission) {
      navigation.navigate("TripGeolocationWizard", { showAs: null, lianeId: match.id });
      return;
    }

    setTracked(undefined);
    if (geoloc === undefined || geoloc.liane.id !== match.id) {
      services.liane
        .setTracked(match.id!, enabled ? "Shared" : "None")
        .then(() => setTracked(enabled))
        .catch(() => setTracked(oldValue));
    } else if (!geoloc.isActive) {
      services.liane
        .setTracked(match.id!, enabled ? "Shared" : "None")
        .then(() => {
          setTracked(enabled);
          if (enabled) {
            startGeolocationService(match, true);
          }
        })
        .catch(() => setTracked(oldValue));
    } else if (!enabled) {
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
            await LianeGeolocation.stopSendingPings();
            services.liane
              .setTracked(match.id!, enabled ? "Shared" : "None")
              .then(() => setTracked(enabled))
              .catch(() => setTracked(oldValue));
          },
          style: "default"
        }
      ]);
    }
  };
  if (geolocPermission === null) {
    return null;
  }

  const isTrackedLive = isTracked && (!geoloc?.liane || geoloc.liane.id === match.id);
  return (
    <Row spacing={8}>
      {isTracked !== undefined && (
        <Switch
          style={styles.geolocSwitch}
          trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
          thumbColor={geoloc?.isActive ? AppColors.white : AppColors.grayBackground}
          ios_backgroundColor={AppColors.grayBackground}
          value={isTrackedLive}
          onValueChange={setGeolocalisationEnabled}
        />
      )}
      {isTracked === undefined && <ActivityIndicator color={AppColors.primaryColor} size={"small"} />}
      <AppText style={[styles.geolocText, { color: isTrackedLive ? AppColors.primaryColor : AppColorPalettes.gray[400] }]}>Géolocalisation</AppText>
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
