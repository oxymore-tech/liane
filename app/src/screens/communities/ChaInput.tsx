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
  const [inputHeight, setInputHeight] = useState(40); // Default height for the TextInput

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend(message);
      setMessage(""); // Clear the input after sending
    }
  }, [message, onSend]);

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.textInput, { height: Math.max(40, inputHeight), maxHeight: 200 }]}
        placeholder="Message..."
        value={message}
        clearButtonMode="always"
        onChangeText={setMessage}
        multiline={true}
        onContentSizeChange={event => {
          setInputHeight(event.nativeEvent.contentSize.height);
        }}
        placeholderTextColor={AppColorPalettes.gray[400]}
      />
      <View style={{ justifyContent: "flex-end" }}>
        <View style={{ flex: 1 }} />
        <AppButton
          style={{ borderRadius: 16, marginVertical: 10 }}
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
    paddingHorizontal: 10,
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius: 16
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    color: AppColors.fontColor
  }
});

export default ChatInput;
