import React, { useCallback, useContext, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import LianeLogo from "@/assets/logo.svg";
import { AppContext } from "@/components/context/ContextProvider";
import { PhoneNumberInput } from "@/screens/signUp/PhoneNumberInput";
import { CodeInput } from "@/screens/signUp/CodeInput";
import { SignUpFormScreen } from "@/screens/signUp/SignUpFormScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_VERSION } from "@env";
import { AppStyles } from "@/theme/styles";
import { PasswordInput } from "@/screens/signUp/PasswordInput";
import { AuthUser, UserInfo } from "@liane/common";
import { AppLogger } from "@/api/logger";
import { RNAppEnv } from "@/api/env";
import { Center } from "@/components/base/AppLayout";
import { Wallpapers } from "@/components/base/Wallpapers.ts";

const t = scopedTranslate("SignUp");

async function getPushToken() {
  if (__DEV__) {
    return;
  }
  await messaging().registerDeviceForRemoteMessages();
  return await messaging().getToken();
}

type SignUpPageProps = {
  onLogin: (user: AuthUser, isTestAccount: boolean) => void;
};

const SignUpPage = ({ onLogin }: SignUpPageProps) => {
  const insets = useSafeAreaInsets();

  const { services } = useContext(AppContext);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [enterCode, setEnterCode] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string>();

  const phoneIsValid = useMemo(() => {
    if (phone === RNAppEnv.raw.TEST_ACCOUNT) {
      return true;
    }
    return /^((\+?33)|0)[67]\d{8}$/.test(phone);
  }, [phone]);

  const codeIsValid = useMemo(() => {
    if (code.length === 0) {
      return false;
    }
    if (phone === RNAppEnv.raw.TEST_ACCOUNT) {
      return true;
    }
    return /^\d{6}$/.test(code);
  }, [code, phone]);

  const sendSms = useCallback(async () => {
    if (!phone || !phoneIsValid) {
      return;
    }
    setLoading(true);
    try {
      await services.auth.sendSms(phone);
      setCode("");
      setEnterCode(true);
    } finally {
      setLoading(false);
    }
  }, [phone, phoneIsValid, services.auth]);

  const login = useCallback(async () => {
    if (!code || !codeIsValid) {
      return;
    }
    setSigningIn(true);
    try {
      const pushToken = await getPushToken();
      const response = await services.auth.login({ phone, code, pushToken });
      onLogin(response, phone === RNAppEnv.raw.TEST_ACCOUNT);
    } catch (e) {
      AppLogger.error("LOGIN", e);
      setError("Code invalide");
    } finally {
      setSigningIn(false);
    }
  }, [code, codeIsValid, onLogin, phone, services.auth]);

  return (
    <KeyboardAvoidingView style={[styles.container, { flex: 1, flexShrink: 1 }]} behavior={Platform.OS === "android" ? undefined : "height"}>
      <ImageBackground source={Wallpapers[1]} style={{ flex: 1 }}>
        <View style={[styles.imageContainer, { flexShrink: 1 }]}>
          <LianeLogo style={styles.image} width="75%" />
        </View>
        <View>
          <AppText numberOfLines={-1} style={styles.helperText}>
            {!enterCode
              ? t("Entrez votre numéro de téléphone")
              : phone === RNAppEnv.raw.TEST_ACCOUNT
                ? t("Entrez votre mot de passe")
                : t("Entrez le code reçu par SMS")}
          </AppText>
          {!enterCode ? (
            <PhoneNumberInput phoneNumber={phone} canSubmit={phoneIsValid} onChange={setPhone} submit={sendSms} submitting={loading} />
          ) : phone === RNAppEnv.raw.TEST_ACCOUNT ? (
            <PasswordInput code={code} onChange={setCode} onValidate={login} />
          ) : (
            <CodeInput code={code} canSubmit={codeIsValid} onChange={setCode} submit={login} submitting={signingIn} retry={sendSms} />
          )}
          <AppText style={styles.errorText}>{error ?? " "}</AppText>
        </View>
        <View style={{ flex: 1, flexShrink: 1 }} />
        <View style={[{ marginBottom: insets.bottom, paddingBottom: 16 }]}>
          <AppText style={styles.bottomText}>Version: {APP_VERSION}</AppText>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const SignUpScreen = () => {
  const { user, services, login } = useContext(AppContext);

  const [internalUser, setInternalUser] = useState<AuthUser>();

  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(
    (u: AuthUser, isTestAccount: boolean) => {
      if (isTestAccount || u.isSignedUp) {
        login(u);
      } else {
        setInternalUser(u);
      }
    },
    [login]
  );

  const [signUpError, setSignUpError] = useState(false);

  const handleSignUp = useCallback(
    async (info: UserInfo) => {
      if (!internalUser) {
        return;
      }
      setLoading(true);
      setSignUpError(false);
      try {
        await services.auth.updateUserInfo(info);
        login(internalUser);
      } catch (e) {
        setSignUpError(true);
      } finally {
        setLoading(false);
      }
    },
    [internalUser, login, services.auth]
  );

  if (user) {
    return (
      <Center style={[AppStyles.fullHeight]}>
        <ActivityIndicator color={AppColors.primaryColor} size="large" />
      </Center>
    );
  }

  if (!internalUser) {
    return <SignUpPage onLogin={handleLogin} />;
  }

  return <SignUpFormScreen onSubmit={handleSignUp} loading={loading} error={signUpError} />;
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
    fontSize: 23
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: "25%",
    width: "100%"
  },
  image: {
    width: "64%",
    color: AppColorPalettes.orange[500]
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
