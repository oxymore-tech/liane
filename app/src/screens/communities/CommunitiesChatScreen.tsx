import {
  capitalize,
  Chat,
  CoLiane,
  CoLianeRequest,
  CoMatch,
  LianeMessage,
  MatchGroup,
  MatchSingle,
  MessageContentTrip,
  PaginatedResponse,
  Ref,
  ResolvedLianeRequest,
  TypedLianeMessage,
  UnionUtils,
  User
} from "@liane/common";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { AppLocalization } from "@/api/i18n";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { DebugIdView } from "@/components/base/DebugIdView";
import { UserPicture } from "@/components/UserPicture";
import { AppStyles } from "@/theme/styles";
import { extractDays } from "@/util/hooks/days";
import { AppLogger } from "@/api/logger";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppStorage } from "@/api/storage.ts";
import { TripSurveyView } from "@/components/trip/TripSurveyView.tsx";

const MessageBubble = ({
  message,
  sender,
  isSender,
  previousSender
}: {
  message: LianeMessage;
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
            {message.content.value}
          </AppText>
          <AppText style={{ fontSize: 12, alignSelf: isSender ? "flex-end" : "flex-start" }}>{date}</AppText>
        </Column>
      </Column>
    </Row>
  );
};

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [chat, setchat] = useState<Chat<"Liane">>();
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [group, setGroup] = useState<CoMatch | undefined>(undefined);
  const [liane, setLiane] = useState<CoLiane | undefined>(undefined);
  const [request, setRequest] = useState<CoLianeRequest | ResolvedLianeRequest | undefined>(undefined);
  const [tripModalVisible, setTripModalVisible] = useState(false);

  const members: { [k: string]: User } | undefined = useMemo(
    () => chat?.currentGroup?.members?.reduce((a: { [k: string]: User }, b) => ((a[b.user.id!] = b.user), a), {}),
    [chat?.currentGroup?.members, liane]
  );

  const sendMessage = async (value: string) => {
    let lianeTemp = liane;
    setIsSending(true);

    if (!chat) {
      // Dans le cas ou on envoie un message dans le chat et que nous avons juste l'information du group et non de la liane
      // Cela signifie que nous n'avous pas encore rejoint le groupe
      // Il faut donc le rejoindre avant d'envoyer le message
      // Si c'est un MatchSingle, il faut faire un joinNew
      // Si c'est un MatchGroup, il faut faire un join

      if ((group as MatchGroup).matches?.length) {
        // Dans le cas d'un MatchGroup
        const lianeCible = (group as MatchGroup).liane.id;
        if (request && request.id && lianeCible) {
          const coLiane = await services.community.join(request.id, lianeCible);
          setGroup(undefined);
          lianeTemp = coLiane;
        }
      } else {
        const lianeRequest = (group as MatchSingle).lianeRequest;
        if (request && request.id && lianeRequest && lianeRequest.id) {
          const coLiane = await services.community.joinNew(request.id, lianeRequest.id);
          setGroup(undefined);
          lianeTemp = coLiane;
        }
      }

      if (lianeTemp && lianeTemp.id) {
        try {
          const updatedLianeRequest = await services.community.sendMessage(lianeTemp.id, {
            type: "Text",
            value: value
          });
          setLiane(lianeTemp);
          setInputValue("");
        } catch (e) {
          setError(new Error("Message non envoyé suite à une erreur"));
          AppLogger.debug("COMMUNITIES", "Une erreur est survenu lors de l'entrée dans une nouvelle liane", e);
          setIsSending(false);
        }
      }
    } else {
      if (lianeTemp && lianeTemp.id && value && value.length > 0) {
        try {
          const updatedLianeRequest = await chat?.send({
            type: "Text",
            value: value
          });
          setInputValue("");
        } catch (e) {
          setError(new Error("Message non envoyé suite à une erreur"));
          AppLogger.debug("COMMUNITIES", "Une erreur est survenu lors de l'entrée dans une nouvelle liane", e);
          setIsSending(false);
        }
      } else {
        setError(new Error("Message non envoyé suite à une erreur"));
      }
    }

    setIsSending(false);
  };

  const appendMessage = (m: LianeMessage) => {
    setMessages(oldList => [m, ...oldList]);
    if (liane?.id && chat) {
      chat.readConversation(liane.id, new Date().toISOString()).catch(e => console.warn(e));
    }
  };

  const onReceiveLatestMessages = (m: PaginatedResponse<LianeMessage>) => {
    setMessages(m.data);
    setPaginationCursor(m.next);
  };

  const fetchNextPage = async () => {
    if (paginationCursor && liane && liane.id) {
      const paginatedResult = await services.community.getMessages(liane.id, { cursor: paginationCursor, limit: 15 });
      setMessages(oldList => {
        return [...oldList, ...paginatedResult.data];
      });
      setPaginationCursor(paginatedResult.next);
    }
  };

  const launchTrip = async (roundTrip: boolean) => {
    setTripModalVisible(false);
    const coliane = liane!;
    const me = coliane.members.find(m => m.user.id === user!.id)!;
    const geolocationLevel = await AppStorage.getSetting("geolocation");

    const created = await services.liane.post({
      departureTime: new Date().toISOString(),
      returnTime: roundTrip ? undefined : undefined, //TODO
      from: me.lianeRequest.wayPoints[0].id!,
      to: me.lianeRequest.wayPoints[1].id!,
      availableSeats: me.lianeRequest.canDrive ? 1 : -1,
      geolocationLevel: geolocationLevel || "None",
      recurrence: me.lianeRequest.weekDays
    });
    const m = await services.community.sendMessage(liane!.id!, {
      type: "Trip",
      value: created.id!
    });
    appendMessage(m);
    if (created.return) {
      await services.community.sendMessage(liane!.id!, {
        type: "Trip",
        value: created.return
      });
      appendMessage(m);
    }
  };

  useEffect(() => {
    setLiane(undefined);
    setGroup(undefined);
    setRequest(undefined);
    setError(undefined);

    const fetchLiane = async (id: string) => {
      try {
        const l: CoLiane = await services.community.getLiane(id);
        setLiane(l);
        return l;
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Au moment de récupérer la liane, une erreur c'est produite", e);
      }
    };

    console.log("PARAMS", route.params);
    if (route.params.liane) {
      // Lorsqu'on arrive directement par une liane
      setLiane(route.params.liane);
    }
    if (route.params.group) {
      // Lorsqu'on arrive par un group mais qu'on ne la pas encore rejoint
      setGroup(route.params.group);
    }
    if (route.params.request) {
      // La requête permettant de rejoindre un groupe
      setRequest(route.params.request);
    }
    if (route.params.lianeId) {
      // Lorsqu'on arrive par une notification
      //TODO recup Liane
      fetchLiane(route.params.lianeId).then();
    }
  }, [route.params]);

  useEffect(() => {
    if (liane && liane.id) {
      services.realTimeHub
        .connectToLianeChat(liane.id, onReceiveLatestMessages, appendMessage)
        .then(conv => {
          /* if (__DEV__) {
            console.debug("Joined chat", conv);
          } */
          setchat(conv);
        })
        .catch(e => {
          setError(e);
        });
    }
    return () => {
      if (liane && liane.id) {
        services.realTimeHub.disconnectFromChat().catch(e => {
          if (__DEV__) {
            console.warn(e);
          }
        });
      }
    };
  }, [liane, services.realTimeHub]);

  const sendButton = (
    <View style={{ maxWidth: 45 }}>
      <AppPressableIcon
        style={{ alignSelf: "flex-end" }}
        onPress={async () => {
          await sendMessage(inputValue).then(() => setInputValue(""));
        }}
        iconTransform={[{ rotate: "90deg" }, { translateY: 6 }]}
        name={"navigation-outline"}
      />
    </View>
  );

  console.debug(JSON.stringify(messages));
  return (
    <View style={{ backgroundColor: AppColors.lightGrayBackground, justifyContent: "flex-end", flex: 1 }}>
      {chat && (
        <FlatList
          style={{ paddingHorizontal: 16, marginTop: insets.top + 72 }}
          data={messages}
          keyExtractor={m => m.id!}
          renderItem={({ item, index }) =>
            members ? (
              UnionUtils.isInstanceOf(item.content, "Trip") && !!liane ? (
                <View style={{ marginHorizontal: 24, marginVertical: 16 }}>
                  <TripSurveyView survey={item as TypedLianeMessage<MessageContentTrip>} coLiane={liane!} />
                </View>
              ) : (
                !!members[item.createdBy!] && (
                  <MessageBubble
                    message={item}
                    sender={members[item.createdBy!]}
                    isSender={item.createdBy === user?.id}
                    previousSender={index < messages.length - 1 ? messages[index + 1].createdBy : undefined}
                  />
                )
              )
            ) : null
          }
          inverted={true}
          onEndReachedThreshold={0.2}
          onEndReached={() => fetchNextPage()}
        />
      )}
      {!chat && liane && <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />}
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
        <Row spacing={8} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Row>
            <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} />

            {liane && (
              <View
                style={{
                  justifyContent: "center"
                }}>
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: AppColors.primaryColor
                  }}>
                  {liane?.name}
                </AppText>

                <AppText style={{ fontSize: 14, fontWeight: "400", flexShrink: 1, lineHeight: 16, color: AppColors.black }}>
                  {liane && liane.members?.map(item => item.user?.pseudo).join(", ")}
                </AppText>
              </View>
            )}

            {group && (
              <View
                style={{
                  justifyContent: "center"
                }}>
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: AppColors.primaryColor
                  }}>
                  {`${group?.pickup.label} ➔ ${group?.deposit.label}`}
                </AppText>

                <AppText style={{ fontSize: 14, fontWeight: "400", flexShrink: 1, lineHeight: 16, color: AppColors.black }}>
                  {`${extractDays(group?.weekDays)} `}
                </AppText>
              </View>
            )}
          </Row>
          <Row>
            {liane && (
              <Pressable onPress={() => navigation.navigate("CommunitiesDetails", { liane: liane })}>
                <AppIcon name={"info"} />
              </Pressable>
            )}
          </Row>
        </Row>
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
            {!!liane && (
              <AppPressableIcon
                size={32}
                color={AppColors.white}
                onPress={() => setTripModalVisible(true)}
                name={"plus-outline"}
                style={{ padding: 12 }}
                backgroundStyle={{ borderRadius: 24, backgroundColor: AppColors.primaryColor }}
              />
            )}

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
        <SimpleModal visible={tripModalVisible} setVisible={setTripModalVisible} backgroundColor={AppColors.white} hideClose>
          <Column spacing={8}>
            <AppText style={styles.modalText}>Proposer...</AppText>
            <Pressable style={{ flexDirection: "row", marginHorizontal: 16, paddingVertical: 8 }} onPress={() => launchTrip(false)}>
              <AppIcon name={"car"} />
              <AppText style={[{ marginLeft: 5 }, styles.modalText]}>Trajet aller-simple</AppText>
            </Pressable>
            <Pressable style={{ flexDirection: "row", marginHorizontal: 16, paddingVertical: 8 }} onPress={() => launchTrip(true)}>
              <AppIcon name={"car"} />
              <AppText style={[{ marginLeft: 5 }, styles.modalText]}>Trajet aller-retour</AppText>
            </Pressable>
          </Column>
        </SimpleModal>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24
  }
});
