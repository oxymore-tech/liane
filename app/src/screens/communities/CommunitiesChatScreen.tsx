import { Chat, CoLiane, LianeMessage, PaginatedResponse, RallyingPoint, Ref } from "@liane/common";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { useAppNavigation } from "@/components/context/routing";
import { AppStyles } from "@/theme/styles";
import { AppLogger } from "@/api/logger";
import { MessageBubble } from "@/screens/communities/MessageBubble";
import { useSubscription } from "@/util/hooks/subscription.ts";
import { TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { useQueryClient } from "react-query";
import { AppButton } from "@/components/base/AppButton";
import { LaunchTripModal } from "@/screens/communities/LaunchTripModal";

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [chat, setChat] = useState<Chat<"Liane">>();
  const [inputValue, setInputValue] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [liane, setLiane] = useState<CoLiane | undefined>(undefined);

  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [loading, setLoading] = useState(typeof route.params.liane === "string");

  useSubscription<CoLiane>(
    services.realTimeHub.lianeUpdates,
    updatedLiane => {
      if (updatedLiane.id === liane?.id) {
        setLiane(updatedLiane);
      }
    },
    [liane?.id]
  );

  const sendMessage = useCallback(async () => {
    const lianeTemp = liane;
    setIsSending(true);

    if (lianeTemp && lianeTemp.id && inputValue && inputValue.length > 0) {
      try {
        await chat?.send({
          type: "Text",
          value: inputValue
        });
        setInputValue("");
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenu lors de l'entrée dans une nouvelle liane", e);
        setIsSending(false);
      }
    }

    setIsSending(false);
  }, [chat, inputValue, liane]);

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

  const me = useMemo(() => liane?.members.find(m => m.user.id === user!.id), [liane?.members, user]);
  const name = me && me.lianeRequest ? me?.lianeRequest.name : `${me?.lianeRequest.wayPoints[0].label}  ➔ ${me?.lianeRequest.wayPoints[1].label}`;
  const [launching, setLaunching] = useState(false);

  const launchTrip = useCallback(
    async (arriveAt: Date, returnAt: Date | undefined, from: Ref<RallyingPoint>, to: Ref<RallyingPoint>) => {
      setLaunching(true);
      await services.trip.post({
        liane: liane!.id!,
        arriveAt: arriveAt.toISOString(),
        returnAt: returnAt?.toISOString(),
        from,
        to,
        availableSeats: me!.lianeRequest.canDrive ? 1 : -1
      });
      await queryClient.invalidateQueries(TripQueryKey);
      setLaunching(false);
      setTripModalVisible(false);
    },
    [liane, me, queryClient, services.trip]
  );

  useEffect(() => {
    setLiane(undefined);

    if (typeof route.params.liane === "string") {
      services.community
        .get(route.params.liane)
        .then(setLiane)
        .finally(() => setLoading(false));
      return;
    }
    setLiane(route.params.liane);
  }, [route.params, services.community]);

  useEffect(() => {
    if (liane && liane.id) {
      services.realTimeHub
        .connectToLianeChat(liane.id, onReceiveLatestMessages, appendMessage)
        .then(conv => {
          setChat(conv);
        })
        .catch(e => {
          AppLogger.error("CHAT", "Unable to connect to chat", e);
        });
    }
    return () => {
      if (liane && liane.id) {
        services.realTimeHub.disconnectFromChat().catch(e => {
          AppLogger.warn("CHAT", "Error while disconnecting from chat", e);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liane, services.realTimeHub]);

  if (loading) {
    return <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />;
  }

  return (
    <View style={[styles.mainContainer, { paddingBottom: insets.bottom }]}>
      <Row style={{ backgroundColor: AppColors.white, justifyContent: "space-between", alignItems: "center", padding: 16 }} spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon={"arrow-ios-back-outline"} color={AppColors.primaryColor} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 16, lineHeight: 27, color: AppColors.primaryColor }}>{name}</AppText>
        <AppButton
          onPress={() => liane && navigation.navigate("CommunitiesDetails", { liane: liane })}
          icon={"edit-2-outline"}
          color={AppColors.white}
        />
      </Row>
      {chat && liane && (
        <FlatList
          data={messages}
          style={{ flex: 1, paddingHorizontal: 16 }}
          keyExtractor={m => m.id!}
          renderItem={({ item, index }) => (
            <MessageBubble
              coLiane={liane}
              message={item}
              isSender={item.createdBy === user?.id}
              previousSender={index < messages.length - 1 ? messages[index + 1].createdBy : undefined}
            />
          )}
          onEndReachedThreshold={0.2}
          onEndReached={fetchNextPage}
          inverted
        />
      )}
      {!chat && liane && <ActivityIndicator style={[AppStyles.center, AppStyles.fullHeight]} color={AppColors.primaryColor} size="large" />}
      <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "height" : "padding"}
        style={{ paddingBottom: 8, paddingHorizontal: 8, backgroundColor: AppColorPalettes.gray[150] }}>
        <Row spacing={8} style={{ alignItems: "center" }}>
          <AppButton color={AppColors.primaryColor} onPress={() => setTripModalVisible(true)} icon="plus-outline" />
          <AppExpandingTextInput
            multiline={true}
            placeholder="Message"
            backgroundStyle={{
              backgroundColor: AppColors.white,
              borderRadius: 16,
              paddingLeft: 8,
              paddingRight: 2,
              minHeight: 52
            }}
            trailing={
              <AppButton
                style={{ borderRadius: 16 }}
                onPress={sendMessage}
                disabled={inputValue.length === 0}
                icon="paper-plane-outline"
                loading={isSending}
                color={AppColors.secondaryColor}
              />
            }
            onChangeText={setInputValue}
            value={inputValue}
            clearButtonMode="always"
          />
        </Row>
        {!!me && (
          <LaunchTripModal
            lianeRequest={me!.lianeRequest}
            tripModalVisible={tripModalVisible}
            setTripModalVisible={setTripModalVisible}
            launchTrip={launchTrip}
            launching={launching}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.grayBackground,
    justifyContent: "flex-start",
    flex: 1
  },
  chatContainer: {
    flex: 1
  }
});
