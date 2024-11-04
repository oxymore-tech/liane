import React from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { StyleSheet } from "react-native";
import { AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";

type PhoneNumberInputProps = {
  submitting?: boolean;
  submit: () => void;
  onChange: (code: string) => void;
  canSubmit: boolean;
  phoneNumber: string;
};

export const PhoneNumberInput = ({ submit, onChange, submitting, canSubmit }: PhoneNumberInputProps) => {
  return (
    <Row style={styles.container}>
      <Row style={styles.inputContainer}>
        <AppTextInput
          style={styles.input}
          placeholder="0XXXXXXXXX"
          autoFocus={true}
          returnKeyLabel="next"
          onChangeText={onChange}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          onSubmitEditing={submit}
          maxLength={10}
          trailing={<AppButton icon="phone-outline" color={AppColors.primaryColor} disabled={!canSubmit} onPress={submit} loading={submitting} />}
        />
      </Row>
    </Row>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  inputContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.white,
    borderRadius: 52,
    paddingLeft: 20
  },
  input: {
    fontSize: AppDimensions.textSize.large
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
