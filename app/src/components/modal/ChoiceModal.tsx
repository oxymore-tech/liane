import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import React, { useEffect, useState } from "react";
import { AppPressable, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { ActionItem } from "../ActionItem";

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
      onBackButtonPress={() => setVisible(false)}
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
        <View style={[styles.container, { backgroundColor }]}>
          <Row>
            {choices.map((c, i) => (
              <View key={i} style={{ flex: 1 }}>
                <ActionItem
                  onPress={() => {
                    setSelected(i);
                    setVisible(false);
                  }}
                  color={c.color}
                  iconName={c.icon}
                  text={c.text}
                  lines={2}></ActionItem>
              </View>
            ))}
          </Row>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0
  },
  container: {
    borderWidth: 2,
    borderColor: AppColors.primaryColor,
    padding: 24,
    margin: 32,
    borderRadius: 8
  }
});
