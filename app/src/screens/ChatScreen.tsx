import { ChatMessage, ConversationGroup, DatetimeCursor, PaginatedResponse, User } from "@/api";
import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useContext, useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { toRelativeTimeString } from "@/api/i18n";

export interface ChatScreenParams extends ParamListBase {
  conversationId: string;
}

const MessageBubble = ({ message, currentUser }: { message: ChatMessage; currentUser: User }) => {
  const sender = message.createdBy === currentUser.id;
  return (
    <Column
      spacing={4}
      style={{
        backgroundColor: sender ? AppColorPalettes.gray[100] : AppColorPalettes.blue[100],
        alignSelf: sender ? "flex-end" : "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginVertical: 6,
        marginRight: sender ? 0 : 56,
        marginLeft: sender ? 56 : 0
      }}>
      <AppText style={{ fontSize: 14 }}>{message.text}</AppText>
      <AppText style={{ fontSize: 10, alignSelf: sender ? "flex-end" : "flex-start" }}>{toRelativeTimeString(new Date(message.createdAt!))}</AppText>
    </Column>
  );
};

export const ChatScreen = ({ route, navigation }: NativeStackScreenProps<ChatScreenParams, "Chat">) => {
  const groupId = "63e533f3536b694be7bdf273";
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<DatetimeCursor>();
  const [conversation, setConversation] = useState<ConversationGroup>();
  const [inputValue, setInputValue] = useState<string>("");

  const appendMessage = (m: ChatMessage) => {
    console.log([m, ...messages]);
    setMessages(oldList => [m, ...oldList]);
  };

  const onReceiveLatestMessages = (m: PaginatedResponse<ChatMessage>) => {
    setMessages(m.data);
    setPaginationCursor(m.nextCursor);
  };

  const fetchNextPage = async () => {
    if (paginationCursor) {
      console.log(paginationCursor);
      const paginatedResult = await services.chatHub.list(groupId, { cursor: paginationCursor, limit: 15 });
      setMessages(oldList => {
        console.log(oldList.length);
        console.log(oldList.map(o => o.id));
        console.log(paginatedResult.data.length);
        console.log(paginatedResult.data.map(o => o.id));
        return [...oldList, ...paginatedResult.data];
      });
      setPaginationCursor(paginatedResult.nextCursor);
    }
  };

  useEffect(() => {
    services.chatHub.connectToChat(groupId, onReceiveLatestMessages, appendMessage).then(conv => {
      if (__DEV__) {
        console.log("Joined conversation", conv);
      }
      setConversation(conv);
    });
    return () => {
      services.chatHub.disconnectFromConversation().catch(e => {
        if (__DEV__) {
          console.log(e);
        }
      });
    };
  }, [services]);

  const sendButton = (
    <Pressable
      style={{ alignSelf: "flex-end" }}
      onPress={async () => {
        if (inputValue && inputValue.length > 0) {
          await services.chatHub.send({ text: inputValue });
        }
      }}>
      <AppIcon name={"navigation-2-outline"} color={AppColors.blue} />
    </Pressable>
  );

  return (
    <View style={{ backgroundColor: AppColors.white, justifyContent: "flex-end", flex: 1 }}>
      <FlatList
        style={{ paddingHorizontal: 16, marginTop: insets.top + 72 }}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble message={item} currentUser={user!} />}
        inverted={true}
        onEndReachedThreshold={0.2}
        onEndReached={() => fetchNextPage()}
      />

      <Row
        spacing={16}
        style={{ backgroundColor: AppColors.darkBlue, padding: 16, paddingBottom: 16 + insets.bottom + 8, marginTop: 8, alignItems: "flex-end" }}>
        <AppButton onPress={() => {}} icon="plus-outline" color={AppColors.white} kind="circular" foregroundColor={AppColors.blue} />

        <AppExpandingTextInput multiline={true} trailing={sendButton} onChangeText={setInputValue} clearButtonMode="always" />
      </Row>

      <Row
        spacing={8}
        style={{
          backgroundColor: AppColors.darkBlue,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 16 + insets.top,
          paddingBottom: 16,
          paddingHorizontal: 8
        }}>
        <Pressable style={{ padding: 8 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
        </Pressable>
        {conversation ? (
          <View
            style={{
              backgroundColor: AppColors.white,
              borderRadius: 24,
              paddingVertical: 16,
              paddingHorizontal: 24
            }}>
            <AppText>{conversation.id}</AppText>
          </View>
        ) : null}
      </Row>
    </View>
  ); // TODO loading screen
};
