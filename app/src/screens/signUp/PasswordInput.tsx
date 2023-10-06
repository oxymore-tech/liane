import React from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Column } from "@/components/base/AppLayout";

type PasswordInputProps = {
  onValidate: () => void;
  code: string;
  onChange: (code: string) => void;
};

export const PasswordInput = ({ code, onChange, onValidate }: PasswordInputProps) => {
  const disabled = code.length < 6;

  const buttonColor = {
    backgroundColor: disabled ? AppColorPalettes.gray[400] : AppColorPalettes.blue[500]
  };

  return (
    <Column style={styles.container} spacing={16}>
      <View style={styles.inputContainer}>
        <Column style={{ flex: 1 }}>
          <AppTextInput
            style={[styles.input]}
            placeholder=""
            autoFocus={true}
            returnKeyLabel={"next"}
            onChangeText={onChange}
            secureTextEntry={true}
            onSubmitEditing={onValidate}
          />
        </Column>
        <Pressable style={[styles.button, buttonColor]} disabled={disabled} onPress={onValidate}>
          <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
        </Pressable>
      </View>
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "center"
  },
  inputContainer: {
    marginVertical: 16,
    height: 52,
    width: "75%",
    minWidth: 250,
    backgroundColor: AppColors.white,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 52,
    paddingLeft: 20
  },
  input: {
    fontSize: 24,
    letterSpacing: 4,
    color: AppColorPalettes.gray[800]
  },
  button: {
    height: 52,
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 52,
    borderBottomRightRadius: 52
  }
});
