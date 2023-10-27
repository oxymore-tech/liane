import React, { useContext, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import LianeLogo from "@/assets/logo.svg";
import { AppContext } from "@/components/context/ContextProvider";
import { PhoneNumberInput } from "@/screens/signUp/PhoneNumberInput";
import { CodeInput } from "@/screens/signUp/CodeInput";
import { AppDimensions } from "@/theme/dimensions";
import { useActor, useInterpret } from "@xstate/react";
import { CreateSignUpMachine, SignUpLianeContext } from "@/screens/signUp/StateMachine";
import { SignUpFormScreen } from "@/screens/signUp/SignUpFormScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_VERSION, TEST_ACCOUNT } from "@env";
import { AppStyles } from "@/theme/styles";
import { AppLogger } from "@/api/logger";
import { PasswordInput } from "@/screens/signUp/PasswordInput";
import { storeUserSession } from "@/api/storage";

const t = scopedTranslate("SignUp");

async function getPushToken() {
  if (__DEV__) {
    return;
  }
  await messaging().registerDeviceForRemoteMessages();
  return await messaging().getToken();
}

const SignUpPage = () => {
  const machine = useContext(SignUpLianeContext);
  const [state] = useActor(machine);
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState("");
  const { services } = useContext(AppContext);
  const insets = useSafeAreaInsets();

  const sendCode = async () => {
    try {
      setError("");
      const phone = state.matches("phone") ? value : state.context.phone!;
      await services.auth.sendSms(phone);
      machine.send("SET_PHONE", { data: { phone: phone } });
    } catch (e) {
      AppLogger.error("LOGIN", "Sign up error ", e);
      setError("Impossible d'effectuer la demande");
    }
  };
  const submitCode = async () => {
    // try {
    const pushToken = await getPushToken();
    const authUser = await services.auth.login({ phone: state.context.phone!, code: value, pushToken });
    AppLogger.info("LOGIN", "as ", authUser, machine.send);
    machine.send("LOGIN", { data: { authUser } });
    /*  } catch (e: any) {
      if (e instanceof UnauthorizedError) {
        setError("Le code est incorrect");
      } else {
        console.warn("Error during login", e);
        setError(e.toString());
      }
    }*/
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { flex: 1, flexShrink: 1 }]} behavior={Platform.OS === "android" ? undefined : "height"}>
      <View style={[styles.imageContainer, { flexShrink: 1 }]}>
        <LianeLogo style={styles.image} width="75%" />
      </View>
      <View>
        <AppText numberOfLines={-1} style={styles.helperText}>
          {state.matches("phone")
            ? t("Veuillez entrer votre numéro de téléphone")
            : state.context.phone === TEST_ACCOUNT
            ? t("Entrez votre mot de passe")
            : t("Entrez le code reçu par SMS")}
        </AppText>
        {state.matches("phone") ? (
          <PhoneNumberInput phoneNumber={value} onChange={setValue} onValidate={sendCode} />
        ) : state.context.phone === TEST_ACCOUNT ? (
          <PasswordInput code={value} onChange={setValue} onValidate={submitCode} />
        ) : (
          <CodeInput code={value} onChange={setValue} onValidate={submitCode} retry={sendCode} />
        )}
        <AppText style={styles.errorText}>{error || " "}</AppText>
      </View>
      <View style={{ flex: 1, flexShrink: 1 }} />
      <View style={[{ marginBottom: insets.bottom, paddingBottom: 16 }]}>
        <AppText style={styles.bottomText}>Version: {APP_VERSION}</AppText>
      </View>
    </KeyboardAvoidingView>
  );
};

const SignUpScreen = () => {
  const { login } = useContext(AppContext);
  const [m] = useState(() => CreateSignUpMachine());
  const machine = useInterpret(m);
  const [state] = useActor(machine);
  machine.onDone(async _ => {
    // Fixes a xstate bug where onDone is called as many times as there are states in the machine
    if (!state.done) {
      return;
    }
    await storeUserSession(state.context.authUser);
    login({ ...state.context.authUser! });
  });

  return (
    <SignUpLianeContext.Provider
      /* @ts-ignore */
      value={machine}>
      {["code", "phone"].some(state.matches) && <SignUpPage />}
      {state.matches("form") && <SignUpFormScreen />}
      {!["code", "phone", "form"].some(state.matches) && (
        <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
      )}
    </SignUpLianeContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: AppColorPalettes.blue[700]
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
    color: AppColors.primaryColor
  },
  errorText: {
    color: "red", // TODO red 600,
    textAlign: "center",
    margin: 4
  },
  bottomText: {
    color: AppColorPalettes.gray[100],
    alignSelf: "center"
  }
});

export default SignUpScreen;
