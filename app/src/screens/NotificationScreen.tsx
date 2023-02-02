import { View } from "react-native";
import React, { useContext } from "react";
import { APP_VERSION } from "@env";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes } from "@/theme/colors";
import { AppContext } from "@/components/ContextProvider";
import { AppText } from "@/components/base/AppText";

const NotificationScreen = () => {
  const { services, setAuthUser } = useContext(AppContext);
};

export default NotificationScreen;
