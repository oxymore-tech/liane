import React, { useCallback, useEffect, useState } from "react";
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
  submit: () => Promise<void>;
  retry: () => Promise<void>;
  canSubmit?: boolean;
  code: string;
  onChange: (code: string) => void;
};

const resendDelay = 60;
const Retry = ({ retry }: { retry: () => Promise<void> }) => {
  const [allowRetryCountdown, setAllowRetryCountdown] = useState(resendDelay);

  useEffect(() => {
    sleep(1000).then(() => {
      setAllowRetryCountdown(Math.max(0, allowRetryCountdown - 1));
    });
  }, [allowRetryCountdown]);

  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    try {
      setSending(true);
      await retry();
      setAllowRetryCountdown(resendDelay);
    } finally {
      setSending(false);
    }
  }, [retry]);

  return (
    <Column style={{ alignItems: "center" }} spacing={4}>
      {allowRetryCountdown > 0 && (
        <AppText style={{ color: AppColors.white }}>
          Temps restant: <AppText style={{ fontWeight: "bold", color: AppColors.white }}>0:{allowRetryCountdown.toString().padStart(2, "0")}</AppText>
        </AppText>
      )}
      {allowRetryCountdown === 0 && <AppText style={{ color: AppColors.white }}>Vous n'avez rien reçu ?</AppText>}
      <ResendLink allowRetryCountdown={allowRetryCountdown} onSend={handleSend} sending={sending} />
    </Column>
  );
};

export const ResendLink = ({
  allowRetryCountdown,
  onSend,
  sending
}: {
  allowRetryCountdown: number;
  onSend: () => Promise<void>;
  sending: boolean;
}) => {
  if (sending) {
    return (
      <AppPressableOverlay disabled={true} backgroundStyle={{ borderRadius: 32 }} style={{ padding: 8 }}>
        <Row spacing={4} style={{ alignItems: "center" }}>
          <ActivityIndicator color={AppColors.white} size="small" />
        </Row>
      </AppPressableOverlay>
    );
  }

  return (
    <AppPressableOverlay disabled={allowRetryCountdown > 0} backgroundStyle={{ borderRadius: 32 }} style={{ padding: 8 }} onPress={onSend}>
      <Row spacing={4} style={{ alignItems: "center" }}>
        <AppText style={{ textDecorationLine: "underline", color: allowRetryCountdown === 0 ? AppColors.white : AppColorPalettes.gray[300] }}>
          Renvoyer le code
        </AppText>
      </Row>
    </AppPressableOverlay>
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
          {!submitting && <AppIcon name="arrow-right" color={AppColors.white} />}
          {submitting && <ActivityIndicator color={AppColors.white} size="small" />}
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
