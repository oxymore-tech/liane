import React, { useCallback, useMemo } from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { Row } from "@/components/base/AppLayout.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";

type PhoneNumberInputProps = {
  submitting?: boolean;
  submit: () => void;
  onChange: (code: string) => void;
  canSubmit: boolean;
  phoneNumber: string;
};

export const PhoneNumberInput = ({ submit, onChange, submitting, canSubmit, phoneNumber }: PhoneNumberInputProps) => {
  const buttonColor = {
    backgroundColor: canSubmit ? AppColorPalettes.blue[500] : AppColorPalettes.gray[400]
  };

  const value = useMemo(() => {
    return phoneNumber.replaceAll(/[^0-9]/g, "");
  }, [phoneNumber]);

  const handleChange = useCallback(
    (v: string) => {
      onChange(v.replaceAll(/[^0-9]/g, ""));
    },
    [onChange]
  );

  return (
    <Row style={styles.container}>
      <Row style={styles.inputContainer}>
        <AppTextInput
          value={value}
          style={styles.input}
          placeholder="0#########"
          autoFocus={true}
          returnKeyLabel="next"
          onChangeText={handleChange}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          onSubmitEditing={submit}
          maxLength={10}
        />
        <Pressable style={[styles.button, buttonColor]} disabled={!canSubmit} onPress={submit}>
          {!submitting && <AppIcon name="arrow-right" color={AppColors.white} />}
          {submitting && <ActivityIndicator color={AppColors.white} size="small" />}
        </Pressable>
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
    paddingLeft: 20,
    width: 270
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
