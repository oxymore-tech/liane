import React, { useCallback, useContext, useState } from "react";
import { Image, KeyboardAvoidingView, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { tw } from "@/api/tailwind";
import { login } from "@/api/client";
import { AppContext } from "@/components/ContextProvider";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/Navigation";

const logo = require("@/assets/logo_orange.png");

type SignUpCodeRouteProp = RouteProp<NavigationParamList, "SignUpCode">;

type SignUpCodeNavigationProp = StackNavigationProp<NavigationParamList, "SignUpCode">;

type SignUpCodeProps = {
  route: SignUpCodeRouteProp;
  navigation: SignUpCodeNavigationProp;
};

const SignUpCodeScreen = ({ route, navigation }: SignUpCodeProps) => {
  const [phoneNumber] = useState(route.params.phoneNumber);
  const [code, setCode] = useState("");
  const { expoPushToken, setAuthUser } = useContext(AppContext);

  const signIn = useCallback(async () => {
    try {
      const authUser = await login(phoneNumber, code, expoPushToken);
      setAuthUser(authUser);
    } catch (e) {
      setCode("");
      navigation.navigate("SignUp", { phoneNumber, authFailure: true });
    }
  }, [phoneNumber, code, expoPushToken]);
  
  
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
          Un code vous a été envoyé par SMS.
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
            buttonStyle={tw("rounded-r-3xl bg-liane-orange w-12 h-12")}
            iconStyle={tw("text-3xl text-white font-bold")}
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
