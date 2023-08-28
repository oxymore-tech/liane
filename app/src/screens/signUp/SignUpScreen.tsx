import React, { useContext, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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
import { DoneEvent } from "xstate";
import { SignUpFormScreen } from "@/screens/signUp/SignUpFormScreen";
import { Center } from "@/components/base/AppLayout";

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

  const sendCode = async () => {
    try {
      setError("");
      const phone = state.matches("phone") ? value : state.context.phone!;
      await services.auth.sendSms(phone);
      machine.send("SET_PHONE", { data: { phone: phone } });
    } catch (e) {
      console.error("Sign up error ", e);
      setError("Impossible d'effectuer la demande");
    }
  };
  const submitCode = async () => {
    // try {
    const pushToken = await getPushToken();
    const authUser = await services.auth.login({ phone: state.context.phone!, code: value, pushToken });
    console.debug("[LOGIN] as ", authUser, machine.send);
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
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <LianeLogo style={styles.image} width="75%" />
      </View>

      <View>
        <AppText numberOfLines={-1} style={styles.helperText}>
          {state.matches("phone") ? t("Veuillez entrer votre numéro de téléphone") : t("Entrez le code reçu par SMS")}
        </AppText>
        {state.matches("phone") ? (
          <PhoneNumberInput phoneNumber={value} onChange={setValue} onValidate={sendCode} />
        ) : (
          <CodeInput code={value} onChange={setValue} onValidate={submitCode} retry={sendCode} />
        )}
        <AppText style={styles.errorText}>{error || " "}</AppText>
      </View>
    </View>
  );
};

const SignUpScreen = () => {
  const { login } = useContext(AppContext);
  const [m] = useState(() => CreateSignUpMachine());
  const machine = useInterpret(m);
  const [state] = useActor(machine);
  machine.onDone((d: DoneEvent) => {
    console.log(JSON.stringify(d));
    login({ ...state.context.authUser! });
  });

  return (
    <SignUpLianeContext.Provider
      /* @ts-ignore */
      value={machine}>
      {["code", "phone"].some(state.matches) && <SignUpPage />}
      {state.matches("form") && <SignUpFormScreen />}
      {!["code", "phone", "form"].some(state.matches) && (
        <Center style={styles.container}>
          <ActivityIndicator />
        </Center>
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
    color: AppColorPalettes.pink[500]
  },
  errorText: {
    color: "red", // TODO red 600,
    textAlign: "center",
    margin: 4
  }
});

export default SignUpScreen;
