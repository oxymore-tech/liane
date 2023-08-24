import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import React, { useEffect, useState } from "react";
import { AppPressable, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";

export interface ChoiceModalProps {
  backgroundColor?: ColorValue;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  choices: Choice[];
}

export type Choice = {
  text: string;
  icon: IconName;
  action: () => void;
  color?: ColorValue;
};
export const ChoiceModal = ({ backgroundColor = AppColors.darkBlue, visible, setVisible, choices }: ChoiceModalProps) => {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (visible) {
      setSelected(undefined);
    }
  }, [visible]);
  return (
    <Modal
      onBackdropPress={() => setVisible(false)}
      isVisible={visible}
      onSwipeComplete={() => setVisible(false)}
      style={styles.modal}
      onModalHide={() => {
        if (selected !== undefined) {
          // call action here
          // see https://github.com/react-native-modal/react-native-modal/issues/30
          choices[selected].action();
        }
      }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : "height"}>
        <View style={{ backgroundColor, padding: 24, margin: 32, borderRadius: 8 }}>
          <Row style={{ marginBottom: 8 }}>
            <AppPressable style={{ paddingBottom: 16 }} onPress={() => setVisible(false)}>
              <AppIcon name={"close-outline"} color={defaultTextColor(backgroundColor)} />
            </AppPressable>
          </Row>
          <Column>
            {choices.map((c, i) => (
              <AppPressableOverlay
                key={i}
                style={{ paddingVertical: 12 }}
                onPress={() => {
                  setSelected(i);
                  setVisible(false);
                }}>
                <Row spacing={24} style={{ alignItems: "center" }}>
                  <AppIcon name={c.icon} color={c.color ?? AppColorPalettes.gray[800]} />
                  <AppText style={{ color: c.color ?? AppColorPalettes.gray[800] }}>{c.text}</AppText>
                </Row>
              </AppPressableOverlay>
            ))}
          </Column>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0
  }
});
