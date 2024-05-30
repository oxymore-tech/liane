import { capitalize, Chat, ChatMessage, PaginatedResponse, Ref, User } from "@liane/common";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { AppLocalization } from "@/api/i18n";
import { useAppNavigation } from "@/components/context/routing";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { DebugIdView } from "@/components/base/DebugIdView";
import { UserPicture } from "@/components/UserPicture";
import { AppStyles } from "@/theme/styles";

const MessageBubble = ({
  message,
  sender,
  isSender,
  previousSender
}: {
  message: ChatMessage;
  sender: User;
  isSender: boolean;
  previousSender?: Ref<User> | undefined;
}) => {
  const firstBySender = previousSender !== sender.id;
  const date = capitalize(AppLocalization.toRelativeTimeString(new Date(message.createdAt!)));
  return (
    <Row
      spacing={8}
      style={{
        marginBottom: 6,
        alignSelf: isSender ? "flex-end" : "flex-start",
        marginTop: firstBySender ? 6 : 0,
        maxWidth: "80%"
      }}>
      {!isSender && firstBySender && <UserPicture url={sender.pictureUrl} id={sender.id} size={32} />}
      {!isSender && !firstBySender && <View style={{ width: 32 }} />}
      <Column spacing={2}>
        {!isSender && firstBySender && (
          <AppText style={{ marginLeft: 6, alignSelf: "flex-start", fontSize: 14, fontWeight: "500", color: AppColorPalettes.blue[700] }}>
            {sender.pseudo}
          </AppText>
        )}
        <Column
          style={{
            backgroundColor: isSender ? AppColors.white : AppColorPalettes.orange[100],
            alignSelf: isSender ? "flex-end" : "flex-start",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginRight: isSender ? 0 : 56,
            marginLeft: isSender ? 56 : 0
          }}
          spacing={4}>
          <AppText numberOfLines={-1} style={{ fontSize: 15 }}>
            {message.text}
          </AppText>
          <AppText style={{ fontSize: 12, alignSelf: isSender ? "flex-end" : "flex-start" }}>{date}</AppText>
        </Column>
      </Column>
    </Row>
  );
};

export const ChatScreen = () => {
  const { navigation, route } = useAppNavigation<"Chat">();
  const groupId = route.params.conversationId;
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [chat, setChat] = useState<Chat<"Group">>();
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const membersNames = useMemo(
    () =>
      chat?.currentGroup
        ? chat.currentGroup.members
            .filter(m => m.user.id !== user!.id)
            .map(m => m.user.pseudo)
            .join(", ")
        : "",
    [chat, user]
  );

  const members: { [k: string]: User } | undefined = useMemo(
    () => chat?.currentGroup?.members.reduce((a: { [k: string]: User }, b) => ((a[b.user.id!] = b.user), a), {}),
    [chat?.currentGroup?.members]
  );

  const appendMessage = (m: ChatMessage) => {
    setMessages(oldList => [m, ...oldList]);
    setInputValue("");
    chat?.readConversation(groupId, new Date().toISOString()).catch(e => console.warn(e));
  };

  const onReceiveLatestMessages = (m: PaginatedResponse<ChatMessage>) => {
    setMessages(m.data);
    setPaginationCursor(m.next);
  };

  const fetchNextPage = async () => {
    if (paginationCursor) {
      const paginatedResult = await services.conversation.getMessages(groupId, { cursor: paginationCursor, limit: 15 });
      setMessages(oldList => {
        return [...oldList, ...paginatedResult.data];
      });
      setPaginationCursor(paginatedResult.next);
    }
  };

  useEffect(() => {
    services.realTimeHub
      .connectToTripChat(route.params.conversationId, onReceiveLatestMessages, appendMessage)
      .then(setChat)
      .catch(e => setError(e));

    return () => {
      services.realTimeHub.disconnectFromChat().catch(e => {
        if (__DEV__) {
          console.warn(e);
        }
      });
    };
  }, [route.params.conversationId, services.realTimeHub]);

  const sendButton = (
    <View style={{ maxWidth: 45 }}>
      <AppPressableIcon
        style={{ alignSelf: "flex-end" }}
        onPress={async () => {
          if (inputValue && inputValue.length > 0) {
            setIsSending(true);
            await chat?.send({ text: inputValue });
            setIsSending(false);
          }
        }}
        iconTransform={[{ rotate: "90deg" }, { translateY: 6 }]}
        name={"navigation-outline"}
      />
    </View>
  );

  //console.debug(JSON.stringify(messages), chat?.members);
  return (
    <View style={{ backgroundColor: AppColors.lightGrayBackground, justifyContent: "flex-end", flex: 1 }}>
      {chat && (
        <FlatList
          style={{ paddingHorizontal: 16, marginTop: insets.top + 72 }}
          data={messages}
          keyExtractor={m => m.id!}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              sender={members![item.createdBy!]}
              isSender={item.createdBy === user?.id}
              previousSender={index < messages.length - 1 ? messages[index + 1].createdBy : undefined}
            />
          )}
          inverted={true}
          onEndReachedThreshold={0.2}
          onEndReached={() => fetchNextPage()}
        />
      )}
      {!chat && <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />}
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <View
        style={{
          backgroundColor: AppColors.white,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: 16 + insets.top,
          padding: 16
        }}>
        <Row spacing={8}>
          <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} />

          {chat && (
            <View
              style={{
                justifyContent: "center"
              }}>
              <AppText style={{ color: AppColors.primaryColor, fontSize: 18, fontWeight: "bold" }}>{membersNames}</AppText>
            </View>
          )}
        </Row>
        {/* TODO attachedLiane && <AttachedLianeOverview liane={attachedLiane} user={user!} />*/}
        {chat?.currentGroup && <DebugIdView object={chat?.currentGroup} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "android" ? "height" : "padding"}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 12 + insets.bottom,
            paddingTop: 12,
            marginTop: 8
          }}>
          <Row spacing={16}>
            {/*} <AppButton
              onPress={() => {
                setShowMoreModal(true);
              }}
              icon="attach-outline"
              color={AppColors.white}
              kind="circular"
              foregroundColor={AppColors.blue}
            />*/}

            <AppExpandingTextInput
              multiline={true}
              backgroundStyle={{ backgroundColor: AppColors.white, borderRadius: 16, padding: 16, flex: 1 }}
              trailing={
                !isSending ? (
                  sendButton
                ) : (
                  <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />
                )
              }
              onChangeText={setInputValue}
              value={inputValue}
              clearButtonMode="always"
            />
          </Row>
        </View>
      </KeyboardAvoidingView>
      <SimpleModal visible={showMoreModal} setVisible={setShowMoreModal} backgroundColor={AppColors.white}>
        <Column>
          {/* TODO (attachedLiane && user!.id !== attachedLiane.driver.user) && <AppPressable style={{ paddingVertical: 12 }} onPress={() => {
            Linking.openURL(`tel:${attachedLiane.members.}`)
          }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"phone-call-outline"} />
              <AppText>Appeler le conducteur</AppText>
            </Row>
          </AppPressable>*/}
          <AppPressableOverlay style={{ paddingVertical: 12 }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"image-outline"} />
              <AppText>Partager une image</AppText>
            </Row>
          </AppPressableOverlay>
          <AppPressableOverlay style={{ paddingVertical: 12 }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"pin-outline"} />
              <AppText>Partager une position</AppText>
            </Row>
          </AppPressableOverlay>
        </Column>
      </SimpleModal>
    </View>
  ); // TODO loading screen
};
