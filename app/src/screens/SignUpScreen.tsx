import React, { useCallback, useState } from "react";
import { Image, ImageBackground, KeyboardAvoidingView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { tailwind } from "@/api/tailwind";
import { sendSms } from "@/api/client";
import { AppButton } from "@/components/base/AppButton";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/Navigation";
import { translate } from "@/api/i18n";

const image = require("@/assets/images/bg-mountains.jpg");
const logo = require("@/assets/logo_white.png");

const t = translate("SignUp");

  type SignUpRouteProp = RouteProp<NavigationParamList, "SignUp">;

type SignUpNavigationProp = StackNavigationProp<NavigationParamList, "SignUp">;

type SignUpProps = {
  route: SignUpRouteProp;
  navigation: SignUpNavigationProp;
};

const SignUpScreen = ({ route, navigation }: SignUpProps) => {

  const authFailure = route.params?.authFailure && t("Le code est invalide veuillez rééssayer");

  const [phoneNumber, setPhoneNumber] = useState(route.params?.phoneNumber || "");
  const [internalError, setInternalError] = useState<string>();

  const signUp = useCallback(async () => {
    try {
      setInternalError(undefined);
      await sendSms(phoneNumber);
      navigation.navigate("SignUpCode", { phoneNumber });
    } catch (e) {
      setInternalError(t("Impossible d'effectuer la demande"));
    }
  }, [phoneNumber]);

  return (
    <KeyboardAvoidingView>
      <ImageBackground source={image} style={tailwind("h-full")} resizeMode="cover">

        <View style={tailwind("h-20 items-center mx-20 mt-32 mb-20")}>
          <Image
            style={tailwind("flex-1 w-64")}
            source={logo}
            resizeMode="contain"
          />
        </View>

        <View>
          <AppText
            style={tailwind("text-center text-lg text-gray-600")}
          >
            {t("Veuillez entrer votre numéro de téléphone")}
          </AppText>
          <View
            style={tailwind("rounded-full m-20 bg-gray-100 text-gray-600 text-2xl flex flex-row h-12")}
          >
            <AppTextInput
              style={tailwind("text-gray-600 text-2xl text-center flex-1")}
              placeholder=""
              autoFocus
              returnKeyLabel="next"
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCompleteType="tel"
              textContentType="telephoneNumber"
              onSubmitEditing={signUp}
            />
            <AppButton
              buttonStyle={tailwind("rounded-r-3xl bg-orange-light w-12 h-12")}
              iconStyle={tailwind("text-3xl text-white font-bold")}
              onPress={signUp}
              icon="log-in-outline"
            />
          </View>
          <AppText
            style={tailwind("text-center text-lg text-red-600")}
          >
            {internalError || authFailure || " "}
          </AppText>

        </View>

      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;