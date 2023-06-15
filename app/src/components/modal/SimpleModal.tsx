import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import React, { PropsWithChildren } from "react";
import { AppPressable } from "@/components/base/AppPressable";

export interface SimpleModalProps extends PropsWithChildren {
  backgroundColor?: ColorValue;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}
export const SimpleModal = ({ backgroundColor = AppColors.darkBlue, visible, setVisible, children }: SimpleModalProps) => {
  return (
    <Modal onBackdropPress={() => setVisible(false)} isVisible={visible} onSwipeComplete={() => setVisible(false)} style={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : "height"}>
        <View style={{ backgroundColor, padding: 24, margin: 32, borderRadius: 8 }}>
          <Row style={{ marginBottom: 8 }}>
            <AppPressable style={{ paddingBottom: 16 }} onPress={() => setVisible(false)}>
              <AppIcon name={"close-outline"} color={defaultTextColor(backgroundColor)} />
            </AppPressable>
          </Row>
          {children}
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
