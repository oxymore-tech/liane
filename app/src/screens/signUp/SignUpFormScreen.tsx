import { ActivityIndicator, StyleSheet, View } from "react-native";
import React, { useContext } from "react";
import { Center, Column, Space } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { FormProvider, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppLogger } from "@/api/logger";
import { SignUpLianeContext } from "@/screens/signUp/SignUpScreen";
import { useActor } from "@xstate/react";
import { OptionField } from "@/components/forms/fields/OptionField";
import { TextField } from "@/components/forms/fields/TextField";

export const SignUpFormScreen = () => {
  const methods = useForm<FormValues>({ mode: "onChange" });
  const { formState } = methods;
  const machine = useContext(SignUpLianeContext);
  const [state] = useActor(machine);

  const onSubmit: SubmitHandler<FormValues> = data => {
    machine.send([
      "CANCEL",
      {
        type: "SIGNUP",
        data: {
          firstName: data.firstname,
          lastName: data.name,
          gender: data.name === "M." ? "Man" : data.name === "Mme" ? "Woman" : "Unspecified"
        }
      }
    ]);
  };

  const onError: SubmitErrorHandler<FormValues> = errors => {
    return AppLogger.debug("LOGIN", errors);
  };

  const pending = state.toStrings().some(s => s.endsWith("pending"));
  return (
    <Column style={styles.container} spacing={24}>
      <AppText style={styles.title}>Bienvenue sur Liane !</AppText>
      <AppText numberOfLines={-1}>Complétez votre profil pour commencer à utiliser l'application :</AppText>

      <FormProvider {...methods}>
        <Column style={{ flex: 1 }} spacing={12}>
          <View style={{ paddingHorizontal: 8, paddingBottom: 16 }}>
            <OptionField name={"gender"} options={["M.", "Mme", "Non spécifié"]} defaultIndex={2} />
          </View>
          <TextField name={"name"} minLength={2} label={labels.name} />
          <TextField name={"firstname"} minLength={2} label={labels.firstname} />

          <Space />
          {pending && (
            <Center>
              <ActivityIndicator />
            </Center>
          )}
          {!pending && (
            <AppRoundedButton
              enabled={formState.isValid}
              color={defaultTextColor(AppColors.primaryColor)}
              onPress={methods.handleSubmit(onSubmit, onError)}
              backgroundColor={AppColors.primaryColor}
              text={state.toStrings().some(s => s.endsWith("failure")) ? "Réessayer" : "Créer mon compte"}
            />
          )}
        </Column>
      </FormProvider>
    </Column>
  );
};

type FormValues = {
  firstname: string;
  name: string;
  gender: string;
};

const labels: { [k in keyof FormValues]: string } = {
  firstname: "Prénom",
  name: "Nom",
  gender: "Genre"
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 24,
    paddingTop: 52
  },
  title: {
    fontSize: 22,
    fontWeight: "bold"
  }
});
