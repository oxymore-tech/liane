import { getUserTrip, Trip, MemberPing } from "@liane/common";
import { useTripGeolocation } from "@/screens/detail/TripGeolocationProvider";
import { Row } from "@/components/base/AppLayout";
import { ActivityIndicator, Alert, StyleSheet, Switch } from "react-native";
import { LianeGeolocation } from "@/api/service/location";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { useAppNavigation } from "@/components/context/routing";
import { useFocusEffect } from "@react-navigation/native";
import GetLocation from "react-native-get-location";
import { GeolocationPermission } from "../../../../native-modules/geolocation";

export const startGeolocationService = async (liane: Trip, force: boolean = false) => {
  const user = await AppStorage.getUser();
  const me = liane.members.find(l => l.user.id === user!.id)!;
  if (force || (me.geolocationLevel && me.geolocationLevel !== "None")) {
    //TODO: return this promise with an error specifying if gps is disable or if service failed to start
    // and let the caller display it (through Alert or notification) to the user
    LianeGeolocation.requestEnableGPS()
      .then(async () => {
        try {
          const trip = getUserTrip(liane, user!.id!);
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

export const GeolocationSwitch = ({ liane: match }: { liane: Trip }) => {
  const { user } = useContext(AppContext);
  const geoloc = useTripGeolocation();
  const { services } = useContext(AppContext);
  const me = useMemo(() => match.members.find(l => l.user.id === user!.id)!, [match.members, user]);
  const [isTracked, setTracked] = useState<boolean | undefined>(me.geolocationLevel === "Hidden" || me.geolocationLevel === "Shared");
  const { navigation } = useAppNavigation();

  const [geolocPermission, setGeolocPermission] = useState<GeolocationPermission>();

  useFocusEffect(() => {
    LianeGeolocation.checkGeolocationPermission().then(p => setGeolocPermission(p));
  });

  const calledWhenLocationChanges = useCallback(
    async (newLocation: { latitude: number; longitude: number; time: number }) => {
      try {
        const coordinate: { lat: number; lng: number } = { lat: newLocation.latitude, lng: newLocation.longitude };
        const ping: MemberPing = {
          trip: match.id as string,
          coordinate,
          timestamp: Math.trunc(newLocation.time)
        };
        AppLogger.debug("GEOPINGS", "Send ping  APPINUSE");
        await services.location.postPing(ping);
      } catch (error) {
        AppLogger.error("GEOPINGS", error);
      }
    },
    [match.id, services.location]
  );

  useEffect(() => {
    if (geolocPermission !== GeolocationPermission.AppInUse || !isTracked) {
      return;
    }

    const intervalId = setInterval(() => {
      GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000
      })
        .then(location => calledWhenLocationChanges(location))
        .catch(error => {
          const { code, message } = error;
          console.warn(code, message);
        });
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [calledWhenLocationChanges, geolocPermission, isTracked]);

  const setGeolocalisationEnabled = async (enabled: boolean) => {
    const oldValue = isTracked;
    if (enabled && geolocPermission === GeolocationPermission.Denied) {
      navigation.navigate("TripGeolocationWizard", { showAs: null, lianeId: match.id });
      return;
    }

    setTracked(undefined);
    if (geoloc === undefined || geoloc.trip.id !== match.id || match.state !== "Started") {
      services.trip
        .setTracked(match.id!, enabled ? "Shared" : "None")
        .then(() => setTracked(enabled))
        .catch(() => setTracked(oldValue));
    } else if (!geoloc.isActive) {
      services.trip
        .setTracked(match.id!, enabled ? "Shared" : "None")
        .then(() => {
          setTracked(enabled);
          if (enabled && geolocPermission === GeolocationPermission.Background) {
            startGeolocationService(match, true);
          }
        })
        .catch(() => setTracked(oldValue));
    } else if (!enabled) {
      Alert.alert("Arrêter la géolocalisation ?", "Vous pourrez relancer le partage en réappuyant sur ce bouton.", [
        {
          text: "Annuler",
          onPress: () => {
            setTracked(oldValue);
          },
          style: "cancel"
        },
        {
          text: "Continuer",
          onPress: async () => {
            // Cancel ongoing geolocation
            await LianeGeolocation.stopSendingPings();
            services.trip
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

  const isTrackedLive = isTracked && (!geoloc?.trip || geoloc.trip.id === match.id);
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
