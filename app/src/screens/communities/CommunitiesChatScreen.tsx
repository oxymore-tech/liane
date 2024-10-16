import {
  addSeconds,
  Chat,
  CoLiane,
  DayOfWeekFlag,
  Liane,
  LianeMessage,
  PaginatedResponse,
  RallyingPoint,
  ResolvedLianeRequest,
  TimeOnly,
  TimeOnlyUtils
} from "@liane/common";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { AppColorPalettes, AppColors, ContextualColors, defaultTextColor } from "@/theme/colors";
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
import { AppLogger } from "@/api/logger";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppStorage } from "@/api/storage.ts";
import { TimeWheelPicker } from "@/components/TimeWheelPicker.tsx";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker.tsx";
import { MessageBubble } from "@/screens/communities/MessageBubble.tsx";
import { useSubscription } from "@/util/hooks/subscription.ts";
import { AppLocalization } from "@/api/i18n.ts";
import { DisplayWayPoints } from "@/components/communities/displayWaypointsView.tsx";
import { weekDays } from "@/util/hooks/days.ts";
import { getLianeStatusStyle } from "@/components/trip/LianeStatusView.tsx";
import { LianeQueryKey } from "@/screens/user/MyTripsScreen.tsx";
import { useQueryClient } from "react-query";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView.tsx";
import { UserPicture } from "@/components/UserPicture.tsx";

