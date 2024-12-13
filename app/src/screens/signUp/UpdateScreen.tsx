import React, { useContext } from "react";
import { Linking, StyleSheet } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { Center } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";

export function UpdateScreen() {
  const { version } = useContext(AppContext);
  return (
    <Center style={[AppStyles.fullHeight, styles.container]} spacing={40}>
      <AppIcon name="liane" size={100} />
      <AppText style={{ color: AppColors.white, fontWeight: "bold", paddingVertical: 40, fontSize: 20, paddingHorizontal: 16 }} numberOfLines={3}>
        Une nouvelle version est disponible
      </AppText>
      <AppButton
        icon="bulb"
        value="Mettre à jour"
        onPress={async () => {
          await Linking.openURL(version?.url!);
        }}
      />
    </Center>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: AppColors.secondaryColor
  }
});
