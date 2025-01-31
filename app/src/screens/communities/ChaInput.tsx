import React, { useCallback, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";

type ChatInputProps = {
  isSending?: boolean;
  onSend: (message: string) => void;
};

const ChatInput = ({ onSend, isSending }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  }, [message, onSend]);

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.textInput, { height: "100%", maxHeight: 200 }]}
        placeholder="Message..."
        value={message}
        clearButtonMode="always"
        onChangeText={setMessage}
        multiline={true}
        placeholderTextColor={AppColorPalettes.gray[400]}
      />
      <View style={{ justifyContent: "flex-end" }}>
        <View style={{ flex: 1 }} />
        <AppButton
          style={{ borderRadius: 16, marginVertical: 5 }}
          onPress={handleSend}
          disabled={message.length === 0}
          icon="send"
          loading={isSending}
          color={AppColors.secondaryColor}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 16
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: AppColors.fontColor,
    textAlignVertical: "center"
  }
});

export default ChatInput;
