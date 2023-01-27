import React, { useCallback, useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import LianeLogo from "@/assets/logo.svg";
import { AppContext } from "@/components/ContextProvider";
import { PhoneNumberInput } from "@/screens/signUp/PhoneNumberInput";
import { CodeInput } from "@/screens/signUp/CodeInput";
import { AppDimensions } from "@/theme/dimensions";
import { UnauthorizedError } from "@/api/exception";

export enum SignUpStep {
  SetPhoneNumber,
  EnterCode
}

const t = scopedTranslate("SignUp");

async function getPushToken() {
  if (__DEV__) {
    return;
  }
  await messaging().registerDeviceForRemoteMessages();
  return await messaging().getToken();
}

const SignUpScreen = () => {
  const [step, setStep] = useState(SignUpStep.SetPhoneNumber);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const { services, setAuthUser } = useContext(AppContext);

  const signUp = useCallback(async () => {
    try {
      setError("");
      await services.auth.sendSms(phoneNumber);
      setStep(SignUpStep.EnterCode);
    } catch (e) {
      console.error("Sign up error ", e);
      setError("Impossible d'effectuer la demande");
    }
  }, [phoneNumber, services.auth]);

  const signIn = useCallback(async () => {
    try {
      const pushToken = await getPushToken();
      const authUser = await services.auth.login({ phone: phoneNumber, code, pushToken });
      setAuthUser(authUser);
    } catch (e: any) {
      if (e instanceof UnauthorizedError) {
        setError("Le code est incorrect");
      } else {
        console.warn("Error during login", e);
        setError(e.toString());
      }
    }
  }, [services.auth, phoneNumber, code, setAuthUser]);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <LianeLogo style={styles.image} width="75%" />
      </View>

      <View>
        <AppText style={styles.helperText}>
          {step === SignUpStep.SetPhoneNumber ? t("Veuillez entrer votre numéro de téléphone") : t("Entrez le code reçu par SMS")}
        </AppText>
        {step === SignUpStep.SetPhoneNumber ? (
          <PhoneNumberInput phoneNumber={phoneNumber} onChange={setPhoneNumber} onValidate={signUp} />
        ) : (
          <CodeInput code={code} onChange={setCode} onValidate={signIn} />
        )}
        <AppText style={styles.errorText}>{error || " "}</AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: AppColors.blue700
  },
  helperText: {
    marginHorizontal: 16,
    marginVertical: 4,
    textAlign: "center",
    color: AppColors.white,
    fontSize: AppDimensions.textSize.medium
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: "25%",
    width: "100%"
  },
  image: {
    width: "64%",
    color: AppColors.pink500
  },
  errorText: {
    color: "red", // TODO red 600,
    textAlign: "center",
    margin: 4
  }
});

export default SignUpScreen;
