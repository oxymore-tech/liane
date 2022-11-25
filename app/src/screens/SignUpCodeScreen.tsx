import React, { useCallback, useContext, useState } from "react";
import { Image, KeyboardAvoidingView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { login } from "@/api/client";
import { AppContext } from "@/components/ContextProvider";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/api/navigation";
import { scopedTranslate } from "@/api/i18n";
import { setStoredToken } from "@/api/storage";

const logo = require("@/assets/logo_white.png");

const t = scopedTranslate("SignUpCode");

type SignUpCodeRouteProp = RouteProp<NavigationParamList, "SignUpCode">;
type SignUpCodeNavigationProp = NativeStackNavigationProp<NavigationParamList, "SignUpCode">;
type SignUpCodeProps = {
  route: SignUpCodeRouteProp;
  navigation: SignUpCodeNavigationProp;
};

const SignUpCodeScreen = ({ route, navigation }: SignUpCodeProps) => {
  const [phoneNumber] = useState(route.params.phoneNumber);
  const [code, setCode] = useState("");
  const { setAuthUser } = useContext(AppContext);

  const signIn = useCallback(async () => {
    try {
      const authResponse = await login(phoneNumber, code);
      await setStoredToken(authResponse.token);
      await setAuthUser(authResponse.user);
    } catch (e) {
      await setCode("");
      await navigation.navigate("SignUp", { phoneNumber, authFailure: true });
    }
  }, [phoneNumber, code]);

  return (
    <KeyboardAvoidingView className="flex h-full bg-gray-700">
      <View className="h-10 items-center my-20">
        <Image
          className="flex-1 w-64"
          source={logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <AppText className="text-center text-lg text-white mx-10 mb-5">
          {t("Un code vous a été envoyé par SMS")}
        </AppText>
        <View
          className="rounded-full m-20 bg-white text-2xl flex flex-row h-12"
        >
          <AppTextInput
            className="text-gray-800 text-center flex-1 rounded-l-full pl-12"
            autoFocus
            returnKeyLabel="next"
            onChangeText={setCode}
            keyboardType="numeric"
            onSubmitEditing={signIn}
            maxLength={6}
          />
          <AppButton
            className="rounded-r-full"
            disabled={code.length < 6}
            onPress={signIn}
            icon="checkmark-circle-outline"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SignUpCodeScreen;
