import { CoLiane, LianeMessage, RallyingPoint, Ref, Trip } from "@liane/common";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { useAppNavigation } from "@/components/context/routing";
import { AppLogger } from "@/api/logger";
import { useSubscription } from "@/util/hooks/subscription.ts";
import { useQuery, useQueryClient } from "react-query";
import { AppButton } from "@/components/base/AppButton";
import { LaunchTripModal } from "@/screens/communities/LaunchTripModal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MessageList } from "@/screens/communities/MessagesList.tsx";
import ChatInput from "@/screens/communities/ChaInput.tsx";
import { Wallpapers } from "@/components/base/Wallpapers.ts";
import { TripQueryKey, useLianeQuery } from "@/util/hooks/query.ts";

function appendDeduplicate(messages: LianeMessage[], newMessages: LianeMessage[]) {
  const ids = new Set(messages.map(m => m.id));
  const filteredMessages = newMessages.filter(m => !ids.has(m.id));
  return [...filteredMessages, ...messages].sort((a, b) => b.id!.localeCompare(a.id!));
}

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [isSending, setIsSending] = useState(false);

  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(true);

  const { data: liane } = useLianeQuery(route.params.liane);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!liane) {
        return;
      }

      if (!message) {
        return;
      }

      if (message.trim().length === 0) {
        return;
      }

      setIsSending(true);
      try {
        await services.realTimeHub.send(liane.id!, {
          type: "Text",
          value: message
        });
      } finally {
        setIsSending(false);
      }
    },
    [liane, services.realTimeHub]
  );

  const appendMessage = useCallback(
    async (lianeId: Ref<CoLiane>, m: LianeMessage) => {
      if (!liane) {
        return;
      }
      if (liane?.id !== lianeId) {
        return;
      }
      setMessages(v => appendDeduplicate(v, [m]));
      services.realTimeHub.markAsRead(liane?.id, new Date().toISOString()).then();
    },
    [liane, services.realTimeHub]
  );

  const trip = useQuery(TripQueryKey, async () => await services.community.getIncomingTrips());

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    () => {
      trip.refetch().then();
    },
    []
  );

  const fetchMessages = useCallback(async () => {
    if (!liane?.id) {
      return;
    }
    try {
      setFetchingMessages(true);
      const r = await services.community.getMessages(liane.id, { limit: 30, asc: false });
      setMessages(r.data);
      setPaginationCursor(r.next);
      services.realTimeHub.markAsRead(liane.id, new Date().toISOString()).then();
    } finally {
      setFetchingMessages(false);
    }
  }, [liane, services.community, services.realTimeHub]);

  useEffect(() => {
    fetchMessages().then();
  }, [fetchMessages]);

  const fetchNextPage = useCallback(async () => {
    if (paginationCursor && liane && liane.id) {
      const paginatedResult = await services.community.getMessages(liane.id, { cursor: paginationCursor, limit: 30 });
      setMessages(v => [...paginatedResult.data, ...v]);
      setPaginationCursor(paginatedResult.next);
    }
  }, [liane, paginationCursor, services.community]);

  const me = useMemo(() => liane?.members.find(m => m.user.id === user!.id), [liane?.members, user]);
  const name = me?.lianeRequest?.name ?? "";
  const [launching, setLaunching] = useState(false);

  const launchTrip = useCallback(
    async (arriveAt: Date, returnAt: Date | undefined, from: Ref<RallyingPoint>, to: Ref<RallyingPoint>, availableSeats: number) => {
      setLaunching(true);
      try {
        await services.trip.post({
          liane: liane!.id!,
          arriveAt: arriveAt.toISOString(),
          returnAt: returnAt?.toISOString(),
          from,
          to,
          availableSeats
        });
        await queryClient.invalidateQueries(TripQueryKey);
      } finally {
        setLaunching(false);
        setTripModalVisible(false);
      }
    },
    [liane, queryClient, services.trip]
  );

  useEffect(() => {
    services.realTimeHub
      .connectToLianeChat(appendMessage)
      .then()
      .catch(e => {
        AppLogger.error("CHAT", "Unable to connect to chat", e);
      });
    return () => {
      services.realTimeHub.disconnectFromChat().catch(e => {
        AppLogger.warn("CHAT", "Error while disconnecting from chat", e);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liane, services.realTimeHub]);

  return (
    <ImageBackground source={Wallpapers[0]} style={{ flex: 1, paddingBottom: insets.bottom }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "android" ? "height" : "padding"} enabled={Platform.OS !== "android"}>
        <Row style={[styles.header, { paddingTop: insets.top }]} spacing={16}>
          <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColorPalettes.gray[800]} />
          <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 24, lineHeight: 27, color: AppColorPalettes.gray[800] }}>{name}</AppText>
          <AppButton
            onPress={() => liane && navigation.navigate("CommunitiesDetails", { liane: liane })}
            icon="edit"
            color={AppColorPalettes.gray[800]}
          />
        </Row>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <MessageList
            liane={liane}
            user={user}
            messages={messages}
            fetchMessages={fetchMessages}
            fetchNextPage={fetchNextPage}
            loading={fetchingMessages}
            incomingTrips={trip?.data}
          />
        </GestureHandlerRootView>
        <Row spacing={8} style={{ alignItems: "center" }}>
          <AppButton color={AppColors.primaryColor} onPress={() => setTripModalVisible(true)} icon="plus" />
          <ChatInput onSend={sendMessage} isSending={isSending} />
        </Row>
      </KeyboardAvoidingView>
      {!!me && (
        <LaunchTripModal
          lianeRequest={me!.lianeRequest}
          tripModalVisible={tripModalVisible}
          setTripModalVisible={setTripModalVisible}
          launchTrip={launchTrip}
          launching={launching}
        />
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.4)"
  }
});
