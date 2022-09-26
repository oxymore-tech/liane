import React, { useCallback, useContext, useState } from "react";
import { Image, KeyboardAvoidingView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTailwind } from "tailwind-rn";
import { login } from "@/api/client";
import { AppContext } from "@/components/ContextProvider";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/RootNavigation";
import { scopedTranslate } from "@/api/i18n";

const logo = require("@/assets/logo_orange.png");

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
  const tw = useTailwind();

  const signIn = useCallback(async () => {
    try {
      const authUser = await login(phoneNumber, code);
      setAuthUser(authUser);
    } catch (e) {
      setCode("");
      navigation.navigate("SignUp", { phoneNumber, authFailure: true });
    }
  }, [phoneNumber, code]);

  return (
    <KeyboardAvoidingView style={tw("flex h-full bg-liane-yellow")}>
      <View style={tw("h-10 items-center my-20")}>
        <Image
          style={tw("flex-1 w-64")}
          source={logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <AppText style={tw("text-center text-lg text-white mx-10 mb-5")}>
          {t("Un code vous a été envoyé par SMS")}
        </AppText>
        <View
          style={tw("rounded-full m-20 bg-white text-2xl flex flex-row h-12")}
        >
          <AppTextInput
            style={tw("text-gray-800 text-2xl text-center flex-1")}
            autoFocus
            returnKeyLabel="next"
            onChangeText={setCode}
            keyboardType="numeric"
            onSubmitEditing={signIn}
            maxLength={6}
          />
          <AppButton
            style={tw("rounded-r-full w-12 h-12")}
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
