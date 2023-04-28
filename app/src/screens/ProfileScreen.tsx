import { StyleSheet, View } from "react-native";
import React, { useContext } from "react";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { APP_VERSION } from "@env";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";

export const ProfileScreen = () => {
  const { services, setAuthUser, user } = useContext(AppContext);
  return (
    <View style={styles.page}>
      <AppButton title="Déconnecter" color={AppColorPalettes.blue[500]} onPress={() => services.auth.logout().then(() => setAuthUser(undefined))} />
      <View style={{ display: "flex", flexDirection: "row" }}>
        <AppText style={{ marginRight: 32 }}>Version :</AppText>
        <AppText>{APP_VERSION}</AppText>
      </View>

      <AppText>{user?.phone}</AppText>
      <AppRoundedButton
        backgroundColor={AppColors.orange}
        text={"Gen"}
        onPress={() =>
          services.notification.receiveNotification({
            _t: "Info",
            title: "Test",
            message: "Texte de la notification",
            sentAt: new Date().toISOString(),
            recipients: [],
            answers: []
          })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16
  }
});
