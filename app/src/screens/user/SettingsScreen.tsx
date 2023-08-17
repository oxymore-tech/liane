import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { HomeScreenHeader } from "@/components/context/Navigation";
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { AppSettings, getSetting, saveSetting } from "@/api/storage";
import { AppColorPalettes, AppColors } from "@/theme/colors";

export const SettingsScreen = () => {
  return (
    <View style={styles.container}>
      <HomeScreenHeader label={"Paramètres"} />
      <View
        style={{
          marginHorizontal: 24,
          flex: 1
        }}>
        <SettingCheckbox name={"map.lianeTrafficAsWidth"} label={"Epaisseur des lianes selon le trafic"} />
        <SettingCheckbox name={"map.lianeTrafficAsColor"} label={"Couleur des lianes selon le trafic"} />
      </View>
    </View>
  );
};

const SettingCheckbox = ({ name, label }: { name: keyof AppSettings; label: string }) => {
  const [value, setValue] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    getSetting(name)
      .then(setting => {
        setValue(setting);
        console.debug(setting);
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
          fillColor={AppColors.orange}
          textStyle={{ textDecorationLine: undefined, color: AppColorPalettes.gray[800] }}
          onPress={(checked: boolean) => {
            saveSetting(name, checked)
              .then(() => setValue(checked))
              .catch(e => console.warn(e));
          }}
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    height: "100%",
    flex: 1
  }
});
