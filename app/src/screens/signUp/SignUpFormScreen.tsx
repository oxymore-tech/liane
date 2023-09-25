import { StyleSheet, View } from "react-native";
import React, { useContext } from "react";
import { Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { FieldValue, FieldValues, FormProvider, SubmitErrorHandler, SubmitHandler, useController, useForm } from "react-hook-form";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppToggle } from "@/components/base/AppOptionToggle";
import { AppContext } from "@/components/context/ContextProvider";
import { SignUpLianeContext } from "@/screens/signUp/StateMachine";

export const SignUpFormScreen = () => {
  const { ...methods } = useForm();

  const machine = useContext(SignUpLianeContext);

  const { services } = useContext(AppContext);
  const onSubmit: SubmitHandler<FieldValues> = data => {
    services.auth
      .updateUserInfo({
        firstName: data.firstname,
        lastName: data.name,
        gender: data.name === "M." ? "Man" : data.name === "Mme" ? "Woman" : "Unspecified"
      })
      .catch(e => console.error(e))
      .then(() => {
        machine.send("NEXT");
      });
  };

  const onError: SubmitErrorHandler<FormValues> = errors => {
    return console.warn(errors);
  };
  // @ts-ignore
  return (
    <Column style={styles.container} spacing={24}>
      <AppText style={styles.title}>Bienvenue sur Liane !</AppText>
      <AppText numberOfLines={-1}>Complétez votre profil pour commencer à utiliser l'application :</AppText>

      <FormProvider {...methods}>
        <Column style={{ flex: 1 }} spacing={12}>
          <View style={{ paddingHorizontal: 8, paddingBottom: 16 }}>
            <OptionField name={"gender"} options={["M.", "Mme", "Non spécifié"]} defaultIndex={2} />
          </View>
          <TextField name={"name"} />
          <TextField name={"firstname"} />

          <View style={{ flex: 1 }} />
          <AppRoundedButton
            color={defaultTextColor(AppColors.primaryColor)}
            onPress={methods.handleSubmit(onSubmit, onError)}
            backgroundColor={AppColors.primaryColor}
            text={"Créer mon compte"}
          />
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

const placeholders: { [k in keyof FormValues]: string } = {
  firstname: "Prénom",
  name: "Nom",
  gender: "Genre"
};

const OptionField = ({ name, defaultIndex = 0, options }: { name: keyof FormValues; defaultIndex?: number; options: string[] }) => {
  const defaultValue = options[defaultIndex];
  const { field } = useController({ name, rules: { required: true }, defaultValue });
  return <AppToggle options={options} defaultSelectedValue={defaultValue} onSelectValue={field.onChange} />;
};

const TextField = ({ name, required = true }: { name: keyof FormValues; required?: boolean }) => {
  const { field, fieldState } = useController({ name, rules: { required } });

  let errorMessage;
  if (fieldState.invalid && fieldState.error?.type === "required") {
    errorMessage = "Ce champ est obligatoire.";
  }
  let borderColor;
  if (errorMessage) {
    borderColor = ContextualColors.redAlert.light;
  } else if (required && field.value?.length > 1) {
    borderColor = AppColorPalettes.blue[300];
  } else {
    borderColor = AppColorPalettes.gray[200];
  }

  return (
    <Column style={{ minHeight: fieldState.invalid ? 56 : 40 }}>
      <View style={[AppStyles.inputContainer, { borderColor: borderColor }]}>
        <AppTextInput
          style={AppStyles.input}
          placeholder={placeholders[name] + (required ? "*" : "")}
          onChangeText={field.onChange}
          value={field.value}
        />
      </View>
      {errorMessage && <AppText style={{ paddingHorizontal: 16, color: ContextualColors.redAlert.text }}>{errorMessage}</AppText>}
    </Column>
  );
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