export const CommunitiesChatScreen = () => {
  const { navigation, route } = useAppNavigation<"CommunitiesChat">();
  const { user, services } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<LianeMessage[]>([]);
  const [paginationCursor, setPaginationCursor] = useState<string>();
  const [chat, setChat] = useState<Chat<"Liane">>();
  const [inputValue, setInputValue] = useState<string>("");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [liane, setLiane] = useState<CoLiane | undefined>(undefined);
  const [trips, setTrips] = useState<Liane[]>([]);
  const [showTripDetail, setShowTripDetail] = useState(false);

  const [currentTripIndex, setCurrentTripIndex] = useState<number>(0);
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const currentTrip = trips[currentTripIndex];

  useSubscription<CoLiane>(
    services.realTimeHub.lianeUpdates,
    updatedLiane => {
      if (updatedLiane.id === liane?.id) {
        setLiane(updatedLiane);
        fetchTrip(updatedLiane.id!).then();
      }
    },
    [liane?.id]
  );

  useSubscription<Liane>(
    services.realTimeHub.tripUpdates,
    updatedTrip => {
      setTrips(prevTrips => {
        const tripIndex = prevTrips.findIndex(trip => trip.id === updatedTrip.id);

        if (tripIndex !== -1) {
          const updatedTrips = [...prevTrips];
          updatedTrips[tripIndex] = updatedTrip;
          return updatedTrips;
        }

        return prevTrips;
      });
    },
    [trips.map(trip => trip.id)]
  );

  const fetchTrip = useCallback(
    async (id: string) => {
      try {
        const tripsTemp = await services.community.getIncomingTrips(id);
        setTrips(tripsTemp);
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Au moment de récupérer les trajets prévus, une erreur c'est produite", e);
      }
    },
    [services.community]
  );

  const fetchLiane = useCallback(
    async (id: string) => {
      try {
        const l: CoLiane = await services.community.get(id);
        setLiane(l);
        return l;
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Au moment de récupérer la liane, une erreur c'est produite", e);
      }
    },
    [services.community]
  );

  const getDayOfWeek = (l: Liane): string => {
    const departureDate = new Date(l.departureTime);
    const dayIndex = departureDate.getUTCDay() - 1;
    return `${weekDays[dayIndex < 0 ? 6 : dayIndex]} ${departureDate.getDate()}`;
  };

  const goToNextLiane = () => {
    const newTripIndex = (currentTripIndex + 1) % trips.length;
    setCurrentTripIndex(newTripIndex);
  };

  const goToPreviousLiane = () => {
    const newTripIndex = currentTripIndex - 1;
    setCurrentTripIndex(newTripIndex < 0 ? trips.length - 1 : newTripIndex);
  };

  const sendMessage = async (value: string) => {
    let lianeTemp = liane;
    setIsSending(true);

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
  const name = me && me.lianeRequest ? me?.lianeRequest.name : `${me?.lianeRequest.wayPoints[0].label}  ➔ ${me?.lianeRequest.wayPoints[1].label}`;

  const launchTrip = async (time: [Date, Date | undefined], from: string | undefined, to: string | undefined) => {
    setTripModalVisible(false);
    const geolocationLevel = await AppStorage.getSetting("geolocation");

    await services.liane.post({
      liane: liane!.id!,
      arriveAt: time[0].toISOString(),
      returnAt: time[1]?.toISOString(),
      from: from ?? me!.lianeRequest.wayPoints[0].id!,
      to: to ?? me!.lianeRequest.wayPoints[1].id!,
      availableSeats: me!.lianeRequest.canDrive ? 1 : -1,
      geolocationLevel: geolocationLevel || "None",
      recurrence: undefined
    });
    await queryClient.invalidateQueries(LianeQueryKey);
  };

  useEffect(() => {
    setLiane(undefined);
    setError(undefined);

    if (route.params.liane) {
      // Lorsqu'on arrive directement par une liane
      setLiane(route.params.liane);
      route.params.liane.id && fetchTrip(route.params.liane.id).then();
    }
    if (route.params.lianeId) {
      // Lorsqu'on arrive par une notification
      fetchLiane(route.params.lianeId).then();
      fetchTrip(route.params.lianeId).then();
    }
  }, [fetchLiane, fetchTrip, route.params, services.community]);

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

  const quitTrip = async () => {
    if (currentTrip && currentTrip.id) {
      try {
        const result = await services.liane.leave(currentTrip.id);
        AppLogger.debug("COMMUNITIES", "A quitter une liane avec succès", result);
        liane?.id && (await fetchTrip(liane?.id));
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la demande pour quitter une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest ID lors de la demande pour quitter une liane", liane);
    }
  };

  const tripActions = () => {
    if (currentTrip) {
      if (currentTrip.state === "NotStarted") {
        return currentTrip.members.some(member => member.user.id === user?.id) ? (
          <Pressable
            onPress={quitTrip}
            style={{
              backgroundColor: AppColors.white,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: AppColorPalettes.gray[400]
            }}>
            <AppText
              style={{
                fontSize: 17,
                fontWeight: "normal",
                flexShrink: 1,
                lineHeight: 27,
                color: AppColors.black
              }}>
              {"Quitter"}
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("LianeTripDetail", { trip: currentTrip })}
            style={{ backgroundColor: AppColors.primaryColor, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 }}>
            <AppText
              style={{
                fontSize: 17,
                fontWeight: "normal",
                flexShrink: 1,
                lineHeight: 27,
                color: AppColors.white
              }}>
              {"Rejoindre"}
            </AppText>
          </Pressable>
        );
      } else {
        return (
          <AppText
            style={[
              {
                paddingHorizontal: 16,
                paddingVertical: 6,
                color: AppColorPalettes.gray[400],
                fontWeight: "bold",
                fontStyle: "italic",
                borderWidth: 1,
                borderRadius: 20,
                borderColor: AppColorPalettes.gray[400]
              }
            ]}>
            <AppText
              style={{
                fontSize: 17,
                fontWeight: "normal",
                flexShrink: 1,
                lineHeight: 27
              }}>
              {getLianeStatusStyle(currentTrip.state)[0]}
            </AppText>
          </AppText>
        );
      }
    }
    return null;
  };

  return (
    <View style={{ backgroundColor: AppColors.lightGrayBackground, justifyContent: "flex-end", flex: 1 }}>
      <View style={{ marginTop: insets.top + 52 }}>
        {trips.length > 0 && (
          <View style={{ width: "100%" }}>
            <View
              style={[
                {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  marginTop: 12
                },
                showTripDetail ? null : { paddingBottom: 12 }
              ]}>
              <AppText
                style={{
                  fontSize: 18,
                  fontWeight: "normal",
                  flexShrink: 1,
                  lineHeight: 27,
                  color: AppColors.black
                }}>
                {`${trips.length} trajets prévu${trips.length > 1 ? "s" : ""}`}
              </AppText>
              <View
                style={{
                  flexDirection: "row"
                }}>
                <Pressable onPress={goToPreviousLiane} style={{ paddingHorizontal: 10 }}>
                  <AppIcon name={"arrow2-left"} />
                </Pressable>
                <Pressable
                  onPress={() => setShowTripDetail(!showTripDetail)}
                  style={[
                    { minWidth: 110, alignItems: "center" },
                    showTripDetail
                      ? { backgroundColor: AppColors.white, borderTopLeftRadius: 15, borderTopRightRadius: 15, paddingBottom: 8 }
                      : { backgroundColor: AppColors.grayBackground, borderRadius: 15, borderWidth: 2, borderColor: AppColors.darkGray }
                  ]}>
                  <AppText
                    style={{
                      fontSize: 18,
                      fontWeight: "normal",
                      flexShrink: 1,
                      lineHeight: 27,
                      color: AppColors.black
                    }}>
                    {currentTrip && getDayOfWeek(currentTrip)}
                  </AppText>
                </Pressable>
                <Pressable onPress={goToNextLiane} style={{ paddingHorizontal: 10 }}>
                  <AppIcon name={"arrow-right"} />
                </Pressable>
              </View>
            </View>
            {showTripDetail ? (
              <View style={{ backgroundColor: AppColors.white, flexDirection: "column" }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingTop: 10,
                    alignItems: "center"
                  }}>
                  {liane && (
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        marginLeft: 25,
                        paddingTop: 8
                      }}>
                      {currentTrip.members.map(member => (
                        <UserPicture key={member.user.id} size={24} url={member.user.pictureUrl} id={member.user.id} style={{ marginLeft: -10 }} />
                      ))}
                    </View>
                  )}

                  {tripActions()}
                </View>
                <View
                  style={{
                    paddingBottom: 10
                  }}>
                  {currentTrip?.wayPoints && <DisplayWayPoints wayPoints={currentTrip.wayPoints} />}
                </View>
              </View>
            ) : null}

            <View>{chat?.currentGroup && <DebugIdView object={chat?.currentGroup} />}</View>
          </View>
        )}
      </View>
      {chat && liane && (
        <FlatList
          style={{ paddingHorizontal: 16 }}
          data={messages}
          keyExtractor={m => m.id!}
          renderItem={({ item, index }) => (
            <MessageBubble
              coLiane={liane}
              message={item}
              isSender={item.createdBy === user?.id}
              previousSender={index < messages.length - 1 ? messages[index + 1].createdBy : undefined}
            />
          )}
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
          paddingTop: 16 + insets.top
        }}>
        <Row spacing={8} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Row style={{ flex: 1 }}>
            <AppPressableIcon onPress={() => navigation.goBack()} name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} />

            {!!liane && (
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  flex: 1
                }}>
                <AppText
                  style={{
                    fontSize: 22,
                    fontWeight: "bold",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: AppColors.primaryColor
                  }}>
                  {name}
                </AppText>
              </View>
            )}
          </Row>
          <Row>
            {liane && (
              <Pressable onPress={() => navigation.navigate("CommunitiesDetails", { liane: liane })}>
                <AppIcon name={"edit-2-outline"} />
              </Pressable>
            )}
          </Row>
        </Row>
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
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const getNextAvailableDay = (weekdays: string, start: TimeOnly): DayOfWeekFlag => {
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
  if (weekdays[currentDay] === "1" && (currentHour < start.hour || (currentHour === start.hour && currentMinute < (start.minute ?? 0)))) {
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
  lianeRequest
}: {
  lianeRequest: ResolvedLianeRequest;
  tripModalVisible: boolean;
  setTripModalVisible: (v: boolean) => void;
  launchTrip: (d: [Date, Date | undefined], from: string | undefined, to: string | undefined) => void;
}) => {
  const [selectedTime, setSelectedTime] = useState<[Date, Date | undefined]>([new Date(), undefined]);
  const [selectedDay, setSelectedDay] = useState<DayOfWeekFlag>(getNextAvailableDay(lianeRequest.weekDays, lianeRequest.arriveBefore));
  const [from, setFrom] = useState<RallyingPoint>(lianeRequest.wayPoints[0]);
  const [to, setTo] = useState<RallyingPoint>(lianeRequest.wayPoints[lianeRequest.wayPoints.length - 1]);
  const [returnSelected, setReturnSelected] = useState<boolean>(true);

  const startDate = useMemo(() => {
    const d = new Date();
    if (!lianeRequest) {
      return d;
    }
    const c = lianeRequest.arriveBefore;
    d.setHours(c.hour, c.minute);
    return d;
  }, [lianeRequest]);

  const endDate = useMemo(() => {
    const d = new Date();
    if (!lianeRequest) {
      return d;
    }
    const c = lianeRequest.returnAfter;
    d.setHours(c.hour, c.minute);
    return d;
  }, [lianeRequest]);

  const tripDateTime = useMemo(() => {
    const todayIndex = (selectedTime[0].getDay() + 6) % 7;
    let selectedDays = selectedDay
      .split("")
      .map((day, index) => (day === "1" ? index : -1))
      .filter(index => index !== -1);
    let firstDay = (selectedDays[0] - todayIndex + 7) % 7;
    if (firstDay === 0 && selectedTime[0].valueOf() < new Date().valueOf()) {
      firstDay = 7;
    }
    let returnDay = selectedDays.length > 1 ? (selectedDays[1] - todayIndex + 7) % 7 : firstDay;

    let returnTime = returnSelected
      ? selectedTime[1]
        ? addSeconds(selectedTime[1], returnDay * 3600 * 24)
        : addSeconds(startDate, returnDay * 3600 * 24)
      : undefined;

    return { depart: addSeconds(selectedTime[0], firstDay * 3600 * 24), return: returnTime };
  }, [returnSelected, selectedDay, selectedTime, startDate]);
  const launch = () => {
    launchTrip([tripDateTime.depart, tripDateTime.return], from.id, to.id);
  };

  const switchDestination = () => {
    const ToTemp = to;
    setTo(from);
    setFrom(ToTemp);
  };

  return (
    <SimpleModal visible={tripModalVisible} setVisible={setTripModalVisible} backgroundColor={AppColors.white} hideClose>
      <Column>
        <AppText style={{ fontSize: 22, fontWeight: "bold", lineHeight: 24 }}>Lancer un trajet</AppText>
        <Column spacing={8}>
          <View>
            <Row spacing={6} style={{ flexDirection: "row", justifyContent: "flex-start" }}>
              <AppText style={[{ marginTop: 5 }, styles.modalText]}>{from.city}</AppText>
              <AppPressableIcon name={"flip-2-outline"} onPress={switchDestination} />
              <AppText style={[{ marginTop: 5 }, styles.modalText]}>{to.city}</AppText>
            </Row>
          </View>
          <View>
            <DayOfTheWeekPicker selectedDays={selectedDay} onChangeDays={setSelectedDay} enabledDays={"1111111"} dualOptionMode={true} />
          </View>
          {selectedDay !== "0000000" && tripDateTime?.depart ? (
            <View style={{ flexDirection: "row", justifyContent: "flex-start" }}>
              <View
                style={{
                  width: "auto",
                  marginTop: 5,
                  backgroundColor: AppColors.lightGrayBackground,
                  paddingHorizontal: 8,
                  borderRadius: 20,
                  paddingVertical: 4
                }}>
                <AppText style={[styles.modalText]}>{AppLocalization.formatDateOnly(tripDateTime.depart)}</AppText>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start" }}>
            <AppText style={[{ marginLeft: 5 }, styles.modalText]}>Aller-retour ?</AppText>

            <Pressable
              style={[styles.buttonChoice, returnSelected ? styles.choiceNotSelected : styles.choiceSelected]}
              onPress={() => {
                setReturnSelected(false);
              }}>
              <AppText
                style={{
                  color: returnSelected ? AppColors.black : defaultTextColor(AppColors.primaryColor)
                }}>
                Non
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.buttonChoice, returnSelected ? styles.choiceSelected : styles.choiceNotSelected]}
              onPress={() => {
                setReturnSelected(true);
              }}>
              <AppText
                style={{
                  color: returnSelected ? defaultTextColor(AppColors.primaryColor) : AppColors.black
                }}>
                Oui
              </AppText>
            </Pressable>
          </View>
          <Row spacing={8} style={{ justifyContent: "space-evenly" }}>
            <Column>
              <AppText style={styles.modalText}>Arrivée à :</AppText>
              <Center>
                <TimeWheelPicker
                  date={TimeOnlyUtils.fromDate(startDate)}
                  minuteStep={5}
                  onChange={d => setSelectedTime(v => [TimeOnlyUtils.toDate(d, startDate), v[1]])}
                />
              </Center>
            </Column>
            {returnSelected && (
              <Column>
                <AppText style={styles.modalText}>Retour à :</AppText>
                <Center>
                  <TimeWheelPicker
                    date={TimeOnlyUtils.fromDate(endDate)}
                    minuteStep={5}
                    onChange={d => setSelectedTime(v => [v[0], TimeOnlyUtils.toDate(d, endDate)])}
                  />
                </Center>
              </Column>
            )}
          </Row>
          <Row style={{ justifyContent: "center", alignItems: "center" }}>
            <Pressable
              style={{
                flexDirection: "row",
                paddingVertical: 10,
                marginHorizontal: 20,
                width: "100%",
                borderRadius: 25,
                backgroundColor: AppColors.primaryColor,
                justifyContent: "center",
                alignItems: "center"
              }}
              onPress={launch}>
              <AppText
                style={{
                  color: defaultTextColor(AppColors.primaryColor),
                  fontSize: 16,
                  fontWeight: "bold",
                  lineHeight: 24
                }}>
                Valider
              </AppText>
            </Pressable>
          </Row>
        </Column>
      </Column>
    </SimpleModal>
  );
};

const styles = StyleSheet.create({
  modalText: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24
  },
  buttonChoice: {
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 24,
    flexDirection: "row",
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1
  },
  choiceSelected: {
    borderColor: AppColors.primaryColor,
    backgroundColor: AppColors.primaryColor
  },
  choiceNotSelected: {
    borderColor: AppColors.lightGrayBackground
  }
});
