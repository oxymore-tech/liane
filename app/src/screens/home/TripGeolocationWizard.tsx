import { ActivityIndicator, Alert, ColorValue, Platform, StyleSheet, Switch, View } from "react-native";
import { Center, Column, Row, Space } from "@/components/base/AppLayout";
import React, { useContext, useEffect, useState } from "react";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { LianeGeolocation } from "@/api/service/location";
import { useAppState } from "@react-native-community/hooks";
import { AppContext } from "@/components/context/ContextProvider";
import { AppLogger } from "@/api/logger";
import { AppStorage } from "@/api/storage";
import { GeolocationLevel } from "@liane/common";
import { GeolocationPermission } from "../../../native-modules/geolocation";

export const TripGeolocationWizard = WithFullscreenModal(
  () => {
    const { route, navigation } = useAppNavigation<"TripGeolocationWizard">();
    const [page, setPage] = useState<undefined | number>(undefined);
    const [showIntroductionPage, setShowIntroductionPage] = useState(!!route.params?.showAs);
    const appState = useAppState();

    useEffect(() => {
      if (appState !== "active") {
        return;
      }
      LianeGeolocation.checkGeolocationPermission().then(permission => {
        const allowed = permission !== GeolocationPermission.Denied;
        AppStorage.getSetting("geolocation")
          .then(setting => {
            //console.log("setting", setting);
            if (setting) {
              const settingAllowed = setting !== "None";
              setPage(!allowed && settingAllowed ? 1 : 2);
            } else {
              setPage(showIntroductionPage ? 0 : 1);
            }
          })

          .catch(e => {
            AppLogger.error("GEOLOC", e);
            setPage(showIntroductionPage ? 0 : 1);
          });
      });
    }, [appState, route.params?.showAs, showIntroductionPage]);

    if (page === undefined) {
      return (
        <Center>
          <ActivityIndicator color={AppColors.primaryColor} />
        </Center>
      );
    }
    const endTutorial = () => {
      navigation.goBack();
    };
    const next = () => setPage(page + 1);
    const prev = () => setPage(page - 1);
    return (
      <View style={{ flex: 1 }}>
        {page === 0 && (
          <Page1
            next={() => {
              next();
              setShowIntroductionPage(false);
            }}
            showAs={route.params!.showAs!}
          />
        )}
        {page === 1 && (
          <Page2
            next={(authorize: boolean) => {
              AppStorage.saveSetting("geolocation", authorize ? "Shared" : "None").then(next);
            }}
          />
        )}
        {page === 2 && (
          <Page3
            next={endTutorial}
            prev={() => {
              AppStorage.saveSetting("geolocation", null).then(prev);
            }}
          />
        )}
      </View>
    );
  },
  "",
  false
);
const Page2 = (props: { next: (authorize: boolean) => void }) => {
  const items: { icon: IconName; text: string }[] = [
    { icon: "navigation-2-outline", text: "Le suivi de votre position nous permet de certifier que vos trajets ont bien été effectués." },
    { icon: "people-outline", text: "Conducteur et passagers peuvent voir leur position sur la carte. Se retrouver devient un jeu d'enfant !" },
    {
      icon: "play-circle-outline",
      text: "Vos données vous appartiennent. Le partage de votre position commence quand vous confirmez avoir démarré."
    }
  ];
  const alertLocation = () =>
    Alert.alert(
      "Voulez vous vraiment passer cette étape ?",
      "Aucun trajet ne pourra être certifié par Liane et certaines fonctionnalités seront désactivées.",
      [
        { text: "Ne pas autoriser", onPress: () => props.next(false), style: "default" },
        { text: "Annuler", onPress: () => {}, style: "cancel" }
      ]
    );

  const authorize = async () => {
    if (await LianeGeolocation.checkGeolocationPermission()) {
      props.next(true);

      return;
    }
    if (!(await LianeGeolocation.checkAndRequestLocationPermission())) {
      AppLogger.info("GEOLOC", "Base geolocation permission needed");
      return;
    }

    let text;
    if (Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 13) {
      text = [
        'Appuyez sur "Continuer"',
        'Allez dans "Position"',
        'Sélectionnez "Toujours" ou "Lorsque l\'app est active" dans la liste des autorisations"'
      ];
    } else if (Platform.OS === "ios" && parseInt(Platform.Version, 10) < 13) {
      text = ['Appuyez sur "Continuer"', 'Sélectionnez "Toujours" ou "Lorsque l\'app est active" dans la liste des autorisations"'];
    } else if (Platform.OS === "android" && Platform.Version === 29) {
      text = ['Appuyez sur "Continuer"', 'Sélectionnez "Toujours autoriser" dans la liste des autorisations'];
    } else if (Platform.OS === "android" && Platform.Version > 29) {
      text = [
        'Appuyez sur "Continuer"',
        'Allez dans "Permissions"',
        'Sélectionnez "Position"',
        'Sélectionnez "Toujours autoriser" dans la liste des autorisations'
      ];
    }
    if (text) {
      Alert.alert("Autoriser la géolocalisation", text.map((item, i) => i + 1 + ". " + item).join("\n"), [
        {
          text: "Continuer",
          onPress: () => {
            LianeGeolocation.requestBackgroundGeolocationPermission().then(() => props.next(true));
          },
          style: "default"
        }
      ]);
    }
  };

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <AppText numberOfLines={3} style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>
        Autoriser l'accès à votre position lorsque l'application est fermée, offre de nombreux avantages
      </AppText>
      <Column style={{ width: "100%", marginVertical: 32, paddingHorizontal: 16 }} spacing={24}>
        {items.map(item => {
          return (
            <Row key={item.text} spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={item.icon} size={48} />
              <AppText numberOfLines={3}>{item.text}</AppText>
            </Row>
          );
        })}
      </Column>
      <Space />
      <Column style={{ alignItems: "center" }}>
        <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <Button text={"Autoriser"} onPress={authorize} />
        </Row>
        <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Button text={"Refuser"} onPress={alertLocation} color={AppColorPalettes.gray[400]} />
        </Row>
      </Column>
    </View>
  );
};

