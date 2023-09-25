import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
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
  action: () => void;
  danger?: boolean;
};
export const ChoiceModal = ({ backgroundColor = AppColors.white, visible, setVisible, choices }: ChoiceModalProps) => {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (visible) {
      setSelected(undefined);
    }
  }, [visible]);
  console.log(choices);

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
        <View style={styles.containerStyle}>
          <View style={[styles.containerStyle, { backgroundColor, height: choices.filter(c => !c.danger).length * 50 }]}>
            {choices
              .filter(c => !c.danger)
              .map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.buttonStyle}
                  onPress={() => {
                    setSelected(i);
                    setVisible(false);
                  }}>
                  <AppText style={styles.textStyle}>{c.text}</AppText>
                </TouchableOpacity>
              ))}
          </View>
          {choices
            .filter(c => c.danger)
            .map((c, i) => (
              <View key={i} style={[styles.containerStyle, styles.containerDangerStyle]}>
                <TouchableOpacity
                  style={[styles.buttonStyle, styles.buttonDangerStyle]}
                  onPress={() => {
                    setSelected(i);
                    setVisible(false);
                  }}>
                  <AppText style={[styles.textStyle, { color: AppColors.white }]}>{c.text}</AppText>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0
  },
  containerStyle: {
    display: "flex",
    margin: 6,
    borderRadius: 18
  },
  containerDangerStyle: {
    height: 50,
    borderRadius: 18
  },
  buttonStyle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonDangerStyle: {
    backgroundColor: AppColors.primaryColor,
    borderRadius: 18
  },
  textStyle: {
    fontSize: 18,
    fontWeight: "bold"
  }
});
