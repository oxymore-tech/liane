import React, { useCallback, useContext } from "react";
import { Image, ImageBackground, View } from "react-native";
import tailwind from "tailwind-rn";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { login } from "@/api/client";
import { AppContext } from "@/components/ContextProvider";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";
import { AppText } from "@/components/base/AppText";
import { NavigationParamList } from "@/components/Navigation";

const image = require("@/assets/images/bg-mountains.jpg");
const logo = require("@/assets/logo_white.png");

type SignUpCodeRouteProp = RouteProp<NavigationParamList, "SignUpCode">;

type SignUpCodeNavigationProp = StackNavigationProp<NavigationParamList, "SignUpCode">;

type SignUpCodeProps = {
  route: SignUpCodeRouteProp;
  navigation: SignUpCodeNavigationProp;
};

const SignUpCodeScreen = ({ route, navigation }: SignUpCodeProps) => {
  const [phoneNumber] = React.useState(route.params.phoneNumber);
  const [code, setCode] = React.useState("");
  const { expoPushToken, setAuthUser } = useContext(AppContext);

  const actionsOnPress = useCallback(async () => {
    if (expoPushToken) {
      try {
        const authUser = await login(phoneNumber, code, expoPushToken);
        setAuthUser(authUser);
      } catch (e) {
        setCode("");
        navigation.navigate("SignUp", { phoneNumber, authFailure: true });
      }
    }
  }, [phoneNumber, code, expoPushToken]);

  return (
    <View style={tailwind("flex h-full")}>
      <ImageBackground
        source={image}
        style={tailwind("flex-1")}
      >

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
            Un code vous a été envoyé pas sms
          </AppText>
          <AppTextInput
            style={tailwind("rounded-full p-4 m-20 bg-gray-100 text-gray-600")}
            placeholder="Entrez votre code"
            returnKeyLabel="next"
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            autoFocus
          />

        </View>

        <View
          style={tailwind("mx-20")}
        >
          <AppButton
            onPress={actionsOnPress}
            title="Soumettre"
          />
        </View>

      </ImageBackground>
    </View>
  );
};

export default SignUpCodeScreen;
