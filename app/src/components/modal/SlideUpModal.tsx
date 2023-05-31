import Modal from "react-native-modal/dist/modal";
import { ColorValue, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import React, { PropsWithChildren } from "react";

export interface SlideUpModalProps extends PropsWithChildren {
  backgroundColor?: ColorValue;
  actionText: string;
  onAction: () => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}
export const SlideUpModal = ({ backgroundColor = AppColors.darkBlue, visible, setVisible, children, actionText, onAction }: SlideUpModalProps) => {
  return (
    <Modal propagateSwipe isVisible={visible} onSwipeComplete={() => setVisible(false)} style={styles.modal}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : undefined}>
        <View style={{ backgroundColor, padding: 24, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <Row style={{ marginBottom: 8 }}>
            <Pressable style={{ paddingBottom: 16 }} onPress={() => setVisible(false)}>
              <AppIcon name={"close-outline"} color={defaultTextColor(backgroundColor)} />
            </Pressable>
          </Row>
          {children}

          <View style={{ justifyContent: "flex-end", paddingHorizontal: 24 }}>
            <AppRoundedButton color={defaultTextColor(AppColors.orange)} onPress={onAction} backgroundColor={AppColors.orange} text={actionText} />
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
