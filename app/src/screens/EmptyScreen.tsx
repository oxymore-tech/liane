import { View } from "react-native";
import React, { useContext } from "react";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";

const EmptyScreen = () => {
  const { setAuthUser } = useContext(AppContext);
  return (
    <View>
      <AppButton
        title="Déconnecter"
        color={AppColors.blue500}
        onPress={() => setAuthUser(undefined)}
      />
    </View>
  );
};

export default EmptyScreen;
