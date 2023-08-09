import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "@/components/ContextProvider";
import { TripCard } from "@/components/TripCard";
import { Column, Row } from "@/components/base/AppLayout";
import { LianeView } from "@/components/trip/LianeView";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { Liane } from "@/api";
import { LianeDetailQueryKey } from "@/screens/user/MyTripsScreen";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, View } from "react-native";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { checkLocationPingsPermissions, hasLocationPermission, sendLocationPings } from "@/api/service/location";
import Geolocation from "react-native-geolocation-service";
import { createReminder } from "@/api/service/notification";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppNavigation } from "@/api/navigation";
import { getTripFromLiane } from "@/components/trip/trip";
import BackgroundGeolocationService from "native-modules/geolocation";

export const ShareTripLocationScreen = WithFullscreenModal(
  WithFetchResource<Liane>(
    ({ data: liane }) => {
      const { services, user } = useContext(AppContext);
      const { navigation } = useAppNavigation();
      const insets = useSafeAreaInsets();
      const [isTimePickerVisible, setTimePickerVisible] = useState(false);
      const [hasPingsPermissions, setHasPingsPermissions] = useState<boolean | undefined>(undefined);
      const now = new Date();

      const startGeoloc = () => {
        BackgroundGeolocationService.enableLocation()
          .then(async () => {
            try {
              const trip = getTripFromLiane(liane, user!);
              await sendLocationPings(liane.id!, trip.wayPoints);
              navigation.navigate("LianeDetail", { liane });
            } catch (e) {
              console.warn(e);
            }
          })
          .catch(e => {
            console.warn(e);
            Alert.alert("Localisation requise", "Liane a besoin de suivre votre position pour pouvoir valider votre trajet.");
          });
      };
      const delay = async (d: Date) => {
        await services.liane.warnDelay(liane.id!, (d.getTime() - now.getTime()) / 1000);
        await createReminder(liane.id!, liane.wayPoints[0].rallyingPoint, d);
      };

      useEffect(() => {
        const askPermissions = async (): Promise<boolean> => {
          const locationPermission = await hasLocationPermission();

          if (!locationPermission) {
            return askPermissions();
          } else {
            return await checkLocationPingsPermissions();
          }
        };
        askPermissions().then(setHasPingsPermissions);
      }, []);

      if (!hasPingsPermissions) {
        if (hasPingsPermissions === false) {
          return <PermissionsWizard onGranted={setHasPingsPermissions} />;
        }
        return null;
      }
      if (!liane) {
        return <ActivityIndicator />;
      }

      const tripContent = <LianeView liane={liane} />;
      const dateTime = `${formatMonthDay(new Date(liane.departureTime))} à ${formatTime(new Date(liane.departureTime))}`;
      const headerDate = (
        <Row spacing={8}>
          <AppIcon name={"calendar-outline"} />
          <AppText style={{ fontSize: 16 }}>{dateTime}</AppText>
        </Row>
      );

      return (
        <Column style={{ flexGrow: 1, flex: 1, marginBottom: insets.bottom }} spacing={16}>
          <View style={{ paddingVertical: 24 }}>
            <TripCard header={headerDate} content={tripContent} />
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            <AppText style={{ color: AppColors.white, fontSize: 18 }} numberOfLines={-1}>
              Votre trajet va commencer.{"\n\n"}
              Démarrez le suivi de votre position pour permettre à Liane de valider votre trajet.
            </AppText>
          </View>
          <View style={{ flex: 1 }} />
          <Column spacing={8} style={{ paddingHorizontal: 24, alignItems: "center" }}>
            <AppButton title={"Démarrer le suivi"} icon={"play-circle-outline"} color={AppColors.orange} onPress={startGeoloc} kind={"circular"} />
            <AppButton
              title={"Décaler le départ"}
              icon={"clock-outline"}
              color={AppColorPalettes.gray[300]}
              foregroundColor={defaultTextColor(AppColors.white)}
              onPress={() => setTimePickerVisible(true)}
              kind={"circular"}
            />
          </Column>
          <DateTimePickerModal
            isVisible={isTimePickerVisible}
            mode="time"
            minimumDate={now}
            maximumDate={new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)}
            date={now}
            display={"inline"}
            confirmTextIOS={"Valider"}
            cancelTextIOS={"Annuler"}
            onConfirm={d => {
              setTimePickerVisible(false);
              delay(d).catch(e => console.warn(e));
            }}
            onCancel={() => {
              setTimePickerVisible(false);
            }}
            onChange={() => {
              if (Platform.OS === "android") {
                setTimePickerVisible(false);
              }
            }}
          />
        </Column>
      );
    },
    (repository, params) => {
      if (typeof params.liane === "string") {
        return repository.liane.get(params.liane);
      } else {
        return params.liane;
      }
    },
    params => LianeDetailQueryKey(params.liane)
  ),
  ""
);

const PermissionsWizard = (props: { onGranted: (granted: boolean) => void }) => {
  const requestBackgroundGeolocation = async () => {
    if (Platform.OS === "ios") {
      const status = await Geolocation.requestAuthorization("always");

      if (status === "granted") {
        return true;
      }

      if (status === "denied") {
        Alert.alert("Localisation requise", "Liane a besoin de suivre votre position pour pouvoir valider votre trajet.");
      }

      if (status === "disabled") {
        const openSetting = () => {
          Linking.openSettings().catch(() => {
            if (__DEV__) {
              console.warn("[LOCATION] Unable to open settings");
            }
          });
        };
        Alert.alert("Localisation requise", `Activez la géolocalisation pour permettre à Liane d'utiliser votre position.`, [
          { text: "Go to Settings", onPress: openSetting },
          { text: "Don't Use Location", onPress: () => {} }
        ]);
      }
    } else if (Platform.OS === "android") {
      const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }
      if (status === PermissionsAndroid.RESULTS.DENIED || status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
      }
    }
    return false;
  };

  return (
    <Column style={{ alignItems: "center" }} spacing={16}>
      <AppText>
        Liane a besoin de suivre votre position tout au long de votre trajet pour pouvoir le valider. Pour cela accordez l'accès à votre position même
        lorsque l'application est fermée.
      </AppText>
      <AppButton
        title={"Autoriser la géolocalisation"}
        color={AppColors.orange}
        onPress={() => requestBackgroundGeolocation().then(props.onGranted)}
      />
    </Column>
  );
};
