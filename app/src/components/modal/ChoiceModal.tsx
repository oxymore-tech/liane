import { ColorValue, StyleSheet, TouchableOpacity, View } from "react-native";
import { AppColors } from "@/theme/colors";
import React, { useEffect, useState } from "react";
import { AppText } from "@/components/base/AppText";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";

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

  return (
    <SimpleModal visible={visible} setVisible={setVisible}>
      <View style={styles.containerStyle}>
        <View style={[styles.containerStyle, { backgroundColor, height: choices.filter(c => !c.danger).length * 50 }]}>
          {choices
            .map((choice, index) => ({ choice, index }))
            .filter(c => !c.choice.danger)
            .map(c => (
              <TouchableOpacity
                key={c.index}
                style={styles.buttonStyle}
                onPress={() => {
                  setSelected(c.index);
                  setVisible(false);
                }}>
                <AppText style={styles.textStyle}>{c.choice.text}</AppText>
              </TouchableOpacity>
            ))}
        </View>
        {choices
          .map((choice, index) => ({ choice, index }))
          .filter(c => c.choice.danger)
          .map(c => (
            <View key={c.index} style={[styles.containerStyle, styles.containerDangerStyle]}>
              <TouchableOpacity
                style={[styles.buttonStyle, styles.buttonDangerStyle]}
                onPress={() => {
                  setSelected(c.index);
                  setVisible(false);
                }}>
                <AppText style={[styles.textStyle, { color: AppColors.white }]}>{c.choice.text}</AppText>
              </TouchableOpacity>
            </View>
          ))}
      </View>
    </SimpleModal>
  );
};

const styles = StyleSheet.create({
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
