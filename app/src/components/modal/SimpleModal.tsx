import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, View, Modal, TouchableOpacity, TouchableWithoutFeedback } from "react-native";
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
    <Modal onRequestClose={hide} visible={visible} animationType="fade" transparent={true} onDismiss={hide}>
      <TouchableOpacity style={styles.modal} activeOpacity={1} onPressOut={hide}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : "height"}>
          <TouchableWithoutFeedback>
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
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  }
});
