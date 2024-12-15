import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import React, { PropsWithChildren } from "react";
import { AppPressableOverlay } from "@/components/base/AppPressable";

export interface SlideUpModalProps extends PropsWithChildren {
  backgroundColor?: ColorValue;
  actionText: string;
  onAction: () => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}
export const SlideUpModal = ({
  backgroundColor = AppColors.secondaryColor,
  visible,
  setVisible,
  children,
  actionText,
  onAction
}: SlideUpModalProps) => {
  return (
    <Modal
      propagateSwipe
      onBackButtonPress={() => setVisible(false)}
      isVisible={visible}
      onSwipeComplete={() => setVisible(false)}
      style={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : undefined}>
        <View style={{ backgroundColor, paddingHorizontal: 12, paddingVertical: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <Row style={{ position: "absolute", right: 20, top: 27, zIndex: 10 }}>
            <AppPressableOverlay style={{ padding: 4 }} onPress={() => setVisible(false)}>
              <AppIcon name="close" color={defaultTextColor(backgroundColor)} size={28} />
            </AppPressableOverlay>
          </Row>

          {children}

          <View style={{ justifyContent: "flex-end", paddingHorizontal: 24 }}>
            <AppRoundedButton color={AppColors.white} onPress={onAction} backgroundColor={AppColors.primaryColor} text={actionText} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0
  }
});
