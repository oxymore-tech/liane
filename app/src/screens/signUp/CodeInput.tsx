import React from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";

type CodeInputProps = {
  onValidate: () => void;
  code: string;
  onChange: (code: string) => void;
};

export const CodeInput = ({ code, onChange, onValidate }: CodeInputProps) => {
  const disabled = code.length < 6;

  const buttonColor = {
    backgroundColor: disabled ? AppColors.gray400 : AppColors.blue500
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <AppTextInput
          style={styles.input}
          placeholder=""
          autoFocus={true}
          returnKeyLabel={"next"}
          onChangeText={onChange}
          keyboardType={"numeric"}
          onSubmitEditing={onValidate}
          maxLength={6}
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
    width: 250,
    backgroundColor: AppColors.white,
    display: "flex",
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
    borderTopRightRadius: 52,
    borderBottomRightRadius: 52
  }
});
