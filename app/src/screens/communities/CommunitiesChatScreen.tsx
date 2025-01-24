import { CoLiane, LianeMessage, RallyingPoint, Ref, Trip } from "@liane/common";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { useAppNavigation } from "@/components/context/routing";
import { AppLogger } from "@/api/logger";
import { useSubscription } from "@/util/hooks/subscription.ts";
import { TripQueryKey } from "@/screens/user/TripScheduleScreen";
import { useQuery, useQueryClient } from "react-query";
import { AppButton } from "@/components/base/AppButton";
import { LaunchTripModal } from "@/screens/communities/LaunchTripModal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MessageList } from "@/screens/communities/MessagesList.tsx";
import ChatInput from "@/screens/communities/ChaInput.tsx";

const Wallpapers = [require("../../../assets/images/wallpaper1.jpg"), require("../../../assets/images/wallpaper2.jpg")];

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [inputValue, setInputValue] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [liane, setLiane] = useState<CoLiane | undefined>(typeof route.params.liane === "string" ? undefined : route.params.liane);

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
    if (!liane) {
      return;
    }

    if (!inputValue) {
      return;
    }

    if (inputValue.trim().length === 0) {
      return;
    }

    setIsSending(true);
    try {
      await services.realTimeHub.send(liane.id!, {
        type: "Text",
        value: inputValue
      });
      setInputValue("");
    } finally {
      setIsSending(false);
    }
  }, [inputValue, liane, services.realTimeHub]);

  const appendMessage = async (lianeId: Ref<CoLiane>, m: LianeMessage) => {
    if (!liane) {
      return;
    }
    if (liane?.id !== lianeId) {
      return;
    }
    if (messages.find(msg => msg.id === m.id)) {
      return;
    }
    setMessages(oldList => [m, ...oldList]);
    services.realTimeHub.markAsRead(liane?.id, new Date().toISOString()).then();
  };

  const trip = useQuery(TripQueryKey, async () => await services.community.getIncomingTrips());

  useSubscription<Trip>(
    services.realTimeHub.tripUpdates,
    () => {
      trip.refetch().then();
    },
    []
  );

  const fetchMessages = useCallback(async () => {
    if (!liane) {
      return;
    }
    try {
      setLoading(true);
      const r = await services.community.getMessages(liane.id!, { limit: 15, asc: false });
      setMessages(r.data);
      setPaginationCursor(r.next);
      services.realTimeHub.markAsRead(liane.id!, new Date().toISOString()).then();
    } finally {
      setLoading(false);
    }
  }, [liane, services.community, services.realTimeHub]);

  useEffect(() => {
    fetchMessages().then();
  }, [fetchMessages]);

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
    <View style={[styles.mainContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Row style={styles.header} spacing={16}>
        <AppButton onPress={() => navigation.goBack()} icon="arrow-left" color={AppColorPalettes.gray[800]} />
        <AppText style={{ paddingLeft: 5, fontWeight: "bold", fontSize: 24, lineHeight: 27, color: AppColorPalettes.gray[100] }}>{name}</AppText>
        <AppButton
          onPress={() => liane && navigation.navigate("CommunitiesDetails", { liane: liane })}
          icon="edit"
          color={AppColorPalettes.gray[800]}
        />
      </Row>
      <ImageBackground source={Wallpapers[0]} style={{ flex: 1 }}>
        <GestureHandlerRootView>
          <MessageList
            liane={liane}
            user={user}
            messages={messages}
            fetchMessages={fetchMessages}
            fetchNextPage={fetchNextPage}
            loading={loading}
            incomingTrips={trip?.data}
          />
        </GestureHandlerRootView>
        <KeyboardAvoidingView behavior={Platform.OS === "android" ? "height" : "padding"} style={{ paddingBottom: 8, paddingHorizontal: 8 }}>
          <Row spacing={8} style={{ alignItems: "center" }}>
            <AppButton color={AppColors.primaryColor} onPress={() => setTripModalVisible(true)} icon="plus" />
            <ChatInput onSend={sendMessage} isSending={isSending} />
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
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderColor: AppColorPalettes.gray[100],
    borderBottomWidth: 1
  },
  mainContainer: {
    backgroundColor: AppColorPalettes.gray[800],
    justifyContent: "flex-start",
    flex: 1
  }
});
