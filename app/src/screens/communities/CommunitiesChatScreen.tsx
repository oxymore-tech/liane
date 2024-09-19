import {
  addSeconds,
  Chat,
  CoLiane,
  CoLianeRequest,
  CoMatch,
  DayOfWeekFlag,
  LianeMessage,
  MatchGroup,
  MatchSingle,
  PaginatedResponse,
  RallyingPoint,
  ResolvedLianeRequest,
  TimeOnlyUtils,
  User
} from "@liane/common";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColors, ContextualColors } from "@/theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppContext } from "@/components/context/ContextProvider";
import { AppExpandingTextInput } from "@/components/base/AppExpandingTextInput";
import { useAppNavigation } from "@/components/context/routing";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { DebugIdView } from "@/components/base/DebugIdView";
import { AppStyles } from "@/theme/styles";
import { extractDays } from "@/util/hooks/days";
import { AppLogger } from "@/api/logger";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppStorage } from "@/api/storage.ts";
import { TimeWheelPicker } from "@/components/TimeWheelPicker.tsx";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker.tsx";
import { MessageBubble } from "@/screens/communities/MessageBubble.tsx";

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [chat, setChat] = useState<Chat<"Liane">>();
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [group, setGroup] = useState<CoMatch | undefined>(undefined);
  const [liane, setLiane] = useState<CoLiane | undefined>(undefined);
  const [request, setRequest] = useState<CoLianeRequest | ResolvedLianeRequest | undefined>(undefined);
  const [tripModalVisible, setTripModalVisible] = useState(false);

  const members = useMemo(
    () =>
      chat?.currentGroup?.members?.reduce((acc, b) => {
        acc[b.user.id!] = b.user;
        return acc;
      }, {} as { [k: string]: User }),
    [chat?.currentGroup?.members]
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
          await services.community.sendMessage(lianeTemp.id, {
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
          await chat?.send({
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

  const me = useMemo(() => liane?.members.find(m => m.user.id === user!.id), [liane?.members, user]);

  const name = !liane?.name && me ? `${me.lianeRequest.wayPoints[0].label}  ➔ ${me.lianeRequest.wayPoints[1].label}` : liane?.name;

  const startDate = useMemo(() => {
    const d = new Date();
    if (!me) {
      return d;
    }
    const c = me.lianeRequest.arriveBefore;
    d.setHours(c.hour, c.minute);
    return d;
  }, [me]);
  const launchTrip = async (time: [Date, Date | undefined], from: string | undefined, to: string | undefined) => {
    setTripModalVisible(false);
    const geolocationLevel = await AppStorage.getSetting("geolocation");

    const created = await services.liane.post({
      departureTime: time[0].toISOString(),
      returnTime: time[1]?.toISOString(),
      from: from ?? me!.lianeRequest.wayPoints[0].id!,
      to: to ?? me!.lianeRequest.wayPoints[1].id!,
      availableSeats: me!.lianeRequest.canDrive ? 1 : -1,
      geolocationLevel: geolocationLevel || "None",
      recurrence: undefined
    });
    const goMessage = await services.community.sendMessage(liane!.id!, {
      type: "Trip",
      value: created.id!
    });
    appendMessage(goMessage);
    if (created.return) {
      const returnMessage = await services.community.sendMessage(liane!.id!, {
        type: "Trip",
        value: created.return
      });
      appendMessage(returnMessage);
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
          setError(e);
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

  return (
    <View style={{ backgroundColor: AppColors.lightGrayBackground, justifyContent: "flex-end", flex: 1 }}>
      {chat && liane && (
        <FlatList
          style={{ paddingHorizontal: 16, marginTop: insets.top + 72 }}
          data={messages}
          keyExtractor={m => m.id!}
          renderItem={({ item, index }) =>
            members && !!members[item.createdBy!] ? (
              <MessageBubble
                coLiane={liane}
                message={item}
                sender={members[item.createdBy!]}
                isSender={item.createdBy === user?.id}
                previousSender={index < messages.length - 1 ? messages[index + 1].createdBy : undefined}
              />
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

            {!!liane && (
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
                  {name}
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
                backgroundStyle={{ borderRadius: 24, backgroundColor: AppColors.primaryColor, maxHeight: 58 }}
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

        {!!me && (
          <LaunchTripModal
            lianeRequest={me!.lianeRequest}
            tripModalVisible={tripModalVisible}
            setTripModalVisible={setTripModalVisible}
            launchTrip={launchTrip}
            startDate={startDate}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const getNextAvailableDay = (weekdays: string, start: Date): DayOfWeekFlag => {
  if (weekdays.length !== 7) {
    throw new Error("La chaîne weekdays doit contenir 7 caractères.");
  }
  if (!/^[01]{7}$/.test(weekdays)) {
    throw new Error("La chaîne weekdays doit contenir uniquement des 0 et des 1.");
  }

  const now = new Date();
  const currentDay = (now.getDay() + 6) % 7;
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  function findNextDay(startIndex: number): number {
    for (let i = 0; i < 7; i++) {
      const dayIndex = (startIndex + i) % 7;
      if (weekdays[dayIndex] === "1") {
        return dayIndex;
      }
    }
    return -1;
  }

  let nextDayIndex = findNextDay(currentDay);

  // If the current day is available but the current time is before the start time
  if (weekdays[currentDay] === "1" && (currentHour < start.getHours() || (currentHour === start.getHours() && currentMinute < start.getMinutes()))) {
    nextDayIndex = currentDay;
  }

  if (nextDayIndex === -1) {
    throw new Error("Aucun jour disponible trouvé.");
  }

  const result = "0000000".split("");
  result[nextDayIndex] = "1";

  return result.join("") as DayOfWeekFlag;
};

const LaunchTripModal = ({
  tripModalVisible,
  setTripModalVisible,
  launchTrip,
  lianeRequest,
  startDate
}: {
  startDate: Date;
  lianeRequest: ResolvedLianeRequest;
  tripModalVisible: boolean;
  setTripModalVisible: (v: boolean) => void;
  launchTrip: (d: [Date, Date | undefined], from: string | undefined, to: string | undefined) => void;
}) => {
  const [launchTripStep, setLaunchTripStep] = useState(0);
  const [selectedTime, setSelectedTime] = useState<[Date, Date | undefined]>([new Date(), undefined]);
  const [selectedDay, setSelectedDay] = useState<DayOfWeekFlag>(getNextAvailableDay(lianeRequest.weekDays, startDate));
  const [from, setFrom] = useState<RallyingPoint>(lianeRequest.wayPoints[0]);
  const [to, setTo] = useState<RallyingPoint>(lianeRequest.wayPoints[lianeRequest.wayPoints.length - 1]);

  const launch = () => {
    const todayIndex = (selectedTime[0].getDay() + 6) % 7;

    let selectedDays = selectedDay
      .split("")
      .map((day, index) => (day === "1" ? index : -1))
      .filter(index => index !== -1);

    let firstDay = (selectedDays[0] - todayIndex + 7) % 7;
    let returnDay = selectedDays.length > 1 ? (selectedDays[1] - todayIndex + 7) % 7 : firstDay;

    if (firstDay === 0 && selectedTime[0].valueOf() < new Date().valueOf()) {
      firstDay = 7;
    }
    const departureTime = addSeconds(selectedTime[0], firstDay * 3600 * 24);
    const returnTime =
      launchTripStep === 2
        ? selectedTime[1]
          ? addSeconds(selectedTime[1], returnDay * 3600 * 24)
          : addSeconds(startDate, returnDay * 3600 * 24)
        : undefined;

    launchTrip([departureTime, returnTime], from.id, to.id);
  };

  const switchDestination = () => {
    const ToTemp = to;
    setTo(from);
    setFrom(ToTemp);
  };

  return (
    <SimpleModal visible={tripModalVisible} setVisible={setTripModalVisible} backgroundColor={AppColors.white} hideClose>
      <Column spacing={8}>
        <AppText style={styles.modalText}>Proposer le trajet...</AppText>

        {launchTripStep === 0 && (
          <>
            <Pressable
              style={{ flexDirection: "row", marginHorizontal: 16, paddingVertical: 8 }}
              onPress={() => {
                setLaunchTripStep(1);
              }}>
              <AppIcon name={"car"} />
              <AppText style={[{ marginLeft: 5 }, styles.modalText]}>Aller-simple</AppText>
            </Pressable>
            <Pressable style={{ flexDirection: "row", marginHorizontal: 16, paddingVertical: 8 }} onPress={() => setLaunchTripStep(2)}>
              <AppIcon name={"car"} />
              <AppText style={[{ marginLeft: 5 }, styles.modalText]}>Aller-retour</AppText>
            </Pressable>
          </>
        )}
        {launchTripStep === 1 && (
          <Column spacing={8}>
            <AppText style={styles.modalText}>Aller-simple</AppText>
            <View>
              <Row spacing={6}>
                <AppText style={[{ marginTop: 5 }, styles.modalText]}>{from.label}</AppText>
                <AppPressableIcon name={"flip-2-outline"} onPress={switchDestination} />
                <AppText style={[{ marginTop: 5 }, styles.modalText]}>{to.label}</AppText>
              </Row>
            </View>
            <View>
              <Row spacing={6}>
                <DayOfTheWeekPicker selectedDays={selectedDay} onChangeDays={setSelectedDay} enabledDays={"1111111"} singleOptionMode={true} />
              </Row>
            </View>
            <AppText style={styles.modalText}>Départ à :</AppText>
            <Center>
              <TimeWheelPicker
                date={TimeOnlyUtils.fromDate(startDate)}
                minuteStep={5}
                onChange={d => setSelectedTime([TimeOnlyUtils.toDate(d, startDate), undefined])}
              />
            </Center>
            <Row style={{ justifyContent: "flex-end" }}>
              <AppPressableIcon name={"checkmark-outline"} onPress={launch} />
            </Row>
          </Column>
        )}
        {launchTripStep === 2 && (
          <Column spacing={8}>
            <AppText style={styles.modalText}>Aller-retour</AppText>
            <View>
              <Row spacing={6}>
                <AppText style={[{ marginTop: 5 }, styles.modalText]}>{from.label}</AppText>
                <AppPressableIcon name={"flip-2-outline"} onPress={switchDestination} />
                <AppText style={[{ marginTop: 5 }, styles.modalText]}>{to.label}</AppText>
              </Row>
            </View>
            <View>
              <Row spacing={6}>
                <DayOfTheWeekPicker selectedDays={selectedDay} onChangeDays={setSelectedDay} enabledDays={"1111111"} dualOptionMode={true} />
              </Row>
            </View>
            <Row spacing={8} style={{ justifyContent: "space-evenly" }}>
              <Column>
                <AppText style={styles.modalText}>Départ à :</AppText>
                <Center>
                  <TimeWheelPicker
                    date={TimeOnlyUtils.fromDate(startDate)}
                    minuteStep={5}
                    onChange={d => setSelectedTime(v => [TimeOnlyUtils.toDate(d, startDate), v[1]])}
                  />
                </Center>
              </Column>
              <Column>
                <AppText style={styles.modalText}>Retour à :</AppText>
                <Center>
                  <TimeWheelPicker
                    date={TimeOnlyUtils.fromDate(startDate)}
                    minuteStep={5}
                    onChange={d => setSelectedTime(v => [v[0], TimeOnlyUtils.toDate(d, startDate)])}
                  />
                </Center>
              </Column>
            </Row>
            <Row style={{ justifyContent: "flex-end" }}>
              <AppPressableIcon name={"checkmark-outline"} onPress={launch} />
            </Row>
          </Column>
        )}
      </Column>
    </SimpleModal>
  );
};

const styles = StyleSheet.create({
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24
  }
});
