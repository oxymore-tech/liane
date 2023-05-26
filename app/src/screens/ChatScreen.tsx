import { ChatMessage, ConversationGroup, Liane, PaginatedResponse, User } from "@/api";
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppContext } from "@/components/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { toRelativeTimeString } from "@/api/i18n";
import { useAppNavigation } from "@/api/navigation";
import { TripOverviewHeader } from "@/components/trip/TripOverviewHeader";
import { getTripFromLiane } from "@/components/trip/trip";
import { capitalize } from "@/util/strings";
import { SimpleModal } from "@/components/modal/SimpleModal";
import { UserPicture } from "@/components/UserPicture";
import { AppPressable } from "@/components/base/AppPressable";
const MessageBubble = ({ message, currentUser }: { message: ChatMessage; currentUser: User }) => {
  const sender = message.createdBy === currentUser.id;
  const date = capitalize(toRelativeTimeString(new Date(message.createdAt!)));
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
      <AppText style={{ fontSize: 10, alignSelf: sender ? "flex-end" : "flex-start" }}>{date}</AppText>
    </Column>
  );
};

const AttachedLianeOverview = ({ liane, user }: { liane: Liane; user: User }) => {
  const { wayPoints, departureTime } = getTripFromLiane(liane, user);

  return (
    <View style={{ paddingLeft: 56, paddingTop: 8, paddingRight: 16 }}>
      <TripOverviewHeader from={wayPoints[0].rallyingPoint} to={wayPoints[wayPoints.length - 1].rallyingPoint} dateTime={departureTime} />
    </View>
  );
};

export const ChatScreen = () => {
  const { navigation, route } = useAppNavigation<"Chat">();
  const groupId = route.params.conversationId;
  const attachedLiane: Liane | undefined = undefined; //route.params.liane;
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [conversation, setConversation] = useState<ConversationGroup>();
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [showMoreModal, setShowMoreModal] = useState(false);

  const members = conversation
    ? conversation.members
        .filter(m => m.user.id !== user!.id)
        .map(m => m.user.pseudo)
        .join(", ")
    : "";

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
    //console.log(paginationCursor);
    if (paginationCursor) {
      const paginatedResult = await services.chatHub.list(groupId, { cursor: paginationCursor, limit: 15 });
      setMessages(oldList => {
        return [...oldList, ...paginatedResult.data];
      });
      setPaginationCursor(paginatedResult.next);
    }
  };

  useEffect(() => {
    services.chatHub
      .connectToChat(route.params.conversationId, onReceiveLatestMessages, appendMessage)
      .then(conv => {
        if (__DEV__) {
          console.log("Joined conversation", conv);
        }
        setConversation(conv);
      })
      .catch(e => setError(e));

    return () => {
      services.chatHub.disconnectFromChat(route.params.conversationId).catch(e => {
        if (__DEV__) {
          console.log(e);
        }
      });
    };
  }, [route.params.conversationId, services.chatHub]);

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
        <Center style={{ flex: 1 }}>
          <ActivityIndicator />
        </Center>
      )}
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <View
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
        <Row spacing={8}>
          <Pressable style={{ padding: 8 }} onPress={() => navigation.goBack()}>
            <AppIcon name={"arrow-ios-back-outline"} color={AppColors.white} />
          </Pressable>
          {conversation && (
            <View
              style={{
                justifyContent: "center"
              }}>
              <AppText style={{ color: AppColors.white, fontSize: 16 }}>{members}</AppText>
            </View>
          )}
        </Row>
        {attachedLiane && <AttachedLianeOverview liane={attachedLiane} user={user!} />}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "height" : "padding"}
        style={{
          backgroundColor: AppColors.darkBlue
        }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 12 + insets.bottom,
            paddingTop: 12,
            marginTop: 8
          }}>
          <Row style={{ alignItems: "flex-end" }} spacing={16}>
            <AppButton
              onPress={() => {
                setShowMoreModal(true);
              }}
              icon="plus-outline"
              color={AppColors.white}
              kind="circular"
              foregroundColor={AppColors.blue}
            />

            <AppExpandingTextInput multiline={true} trailing={sendButton} onChangeText={setInputValue} value={inputValue} clearButtonMode="always" />
          </Row>
        </View>
      </KeyboardAvoidingView>
      <SimpleModal visible={showMoreModal} setVisible={setShowMoreModal} backgroundColor={AppColors.white}>
        <Column>
          <AppPressable style={{ paddingVertical: 12 }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"phone-call-outline"} />
              <AppText>Appeler le conducteur</AppText>
            </Row>
          </AppPressable>
          <AppPressable style={{ paddingVertical: 12 }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"image-outline"} />
              <AppText>Partager une image</AppText>
            </Row>
          </AppPressable>
          <AppPressable style={{ paddingVertical: 12 }}>
            <Row spacing={24} style={{ alignItems: "center" }}>
              <AppIcon name={"pin-outline"} />
              <AppText>Partager une position</AppText>
            </Row>
          </AppPressable>
        </Column>
      </SimpleModal>
    </View>
  ); // TODO loading screen
};
