import React from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";

type PhoneNumberInputProps = {
  onValidate: () => void;
  phoneNumber: string;
  onChange: (code: string) => void;
};

export const PhoneNumberInput = ({ onValidate, phoneNumber, onChange }: PhoneNumberInputProps) => {
  return (
    <View style={styles.inputContainer}>
      <AppTextInput
        style={styles.input}
        placeholder=""
        autoFocus={true}
        returnKeyLabel={"next"}
        onChangeText={onChange}
        keyboardType={"phone-pad"}
        autoComplete={"tel"}
        textContentType={"telephoneNumber"}
        onSubmitEditing={onValidate}
        maxLength={10}
      />
      <Pressable style={styles.button} disabled={phoneNumber.length < 10} onPress={onValidate}>
        <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
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
  }
});
