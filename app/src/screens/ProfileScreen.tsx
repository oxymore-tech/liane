import { View } from "react-native";
import React, { useContext } from "react";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { APP_VERSION } from "@env";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export const ProfileScreen = () => {
  const { services, setAuthUser } = useContext(AppContext);
  return (
    <View>
      <AppButton title="Déconnecter" color={AppColorPalettes.blue[500]} onPress={() => services.auth.logout().then(() => setAuthUser(undefined))} />
      <View style={{ display: "flex", flexDirection: "row" }}>
        <AppText style={{ marginRight: 32 }}>Version :</AppText>
        <AppText>{APP_VERSION}</AppText>
      </View>

      <AppRoundedButton
        backgroundColor={AppColors.orange}
        text={"Gen"}
        onPress={() => services.notification.displayNotification({ type: "test", event: {} })}
      />
    </View>
  );
};
