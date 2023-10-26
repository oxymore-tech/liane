import { Alert, ColorValue, Linking, Platform, StyleSheet, View } from "react-native";
import { Center, Column, Row, Space } from "@/components/base/AppLayout";
import React, { useEffect, useState } from "react";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { check, PERMISSIONS, request } from "react-native-permissions";
import { AppLogger } from "@/api/logger";
import { DdLogs } from "@datadog/mobile-react-native";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { WithFullscreenModal } from "@/components/WithFullscreenModal";
import { HOME_TRIPS, useAppNavigation } from "@/api/navigation";
import { AppPressableOverlay } from "@/components/base/AppPressable";

export const TripGeolocationWizard = WithFullscreenModal(
  () => {
    const { route, navigation } = useAppNavigation<"FirstTripWizard">();

    const [page, setPage] = useState(route.params?.showAs ? 1 : 0);

    const endTutorial = () => {
      navigation.popToTop();
      navigation.navigate(HOME_TRIPS);
    };
    const next = () => setPage(page + 1);
    const prev = () => setPage(page - 1);
    return (
      <View style={{ flex: 1 }}>
        {page === 0 && <Page1 next={next} showAs={route.params!.showAs!} />}
        {page === 1 && <Page2 next={next} />}
        {page === 2 && <Page3 next={endTutorial} prev={prev} />}
      </View>
    );
  },
  "",
  false
);
const Page2 = (props: { next: () => void }) => {
  const items: { icon: IconName; text: string }[] = [
    { icon: "navigation-2-outline", text: "Le suivi de votre position nous permet de certifier que vos trajet ont bien été effectués." },
    { icon: "people-outline", text: "Conducteur et passagers peuvent voir leur position sur la carte. Se retrouver devient un jeu d'enfant !" },
    {
      icon: "play-circle-outline",
      text: "Vos données vous appartiennent. Le partage de votre position ne commence que quand vous confirmez avoir démarré le trajet."
    }
  ];
  const alertLocation = () =>
    Alert.alert(
      "Voulez vous vraiment passer cette étape ?",
      "Aucun trajet ne pourra être certifié par Liane et certaines fonctionnalités seront désactivées.",
      [
        { text: "Ne pas autoriser", onPress: props.next, style: "default" },
        { text: "Annuler", onPress: () => {}, style: "cancel" }
      ]
    );

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
              AppLogger.warn("SETTINGS", "Unable to open settings");
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
        //console.log(status);
        if (status === "granted") {
          return true;
        } else if (status === "denied") {
          Alert.alert(`Liane a besoin de suivre votre position pour pouvoir valider votre trajet.`);
        } else if (status === "unavailable") {
          Alert.alert(`Erreur: géolocalisation indisponible.`);
        } else if (status === "blocked") {
          const openSetting = () => {
            Linking.openSettings().catch(() => {
              AppLogger.warn("SETTINGS", "Unable to open settings");
            });
          };
          Alert.alert("Localisation requise", `Pour continuez, allez dans "Autorisations" > "Localisation" puis sélectionnez "Toujours autoriser".`, [
            { text: "Modifier les paramètres", onPress: openSetting },
            { text: "Ignorer", onPress: () => {} }
          ]);
        }
      } else {
        await Linking.openSettings().catch(() => {
          AppLogger.warn("SETTINGS", "Unable to open settings");
        });
      }
    }
    return false;
  };

  useEffect(() => {
    check(Platform.OS === "ios" ? PERMISSIONS.IOS.LOCATION_ALWAYS : PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION).then(p => {
      DdLogs.info(`Location permission status is: ${p}`);
    });
  }, []);

  const authorize = () => {
    let text;
    if (Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 13) {
      text = ['Appuyez sur "Continuer"', 'Allez dans "Position"', 'Sélectionnez "Toujours" dans la liste des autorisations"'];
    } else if (Platform.OS === "ios" && parseInt(Platform.Version, 10) < 13) {
      text = ['Appuyez sur "Continuer"', 'Sélectionnez "Toujours" dans la liste des autorisations"'];
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
      Alert.alert("Autoriser la géolocalisation dans les paramètres", text.map((item, i) => i + 1 + ". " + item).join("\n"), [
        {
          text: "Continuer",
          onPress: () => {
            requestBackgroundGeolocation().then(props.next);
          },
          style: "default"
        }
      ]);
    }
  };

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <AppText numberOfLines={3} style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>
        Autoriser l'accès à votre position offre de nombreux avantages
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
      {(props.showAs === "driver" ? "Votre Liane est en ligne !" : "Vous avez rejoins une Liane !") +
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
  const [permission, setPermission] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    check(Platform.OS === "ios" ? PERMISSIONS.IOS.LOCATION_ALWAYS : PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION).then(p => {
      DdLogs.info(`Location permission status is now: ${p}`);
      setPermission(p === "granted");
    });
  }, []);
  if (permission === undefined) {
    return null;
  }
  console.log(permission);
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <AppText numberOfLines={3} style={{ fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 8 }}>
        {permission ? "L'accès à votre position est autorisé" : "Votre position ne sera pas utilisée par Liane"}
      </AppText>
      {permission && (
        <AppText numberOfLines={4}>
          Avant de partir pour votre trajet, confirmez votre départ dans l'application pour activer le suivi de votre position.
        </AppText>
      )}
      {!permission && (
        <AppText numberOfLines={4}>
          Votre position ne sera pas partagée quand vous démarrerez votre trajet. Vous pouvez changer ce réglage à tout moment dans les paramètres de
          l'application.
        </AppText>
      )}
      <Space />
      <Column style={{ alignItems: "center" }}>
        <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <Button text={"J'ai compris !"} onPress={props.next} />
        </Row>
        {!permission && (
          <Row spacing={8} style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <Button text={"Précédent"} onPress={props.prev} color={AppColorPalettes.gray[400]} />
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
