import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Column, Row, Space } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { useAppNavigation } from "@/components/context/routing";
import { useIsFocused } from "@react-navigation/native";
import { GeolocationLevel } from "@liane/common";
import { AppStorage } from "@/api/storage";
import { AppButton } from "@/components/base/AppButton.tsx";

const geolocationValues = {
  None: "Désactivée",
  Shared: "Activée (position partagée)",
  Hidden: "Activée (position masquée)"
} as const;
export const SettingsScreen = () => {
  const [geoloc, setGeoloc] = useState<GeolocationLevel>();
  const { navigation } = useAppNavigation();
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) {
      return;
    }
    AppStorage.getSetting("geolocation").then(setGeoloc);
  }, [focused]);
  return (
    <View style={styles.container}>
      <Row style={{ justifyContent: "flex-start", alignItems: "center", padding: 16 }} spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColorPalettes.gray[800]} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.black }}>Paramètres</AppText>
      </Row>
      <View
        style={{
          flex: 1
        }}>
        {/*<SettingCheckbox name={"map.lianeTrafficAsWidth"} label={"Epaisseur des lianes selon le trafic"} />
        <SettingCheckbox name={"map.lianeTrafficAsColor"} label={"Couleur des lianes selon le trafic"} />*/}
        <AppPressableOverlay
          style={{ paddingHorizontal: 24 }}
          onPress={() => {
            AppStorage.saveSetting("geolocation", undefined).then(() =>
              navigation.navigate("TripGeolocationWizard", { showAs: null, lianeId: undefined })
            );
          }}>
          <Row style={styles.settingRow}>
            <AppText style={styles.settingTitle}>Géolocalisation</AppText>
            <Space />
            <Column>
              <AppText>{geolocationValues[geoloc ?? "None"]}</AppText>
              <AppText style={{ alignSelf: "flex-end", color: AppColors.blue, textDecorationLine: "underline" }}>Modifier</AppText>
            </Column>
          </Row>
        </AppPressableOverlay>
      </View>
    </View>
  );
};
/*
const SettingCheckbox = ({ name, label }: { name: keyof AppSettings; label: string }) => {
  const [value, setValue] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    AppStorage.getSetting(name)
      .then(setting => {
        setValue(setting);
      })
      .catch(e => console.warn(e));
  }, [name]);
  return (
    <View style={{ paddingVertical: 16 }}>
      {value !== undefined && (
        <BouncyCheckbox
          key={name}
          isChecked={value}
          text={label}
          fillColor={AppColors.primaryColor}
          textStyle={{ textDecorationLine: undefined, color: AppColorPalettes.gray[800] }}
          onPress={(checked: boolean) => {
            AppStorage.saveSetting(name, checked)
              .then(() => setValue(checked))
              .catch(e => console.warn(e));
          }}
        />
      )}
    </View>
  );
};*/
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  settingRow: {
    paddingVertical: 8
    // alignItems: "center"
  },
  settingTitle: {
    fontWeight: "bold",
    fontSize: 16
  }
});
