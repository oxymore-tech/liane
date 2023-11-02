import React, { useContext, useEffect, useState } from "react";
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
import { SignUpFormScreen } from "@/screens/signUp/SignUpFormScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_VERSION } from "@env";
import { AppStyles } from "@/theme/styles";
import { PasswordInput } from "@/screens/signUp/PasswordInput";
import { CreateLoginMachine, SignUpStateMachineInterpreter } from "@liane/common";
import { AppLogger } from "@/api/logger";
import { AppEnv } from "@/api/env";

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
  const insets = useSafeAreaInsets();
  const error = state.toStrings().some(x => x.includes("failure")) ? "Impossible d'effectuer la demande" : undefined;
  const submitting = state.toStrings().some(x => x.includes("pending"));
  const set = (data: string) => machine.send("SET", { data });
  const submit = () => {
    AppLogger.debug(
      "INIT",
      state.context,
      state.value,
      AppEnv.raw.TEST_ACCOUNT,
      state.context.phone.value,
      state.context.phone.value === AppEnv.raw.TEST_ACCOUNT
    );
    machine.send(state.toStrings().some(x => x.includes("failure")) ? "RETRY" : "NEXT");
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
            : state.context.phone.value === AppEnv.raw.TEST_ACCOUNT
            ? t("Entrez votre mot de passe")
            : t("Entrez le code reçu par SMS")}
        </AppText>
        {state.matches("phone") ? (
          <PhoneNumberInput
            phoneNumber={state.context.phone.value || ""}
            canSubmit={!!state.context.phone.valid}
            onChange={set}
            submit={submit}
            submitting={submitting}
          />
        ) : state.context.phone.value === AppEnv.raw.TEST_ACCOUNT ? (
          <PasswordInput code={state.context.code.value || ""} onChange={set} onValidate={submit} />
        ) : (
          <CodeInput
            code={state.context.code.value || ""}
            canSubmit={!!state.context.code.valid}
            onChange={set}
            submit={submit}
            retry={() => machine.send("RESEND")}
          />
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

// @ts-ignore
export const SignUpLianeContext = React.createContext<SignUpStateMachineInterpreter>();
const SignUpScreen = () => {
  const { login, services } = useContext(AppContext);
  const [m] = useState(() =>
    CreateLoginMachine(
      {
        sendPhone: phone => services.auth.sendSms(phone),
        sendCode: async (phone, code) => {
          const pushToken = await getPushToken();
          return await services.auth.login({ phone, code, pushToken });
        }
      },
      AppEnv.raw.TEST_ACCOUNT
    )
  );
  const machine = useInterpret(m);
  const [state] = useActor(machine);
  useEffect(() => {
    if (!state.done) {
      return;
    }
    machine.onDone(async _ => {
      login(state.context.authUser);
    });
  }, [login, machine, state.context.authUser, state.done]);

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