const Page1 = (props: { next: () => void; showAs: "driver" | "passenger" }) => (
  <View style={{ alignItems: "center", flex: 1 }}>
    <AppIcon name={"checkmark-circle-2"} color={AppColors.primaryColor} size={120} />
    <AppText style={{ fontSize: 24, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>Félicitations !</AppText>

    <AppText numberOfLines={5} style={{ alignSelf: "center", textAlign: "center", fontSize: 18 }}>
      {(props.showAs === "driver" ? "Votre Liane est en ligne !" : "Vous avez rejoint une Liane !") +
        "\n\nDécouvrez comment améliorer votre expérience pendant le trajet."}
    </AppText>
    <Space />
    <Column style={{ alignItems: "center" }} spacing={16}>
      <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Button text={"Continuer"} onPress={props.next} />
      </Row>
    </Column>
  </View>
);

const Page3 = (props: { next: () => void; prev: () => void }) => {
  const { route } = useAppNavigation<"TripGeolocationWizard">();
  const { services } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [trackedLevel, setTrackedLevel] = useState<GeolocationLevel | null>(null);
  useEffect(() => {
    AppStorage.getSetting("geolocation").then(setTrackedLevel);
  }, []);
  if (!trackedLevel) {
    return <ActivityIndicator />;
  }
  const confirm = async () => {
    if (route.params?.lianeId) {
      setLoading(true);
      await services.liane.setTracked(route.params.lianeId, trackedLevel);
    }
    props.next();
    setLoading(false);
  };

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <AppText numberOfLines={3} style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>
        {trackedLevel !== "None" ? "La géolocalisation des trajets est activée" : "Votre position ne sera pas utilisée par Liane"}
      </AppText>
      <AppIcon name={trackedLevel !== "None" ? "checkmark-circle-2" : "close-circle"} color={AppColors.primaryColor} size={120} />
      {trackedLevel !== "None" && (
        <AppText numberOfLines={6} style={{ padding: 12 }}>
          {
            "Vos prochains trajets seront géolocalisés par défaut.\n\nVous pouvez changer ce réglage de façon globale dans les paramètres de l'application ou individuellement pour chaque trajet."
          }
        </AppText>
      )}
      {trackedLevel !== "None" && (
        <Row style={{ alignItems: "center", paddingHorizontal: 16 }} spacing={16}>
          <Switch
            style={{ marginBottom: -4 }}
            trackColor={{ false: AppColors.grayBackground, true: AppColors.primaryColor }}
            thumbColor={trackedLevel === "Shared" ? AppColors.white : AppColors.grayBackground}
            ios_backgroundColor={AppColors.grayBackground}
            value={trackedLevel === "Shared"}
            onValueChange={enabled => setTrackedLevel(enabled ? "Shared" : "Hidden")}
          />
          <AppText style={{ fontWeight: "bold" }} numberOfLines={2}>
            Autoriser les autres membres de mes trajets à voir ma position
          </AppText>
        </Row>
      )}
      {trackedLevel === "None" && (
        <AppText numberOfLines={6} style={{ padding: 12 }}>
          {
            "Votre position ne sera pas partagée quand vous démarrerez votre trajet.\n\nVous pouvez changer ce réglage à tout moment dans les paramètres de l'application."
          }
        </AppText>
      )}
      <Space />
      <Column style={{ alignItems: "center" }}>
        <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <Button text={"J'ai compris !"} onPress={confirm} />
        </Row>
        {trackedLevel === "None" && (
          <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            {!loading && <Button text={"Précédent"} onPress={props.prev} color={AppColorPalettes.gray[400]} />}
            {loading && <ActivityIndicator color={AppColors.primaryColor} size={"small"} />}
          </Row>
        )}
      </Column>
    </View>
  );
};
const Button = (props: { onPress: () => void; text: string; color?: ColorValue }) => {
  return (
    <AppPressableOverlay
      backgroundStyle={[styles.validateButtonBackground, props.color ? { backgroundColor: props.color } : {}]}
      style={styles.validateButton}
      onPress={props.onPress}>
      <Center>
        <Row spacing={4}>
          <AppText style={styles.validateText}>{props.text}</AppText>
        </Row>
      </Center>
    </AppPressableOverlay>
  );
};

const styles = StyleSheet.create({
  validateButtonBackground: {
    flex: 1,
    backgroundColor: AppColors.primaryColor,
    borderRadius: 20
  },

  validateButton: {
    paddingVertical: 12
  },
  validateText: {
    fontSize: 18,
    color: AppColors.white
  }
});
