import React, { useCallback, useState } from "react";
import { Image, ImageBackground, KeyboardAvoidingView, View } from "react-native";
import tailwind from "tailwind-rn";
import { sendSms } from "@api/client";
import { AppButton } from "@components/base/AppButton";
import { AppTextInput } from "@components/base/AppTextInput";
import { AppText } from "@components/base/AppText";

const image = require("@assets/images/Mountains_smartphone.jpeg");

const SignUpScreen = ({ navigation }: any) => {
  const [phoneNumber, setPhoneNumber] = useState("");

  /** A set of actins triggered when the user press the button
   First we call the function that will send a SMS to the user.
   Then we print a "pop-up"  to inform the user.
   Finally we move to the second view, the page where it is asked to the user to write the code sent by SMS
   * */
  const actionsOnPress = useCallback(async () => {
    await sendSms(phoneNumber);
    navigation.navigate("SignUpSms", { phoneNumber });
  }, [phoneNumber]);

  return (
    <KeyboardAvoidingView>
      <ImageBackground source={image} style={tailwind("h-full")} resizeMode="cover">

        <View style={tailwind("h-20 items-center mx-20 mt-32 mb-20")}>
          <Image
            style={tailwind("flex-1 w-64")}
            source={require("@assets/logo_white.png")}
            resizeMode="contain"
          />
        </View>

        <View>
          <AppText
            style={tailwind("text-center text-lg text-gray-600")}
          >
            Veuillez entrer votre numéro de téléphone
          </AppText>
          <AppTextInput
            style={tailwind("rounded-full p-4 m-20 bg-gray-100 text-gray-600 text-sm")}
            placeholder=""
            autoFocus
            returnKeyLabel="next"
            onChangeText={setPhoneNumber}
            keyboardType="numeric"
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
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;