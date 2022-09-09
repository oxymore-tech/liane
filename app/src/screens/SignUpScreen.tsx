import React, { useCallback, useState } from "react";
import { Image, KeyboardAvoidingView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTailwind } from "tailwind-rn";
import { sendSms } from "@/api/client";
import { AppButton } from "@/components/base/AppButton";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/Navigation";
import { scopedTranslate } from "@/api/i18n";

const logo = require("@/assets/logo_orange.png");

const t = scopedTranslate("SignUp");

type SignUpRouteProp = RouteProp<NavigationParamList, "SignUp">;
type SignUpNavigationProp = NativeStackNavigationProp<NavigationParamList, "SignUp">;

type SignUpProps = {
  route: SignUpRouteProp;
  navigation: SignUpNavigationProp;
};

const SignUpScreen = ({ route, navigation }: SignUpProps) => {
  const tw = useTailwind();

  const authFailure = route.params?.authFailure && t("Le code est invalide veuillez rééssayer");

  const [phoneNumber, setPhoneNumber] = useState(route.params?.phoneNumber || "");
  const [internalError, setInternalError] = useState<string>();

  const signUp = useCallback(async () => {
    try {
      setInternalError(undefined);
      await sendSms(phoneNumber);
      navigation.navigate("SignUpCode", { phoneNumber });
    } catch (e) {
      console.log("sign up error ", e);
      setInternalError("Impossible d'effectuer la demande");
    }
  }, [phoneNumber]);

  return (
    <KeyboardAvoidingView
      style={tw("flex h-full bg-liane-yellow")}
    >
      <View style={tw("h-10 items-center my-20")}>
        <Image
          style={tw("flex-1 w-64")}
          source={logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <AppText style={tw("text-center text-lg text-white mx-10 mb-5")}>
          {t("Veuillez entrer votre numéro de téléphone")}
        </AppText>
        <View
          style={tw("rounded-full m-20 bg-white text-2xl flex flex-row h-12")}
        >
          <AppTextInput
            style={tw("text-gray-800 text-2xl text-center flex-1")}
            placeholder=""
            autoFocus
            returnKeyLabel="next"
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            onSubmitEditing={signUp}
            maxLength={10}
          />
          <AppButton
            style={tw("rounded-full bg-blue-500 w-12")}
            iconStyle={tw("text-3xl text-white font-bold")}
            disabled={phoneNumber.length < 10}
            onPress={signUp}
            icon="arrow-forward-circle-outline"
          />
        </View>
        <AppText style={tw("text-center text-lg text-red-600 m-5")}>
          {internalError || authFailure || " "}
        </AppText>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;