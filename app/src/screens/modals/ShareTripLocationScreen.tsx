import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "@/components/context/ContextProvider";
import { TripCard } from "@/components/TripCard";
import { Column, Row } from "@/components/base/AppLayout";
import { LianeView } from "@/components/trip/LianeView";
import { WithFetchResource } from "@/components/base/WithFetchResource";
import { Liane } from "@/api";
import { LianeDetailQueryKey } from "@/screens/user/MyTripsScreen";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { ActivityIndicator, Alert, Linking, Platform, View } from "react-native";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { checkLocationPingsPermissions, sendLocationPings } from "@/api/service/location";
import { createReminder } from "@/api/service/notification";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppNavigation } from "@/api/navigation";
import { getTripFromLiane } from "@/components/trip/trip";
import BackgroundGeolocationService from "native-modules/geolocation";
import { PERMISSIONS, request } from "react-native-permissions";
import { useAppState } from "@react-native-community/hooks";

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
              navigation.replace("LianeDetail", { liane });
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

      const appState = useAppState();

      useEffect(() => {
        if (appState === "active") {
          checkLocationPingsPermissions().then(setHasPingsPermissions);
        } else {
          setHasPingsPermissions(undefined);
        }
      }, [appState]);

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
      if (parseInt(Platform.Version, 10) < 13) {
        const status = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
        if (status === "granted") {
          return true;
        } else if (status === "denied") {
          Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
        } else if (status === "unavailable") {
          Alert.alert(`Erreur: géolocalisation indisponible.`);
        } else if (status === "blocked") {
          const openSetting = () => {
            Linking.openSettings().catch(() => {
              if (__DEV__) {
                console.warn("[LOCATION] Unable to open settings");
              }
            });
          };
          Alert.alert("Localisation requise", `Activez la géolocalisation pour permettre à Liane d'utiliser votre position.`, [
            { text: "Modifier les paramètres", onPress: openSetting },
            { text: "Ignorer", onPress: () => {} }
          ]);
        }
      } else {
        await Linking.openSettings();
      }
    } else if (Platform.OS === "android") {
      if (Platform.Version <= 29) {
        const status = await request(
          Platform.Version === 29 ? PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        );
        console.log(status);
        if (status === "granted") {
          return true;
        } else if (status === "denied") {
          Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
        } else if (status === "unavailable") {
          Alert.alert(`Erreur: géolocalisation indisponible.`);
        } else if (status === "blocked") {
          const openSetting = () => {
            Linking.openSettings().catch(() => {
              if (__DEV__) {
                console.warn("[LOCATION] Unable to open settings");
              }
            });
          };
          Alert.alert("Localisation requise", `Pour continuez, allez dans "Autorisations" > "Localisation" puis sélectionnez "Toujours autoriser".`, [
            { text: "Modifier les paramètres", onPress: openSetting },
            { text: "Ignorer", onPress: () => {} }
          ]);
        }
      } else {
        await Linking.openSettings();
      }
    }
    return false;
  };

  return (
    <Column style={{ alignItems: "center" }} spacing={16}>
      <AppText numberOfLines={4} style={{ color: AppColors.white, fontSize: 15 }}>
        Liane a besoin de suivre votre position tout au long de votre trajet pour pouvoir le valider.
      </AppText>
      <Row spacing={16} style={{ alignItems: "center" }}>
        <AppIcon name={"info-outline"} color={AppColors.white} />

        <AppText numberOfLines={4} style={{ color: AppColors.white, fontSize: 15 }}>
          Accordez l'accès à votre position même lorsque l'application est fermée.
        </AppText>
      </Row>

      <Row spacing={16} style={{ alignItems: "center" }}>
        <AppIcon name={"info-outline"} color={AppColors.white} opacity={0} />

        {Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 13 && (
          <AppText numberOfLines={5} style={{ color: AppColors.white, fontSize: 14 }}>
            1. Appuyez sur "Autoriser la géolocalisation"{"\n"}
            2. Allez dans "Position"{"\n"}
            3. Sélectionnez "Toujours" dans la liste des autorisations
          </AppText>
        )}
        {Platform.OS === "ios" && parseInt(Platform.Version, 10) < 13 && (
          <AppText numberOfLines={5} style={{ color: AppColors.white, fontSize: 14 }}>
            1. Appuyez sur "Autoriser la géolocalisation"{"\n"}
            2. Sélectionnez "Toujours" dans la liste des autorisations
          </AppText>
        )}
        {Platform.OS === "android" && Platform.Version === 29 && (
          <AppText numberOfLines={5} style={{ color: AppColors.white, fontSize: 14 }}>
            1. Appuyez sur "Autoriser la géolocalisation"{"\n"}
            2. Sélectionnez "Toujours autoriser" dans la liste des autorisations
          </AppText>
        )}
        {Platform.OS === "android" && Platform.Version > 29 && (
          <AppText numberOfLines={5} style={{ color: AppColors.white, fontSize: 14 }}>
            1. Appuyez sur "Autoriser la géolocalisation"{"\n"}
            2. Allez dans "Permissions"{"\n"}
            3. Sélectionnez "Position"{"\n"}
            2. Sélectionnez "Toujours autoriser" dans la liste des autorisations
          </AppText>
        )}
      </Row>
      <AppButton
        title={"Autoriser la géolocalisation"}
        color={AppColors.orange}
        onPress={() => requestBackgroundGeolocation().then(props.onGranted)}
      />
    </Column>
  );
};
