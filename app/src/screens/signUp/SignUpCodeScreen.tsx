import React, { useCallback, useContext, useState } from "react";
import {
  Image, KeyboardAvoidingView, Pressable, StyleSheet, View
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppContext } from "@/components/ContextProvider";
import { setStoredToken } from "@/api/storage";
import { NavigationParamList } from "@/api/navigation";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import { scopedTranslate } from "@/api/i18n";
import { AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";

const logo = require("@/assets/logo_white.png");

const t = scopedTranslate("SignUpCode");

type SignUpCodeRouteProp = RouteProp<NavigationParamList, "SignUpCode">;
type SignUpCodeNavigationProp = NativeStackNavigationProp<NavigationParamList, "SignUpCode">;
type SignUpCodeProps = {
  route: SignUpCodeRouteProp;
  navigation: SignUpCodeNavigationProp;
};

const SignUpCodeScreen = ({ route, navigation }: SignUpCodeProps) => {
  const [phoneNumber] = useState(route.params.phoneNumber);
  const [code, setCode] = useState("");
  const { setAuthUser, services } = useContext(AppContext);

  const signIn = useCallback(async () => {
    try {
      const authResponse = await services.auth.login(phoneNumber, code);
      await setStoredToken(authResponse.token);
      await setAuthUser(authResponse.user);
    } catch (e) {
      await setCode("");
      await navigation.navigate("SignUp", { phoneNumber, authFailure: true });
    }
  }, [phoneNumber, code]);

  return (
    <KeyboardAvoidingView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <AppText style={styles.helperText}>
          {t("Un code vous a été envoyé par SMS")}
        </AppText>
        <View
          style={styles.inputContainer}
        >
          <AppTextInput
            style={styles.input}
            autoFocus
            returnKeyLabel="next"
            onChangeText={setCode}
            keyboardType="numeric"
            onSubmitEditing={signIn}
            maxLength={6}
          />
          <Pressable
            style={styles.button}
            disabled={code.length < 6}
            onPress={signIn}
          >
            <AppIcon name="checkmark-circle-2-outline" color={AppColors.white} />

          </Pressable>

        </View>
      </View>
    </KeyboardAvoidingView>
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
    textAlign: "center"
  },
  inputContainer: {
    margin: 16,
    height: 52,
    backgroundColor: AppColors.white,
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 52,
    paddingLeft: 16
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: "20%",
    width: "100%"
  },
  image: {
    width: "64%"
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
  input: {
    fontSize: 24,
    color: AppColors.gray800
  },
  errorText: {
    color: "red", // TODO red 600,
    textAlign: "center",
    margin: 4
  }
});

export default SignUpCodeScreen;
