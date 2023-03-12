import React from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";

type PhoneNumberInputProps = {
  onValidate: () => void;
  phoneNumber: string;
  onChange: (code: string) => void;
};

export const PhoneNumberInput = ({ onValidate, phoneNumber, onChange }: PhoneNumberInputProps) => {
  const disabled = phoneNumber.length < 10;

  const buttonColor = {
    backgroundColor: disabled ? AppColorPalettes.gray[400] : AppColorPalettes.blue[500]
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <AppTextInput
          style={styles.input}
          placeholder="0XXXXXXXXX"
          autoFocus={true}
          returnKeyLabel={"next"}
          onChangeText={onChange}
          keyboardType={"phone-pad"}
          autoComplete={"tel"}
          textContentType={"telephoneNumber"}
          onSubmitEditing={onValidate}
          maxLength={10}
        />
        <Pressable style={[styles.button, buttonColor]} disabled={disabled} onPress={onValidate}>
          <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
        </Pressable>
      </View>
    </View>
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
    fontSize: AppDimensions.textSize.large,
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
