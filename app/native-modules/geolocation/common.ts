import { Alert, Linking, NativeModules } from "react-native";
import { AppLogger } from "@/api/logger";
import { Subject } from "rxjs";

export const { RNLianeGeolocation } = NativeModules;

export const inviteToOpenSettings = (message?: string) => {
  const openSetting = () => {
    Linking.openSettings().catch(() => {
      AppLogger.warn("SETTINGS", "Unable to open settings");
    });
  };
  Alert.alert("Localisation désactivée", message ?? ALLOW_LOCATION, [
    { text: "Modifier les paramètres", onPress: openSetting },
    { text: "Ignorer", onPress: () => {} }
  ]);
};

export const ENABLE_GPS = `Activez le GPS pour permettre à Liane d'utiliser votre position.`;
export const ALLOW_LOCATION = `L'accès à votre position est désactivé dans les paramètres. Certaines fonctionnalités risquent d'être limitées`;

export const running = new Subject<string | undefined>();
