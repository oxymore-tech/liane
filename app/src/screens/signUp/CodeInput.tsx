import React, { useEffect, useState } from "react";
import { AppTextInput } from "@/components/base/AppTextInput";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { sleep } from "@/util/datetime";

type CodeInputProps = {
  onValidate: () => void;
  retry: () => void;
  code: string;
  onChange: (code: string) => void;
};

const resendDelay = 30;
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

export const CodeInput = ({ code, onChange, onValidate, retry }: CodeInputProps) => {
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
            keyboardType={"numeric"}
            onSubmitEditing={onValidate}
            maxLength={6}
          />
          <Row style={{ position: "absolute", bottom: 8 }} spacing={4}>
            {Array.from({ ...code.split(""), length: 6 }).map((c, index) => (
              <View key={index} style={{ borderColor: AppColorPalettes.gray[500], borderBottomWidth: 1 }}>
                <AppText style={[{ fontSize: 24, color: "transparent" }]}>{c || "0"}</AppText>
              </View>
            ))}
          </Row>
        </Column>
        <Pressable style={[styles.button, buttonColor]} disabled={disabled} onPress={onValidate}>
          <AppIcon name="arrow-circle-right-outline" color={AppColors.white} />
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
