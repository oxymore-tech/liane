import React, { useCallback, useContext, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { NavigationParamList } from "@/api/navigation";
import { scopedTranslate } from "@/api/i18n";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import { AppContext } from "@/components/ContextProvider";

const logo = require("@/assets/logo_white.png");

const t = scopedTranslate("SignUp");

type SignUpRouteProp = RouteProp<NavigationParamList, "SignUp">;
type SignUpNavigationProp = NativeStackNavigationProp<NavigationParamList, "SignUp">;

type SignUpProps = {
  route: SignUpRouteProp;
  navigation: SignUpNavigationProp;
};

const SignUpScreen = ({ route, navigation }: SignUpProps) => {
  const authFailure = route.params?.authFailure && t("Le code est invalide veuillez rééssayer");

  const [phoneNumber, setPhoneNumber] = useState(route.params?.phoneNumber || "");
  const [internalError, setInternalError] = useState<string>();
  const { repository } = useContext(AppContext);

  const signUp = useCallback(async () => {
    try {
      setInternalError(undefined);
      await repository.auth.sendSms(phoneNumber);
      navigation.navigate("SignUpCode", { phoneNumber });
    } catch (e) {
      console.log("sign up error ", e);
      setInternalError("Impossible d'effectuer la demande");
    }
  }, [phoneNumber]);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          style={styles.image}
          source={logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <AppText style={styles.helperText}>
          {t("Veuillez entrer votre numéro de téléphone")}
        </AppText>
        <View
          style={styles.inputContainer}
        >
          <AppTextInput
            style={styles.input}
            placeholder=""
            autoFocus
            returnKeyLabel="next"
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            onSubmitEditing={signUp}
            maxLength={10}
          />
          <Pressable
            style={styles.button}
            disabled={phoneNumber.length < 10}
            onPress={signUp}
          >
            <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
          </Pressable>
        </View>
        <AppText style={styles.errorText}>
          {internalError || authFailure || " "}
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
