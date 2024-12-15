import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import React, { PropsWithChildren, useCallback } from "react";
import { AppPressable } from "@/components/base/AppPressable";

export interface SimpleModalProps extends PropsWithChildren {
  backgroundColor?: ColorValue;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  hideClose?: boolean;
}
export const SimpleModal = ({ backgroundColor = AppColors.secondaryColor, visible, setVisible, children, hideClose }: SimpleModalProps) => {
  const hide = useCallback(() => setVisible(false), [setVisible]);
  return (
    <Modal onBackButtonPress={hide} onBackdropPress={hide} isVisible={visible} onSwipeComplete={hide} style={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : "height"}>
        <View style={{ backgroundColor, padding: 16, borderRadius: 8 }}>
          <Row style={{ marginBottom: 8 }}>
            {!hideClose && (
              <AppPressable style={{ paddingBottom: 16 }} onPress={hide}>
                <AppIcon name="close" color={defaultTextColor(backgroundColor)} />
              </AppPressable>
            )}
          </Row>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { margin: 8 }
});
