import React, { useEffect, useState } from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { sleep } from "@liane/common";

type CodeInputProps = {
  submitting?: boolean;
  submit: () => void;
  retry: () => void;
  canSubmit?: boolean;
  code: string;
  onChange: (code: string) => void;
};

const resendDelay = 60;
const Retry = (props: { retry: () => void }) => {
  const [allowRetryCountdown, setAllowRetryCountdown] = useState(resendDelay);

  useEffect(() => {
    sleep(1000).then(() => {
      setAllowRetryCountdown(Math.max(0, allowRetryCountdown - 1));
    });
  }, [allowRetryCountdown]);

  return (
    <Column style={{ alignItems: "center" }} spacing={4}>
      {allowRetryCountdown > 0 && (
        <AppText style={{ color: AppColors.white }}>
          Temps restant: <AppText style={{ fontWeight: "bold", color: AppColors.white }}>0:{allowRetryCountdown.toString().padStart(2, "0")}</AppText>
        </AppText>
      )}
      {allowRetryCountdown === 0 && <AppText style={{ color: AppColors.white }}>Vous n'avez rien reçu ?</AppText>}
      <AppPressableOverlay
        disabled={allowRetryCountdown > 0}
        backgroundStyle={{ borderRadius: 32 }}
        style={{ padding: 8 }}
        onPress={() => {
          props.retry();
          setAllowRetryCountdown(resendDelay);
        }}>
        <Row spacing={4} style={{ alignItems: "center" }}>
          <AppText style={{ textDecorationLine: "underline", color: allowRetryCountdown === 0 ? AppColors.white : AppColorPalettes.gray[400] }}>
            Renvoyer le code
          </AppText>
        </Row>
      </AppPressableOverlay>
    </Column>
  );
};

export const CodeInput = ({ canSubmit, onChange, submitting, submit, retry, code }: CodeInputProps) => {
  const buttonColor = {
    backgroundColor: canSubmit ? AppColorPalettes.blue[500] : AppColorPalettes.gray[400]
  };

  return (
    <Column style={styles.container} spacing={16}>
      <View style={styles.inputContainer}>
        <Column style={{ flex: 1 }}>
          <AppTextInput
            value={code}
            style={styles.input}
            placeholder="123456"
            autoFocus={true}
            returnKeyLabel="next"
            onChangeText={onChange}
            keyboardType="numeric"
            onSubmitEditing={submit}
            maxLength={6}
          />
        </Column>
        <Pressable style={[styles.button, buttonColor]} disabled={!canSubmit} onPress={submit}>
          {!submitting && <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />}
          {submitting && <ActivityIndicator color={AppColors.white} size={"small"} />}
        </Pressable>
      </View>
      <Retry retry={retry} />
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
    width: 200,
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
