import { View } from "react-native";
import React, { useContext } from "react";
import { APP_VERSION } from "@env";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";
import { AppText } from "@/components/base/AppText";

const EmptyScreen = () => {
  const { services } = useContext(AppContext);
  return (
    <View>
      <AppButton
        title="Déconnecter"
        color={AppColors.blue500}
        onPress={() => services.auth.logout()}
      />
      <View style={{ display: "flex", flexDirection: "row" }}>
        <AppText style={{ marginRight: 32 }}>
          Version :
        </AppText>
        <AppText>
          {APP_VERSION}
        </AppText>
      </View>
    </View>
  );
};

export default EmptyScreen;
