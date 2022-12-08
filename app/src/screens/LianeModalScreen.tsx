import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import Modal from "react-native-modal";
import { AppText } from "@/components/base/AppText";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors, AppTheme } from "@/theme/colors";

export const LianeModalScreen = () => { // TODO liane logo
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>

      <Pressable style={styles.iconContainer} onPress={() => setModalVisible(true)}>
        <AppIcon
          name="plus-circle-outline"
          color={AppTheme.primary}
        />
      </Pressable>
      <View style={styles.contentView}>
        <Modal
          backdropOpacity={0.3}
          isVisible={modalVisible}
          onBackdropPress={() => setModalVisible(false)}
        >
          <View style={styles.container}>
            <AppText style={styles.contentTitle}>Hi 👋!</AppText>

            <AppText>Hello from Overlay!</AppText>
          </View>
        </Modal>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    padding: 22,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 17,
    borderTopLeftRadius: 17,
    height: "75%"

  },
  contentTitle: {
    fontSize: 20,
    marginBottom: 12
  },
  contentView: {
    // justifyContent: "flex-end",
    margin: 0
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: AppColors.yellow500
  }
});
