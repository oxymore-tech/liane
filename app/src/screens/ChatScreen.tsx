import { ChatMessage, ConversationGroup, PaginatedResponse, User } from "@/api";
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { toRelativeTimeString } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";
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
      <AppText numberOfLines={-1} style={{ fontSize: 14 }}>
        {message.text}
      </AppText>
      <AppText style={{ fontSize: 10, alignSelf: sender ? "flex-end" : "flex-start" }}>{toRelativeTimeString(new Date(message.createdAt!))}</AppText>
    </Column>
  );
};

export const ChatScreen = () => {
  const { navigation, route } = useAppNavigation<"Chat">();
  const groupId = route.params.conversationId;
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [conversation, setConversation] = useState<ConversationGroup>();
  const [inputValue, setInputValue] = useState<string>("");

  const members = conversation ? conversation.id : ""; //TODO

  const appendMessage = (m: ChatMessage) => {
    // console.log([m, ...messages]);
    setMessages(oldList => [m, ...oldList]);
    setInputValue("");
  };

  const onReceiveLatestMessages = (m: PaginatedResponse<ChatMessage>) => {
    setMessages(m.data);
    setPaginationCursor(m.next);
  };

  const fetchNextPage = async () => {
    console.log(paginationCursor);
    if (paginationCursor) {
      const paginatedResult = await services.chatHub.list(groupId, { cursor: paginationCursor, limit: 15 });
      setMessages(oldList => {
        return [...oldList, ...paginatedResult.data];
      });
      setPaginationCursor(paginatedResult.next);
    }
  };

  useEffect(() => {
    services.chatHub.connectToChat(route.params.conversationId, onReceiveLatestMessages, appendMessage).then(conv => {
      if (__DEV__) {
        console.log("Joined conversation", conv);
      }
      setConversation(conv);
    });
    return () => {
      services.chatHub.disconnectFromChat(route.params.conversationId).catch(e => {
        if (__DEV__) {
          console.log(e);
        }
      });
    };
  }, [route, services]);

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
      {conversation && (
        <FlatList
          style={{ paddingHorizontal: 16, marginTop: insets.top + 72 }}
          data={messages}
          keyExtractor={m => m.id!}
          renderItem={({ item }) => <MessageBubble message={item} currentUser={user!} />}
          inverted={true}
          onEndReachedThreshold={0.2}
          onEndReached={() => fetchNextPage()}
        />
      )}
      {!conversation && (
        <Center>
          <ActivityIndicator />
        </Center>
      )}
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
              justifyContent: "center"
            }}>
            <AppText style={{ color: AppColors.white, fontSize: 16 }}>{members}</AppText>
          </View>
        ) : null}
      </Row>

      <Row
        spacing={16}
        style={{ backgroundColor: AppColors.darkBlue, padding: 16, paddingBottom: 16 + insets.bottom + 8, marginTop: 8, alignItems: "flex-end" }}>
        <AppButton onPress={() => {}} icon="plus-outline" color={AppColors.white} kind="circular" foregroundColor={AppColors.blue} />

        <AppExpandingTextInput multiline={true} trailing={sendButton} onChangeText={setInputValue} value={inputValue} clearButtonMode="always" />
      </Row>
    </View>
  ); // TODO loading screen
};
