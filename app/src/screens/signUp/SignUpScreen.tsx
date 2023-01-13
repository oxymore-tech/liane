import React, { useCallback, useContext, useState } from "react";
import { Pressable, StyleSheet, TextInputProps, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavigationParamList } from "@/api/navigation";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import LianeLogo from "@/assets/logo.svg";
import { AppContext } from "@/components/ContextProvider";

/* Sign up process steps */
export enum SignUpStep {
  SetPhoneNumber,
  EnterCode
}

const t = scopedTranslate("SignUp");

type SignUpRouteProp = RouteProp<NavigationParamList, "SignUp">;
type SignUpNavigationProp = NativeStackNavigationProp<NavigationParamList, "SignUp">;

export type SignUpProps = {
  route: SignUpRouteProp;
  navigation: SignUpNavigationProp;
};

/* Function to build a page of the sign-up process */
type SignUpPageBuilder = (navigation: SignUpNavigationProp, initialPhoneNumber: string, setInternalError: any) => PageData;

/* Data necessary to build a page of the sign-up process */
type PageData = {
  onValidate: any;
  canValidate: any;
  textInputProps: TextInputProps;
  helperText: string;
};

/* Builder for the first step of the sign-up */
const SetPhoneNumberPageBuilder : SignUpPageBuilder = (navigation: SignUpNavigationProp, initialPhoneNumber: string, setInternalError) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || "");
  const { services } = useContext(AppContext);
  const signUp = useCallback(async () => {
    try {
      setInternalError(undefined);
      await services.auth.sendSms(phoneNumber);
      navigation.navigate("SignUp", { signUpStep: SignUpStep.EnterCode, phoneNumber });
    } catch (e) {
      console.log("sign up error ", e);
      setInternalError("Impossible d'effectuer la demande");
    }
  }, [phoneNumber]);
  return {
    onValidate: signUp,
    textInputProps: { placeholder: "",
      autoFocus: true,
      returnKeyLabel: "next",
      onChangeText: setPhoneNumber,
      keyboardType: "phone-pad",
      autoComplete: "tel",
      textContentType: "telephoneNumber",
      onSubmitEditing: signUp,
      maxLength: 10 },
    canValidate: () => (phoneNumber.length === 10),
    helperText: t("Veuillez entrer votre numéro de téléphone")
  };
};

/* Builder for the second step of the sign-up */
const SetCodePageBuilder : SignUpPageBuilder = (navigation: SignUpNavigationProp, phoneNumber: string) => {
  const [code, setCode] = useState("");
  const { setAuthUser, services } = useContext(AppContext);
  const signIn = useCallback(async () => {
    try {
      await services.auth.login(phoneNumber, code);
      await setAuthUser();
    } catch (e) {
      await setCode("");
      await navigation.navigate("SignUp", { signUpStep: SignUpStep.SetPhoneNumber, phoneNumber, authFailure: true });
    }
  }, [phoneNumber, code]);
  return {
    onValidate: signIn,
    textInputProps: { placeholder: "",
      autoFocus: true,
      returnKeyLabel: "next",
      onChangeText: setCode,
      keyboardType: "numeric",
      onSubmitEditing: signIn,
      maxLength: 6 },
    canValidate: () => (code.length === 6),
    helperText: t("Un code vous a été envoyé par SMS")
  };
};

const SignUpScreen = ({ route, navigation }: SignUpProps) => {

  const step = route.params?.signUpStep;
  const phoneNumber = route.params?.phoneNumber || "";
  const [internalError, setInternalError] = useState<string>();

  if (route.params?.authFailure) {
    setInternalError(t("Le code est invalide veuillez rééssayer"));
  }
  let pageBuilder: SignUpPageBuilder;
  switch (step) {
    case SignUpStep.EnterCode:
      pageBuilder = SetCodePageBuilder;
      break;
    case SignUpStep.SetPhoneNumber:
    default:
      pageBuilder = SetPhoneNumberPageBuilder;
      break;
  }

  const { onValidate, canValidate, textInputProps, helperText } = pageBuilder(navigation, phoneNumber, setInternalError);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <LianeLogo width="75%" />

      </View>

      <View>
        <AppText style={styles.helperText}>
          {t(helperText)}
        </AppText>
        <View
          style={styles.inputContainer}
        >
          <AppTextInput
            style={styles.input}
            {...textInputProps}
          />
          <Pressable
            style={styles.button}
            disabled={!canValidate()}
            onPress={onValidate}
          >
            <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
          </Pressable>
        </View>
        <AppText style={styles.errorText}>
          {internalError || " "}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    backgroundColor: AppColors.gray700
  },
  helperText: {
    marginHorizontal: 16,
    marginVertical: 4,
    textAlign: "center",
    color: AppColors.white
  },
  inputContainer: {
    marginVertical: 16,
    marginHorizontal: 32,
    height: 52,
    backgroundColor: AppColors.white,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 52,
    paddingLeft: 20
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: "20%",
    width: "100%"
  },
  image: {
    width: "64%"
  },
  input: {
    fontSize: 24,
    color: AppColors.gray800
  },
  button: {
    height: 52,
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.gray400,
    borderTopRightRadius: 52,
    borderBottomRightRadius: 52
  },
  errorText: {
    color: "red", // TODO red 600,
    textAlign: "center",
    margin: 4
  }
});

export default SignUpScreen;
