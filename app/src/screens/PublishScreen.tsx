import React, { useCallback, useState } from "react";
import { Alert, SafeAreaView, TouchableOpacity, View } from "react-native";
import RNDateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { AppText } from "@/components/base/AppText";
import { getRallyingPoints, sendTripIntent } from "@/api/client";
import { RallyingPoint, TripIntent } from "@/api";
import { getLastKnownLocation } from "@/api/location";
import { RootNavigation } from "@/api/navigation";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppButton } from "@/components/base/AppButton";
import { AppSwitch } from "@/components/base/AppSwitch";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";

const PublishScreen = () => {

  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const [showReturnTime, setShowReturnTime] = useState(false);
  const [showGoTime, setShowGoTime] = useState(false);

  const [goTime, setGoTime] = useState<Date | undefined>(new Date());
  const [returnTime, setReturnTime] = useState<Date>();

  const onChangeGoTime = (event:DateTimePickerEvent, selectedTime?:Date) => {
    setShowGoTime(false);
    setGoTime(selectedTime);
  };

  const onChangeReturnTime = (event:DateTimePickerEvent, selectedTime?:Date) => {
    setShowReturnTime(false);
    setReturnTime(selectedTime);
  };

  const [filteredStartPoints, setFilteredStartPoints] = useState<RallyingPoint[]>([]);
  const [filteredEndPoints, setFilteredEndPoints] = useState<RallyingPoint[]>([]);

  const [startPoint, setStartPoint] = useState<RallyingPoint | null>(null);
  const [shownStartPoint, setShownStartPoint] = useState("");

  const [endPoint, setEndPoint] = useState<RallyingPoint | null>(null);
  const [shownEndPoint, setShownEndPoint] = useState("");

  const findStartPoint = useCallback(async (query:string) => {
    setShownStartPoint(query);
    setStartPoint(null);

    if (query) {
      const regex = new RegExp(`${query.trim()}`, "i");
      const location = await getLastKnownLocation();

      const rallyingPoints = await getRallyingPoints(query, location);
      const f = rallyingPoints.filter((P) => P.label.search(regex) >= 0);
      setFilteredStartPoints(f);

    } else {
      setFilteredStartPoints([]);
    }
  }, []);

  const findEndPoint = useCallback(async (query:string) => {
    setShownEndPoint(query);
    setEndPoint(null);

    if (query) {
      const regex = new RegExp(`${query.trim()}`, "i");
      const location = await getLastKnownLocation();

      const rallyingPoints = await getRallyingPoints(query, location);
      const f = rallyingPoints.filter((P) => P.label.search(regex) >= 0);
      setFilteredStartPoints(f);

    } else {
      setFilteredStartPoints([]);
    }
  }, []);

  const onPublicationPressed = async () => {
    let isValid = true;
    let message = "";

    if (startPoint == null || endPoint == null) {
      message += "Point de départ et/ou d'arrivé invalides\n";
      isValid = false;
    }
    if (isRoundTrip && goTime && returnTime && goTime.getTime() >= returnTime!.getTime()) {
      message += "Horaires invalides\n";
      isValid = false;
    }

    if (!isValid) {
      Alert.alert(
        "Trajet invalide",
        message,
        [
          {
            text: "OK"
          }
        ],
        { cancelable: true }
      );
    }

    if (startPoint && endPoint) {
      const tripIntent: Partial<TripIntent> = {
        from: startPoint.id,
        to: endPoint.id,
        goTime: { hour: 9, minute: 0 }
      };

      await sendTripIntent(tripIntent);

      RootNavigation.navigate("Home");
    }
  };

  return (
    <SafeAreaView className="h-full">
      <View className="pt-5 pb-5 flex-row items-center bg-liane-orange">
        <AppText className="absolute text-2xl text-center text-white w-full">
          Enregistrement d&apos;un trajet
        </AppText>
      </View>

      <View className="flex flex-col h-full justify-around mx-2 -mb-20">

        <View className="flex flex-col rounded-xl bg-gray-200 py-2 px-3 items-center z-10">

          <View className="flex flex-row w-full justify-between items-center">
            <AppText className="text-2xl font-extralight">Trajet</AppText>
          </View>

          <View className="flex flex-row w-full m-3 items-center">

            <View className="flex flex-col items-center mr-3">
              <View className="h-3 w-3 bg-liane-yellow rounded-full -mb-1" />
              <View className="h-24 w-3 border-solid border border-liane-yellow" />
              <View className="h-3 w-3 bg-liane-yellow rounded-full -mt-1" />
            </View>

            <View className="flex-grow self-stretch">

              <View className="absolute min-h-full -top-2 left-0 right-0 z-20">
                <AppText className="flex-row text-base font-bold">Départ</AppText>
                <AppAutocomplete
                  className="border-0"
                  renderTextInput={(props) => <AppTextInput {...props} className="border-0 bg-white rounded px-1.5 py-0.5" />}
                  data={filteredStartPoints}
                  value={shownStartPoint}
                  placeholder="Point de départ"
                  onChangeText={findStartPoint}
                  flatListProps={{
                    renderItem: ({ item }: { item:RallyingPoint }) => (
                      <TouchableOpacity
                        className="bg-gray-100"
                        onPress={() => {
                          setStartPoint(item);
                          setShownStartPoint(item.label);
                          setFilteredStartPoints([]);
                        }}
                      >
                        <AppText className="flex-row py-2.5 pl-2">{item.label}</AppText>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
              <View className="absolute min-h-full top-1/2 left-0 right-0 z-10">
                <AppText className="flex-row text-base font-bold"> Arrivé</AppText>
                <AppAutocomplete
                  className="border-0"
                  renderTextInput={(props) => <AppTextInput {...props} className="bg-white rounded px-1.5 py-0.5" />}
                  data={filteredEndPoints}
                  value={shownEndPoint}
                  placeholder="Point d'arrivé"
                  onChangeText={(text) => findEndPoint(text)}
                  flatListProps={{
                    renderItem: ({ item }: { item:RallyingPoint }) => (
                      <TouchableOpacity
                        className="bg-gray-100"
                        onPress={() => {
                          setEndPoint(item);
                          setShownEndPoint(item.label);
                          setFilteredEndPoints([]);
                        }}
                      >
                        <AppText className="flex-row py-2.5 pl-2">{item.label}</AppText>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>

            </View>
          </View>
        </View>

        <View className="flex flex-col rounded-xl bg-gray-200 p-3 items-center">

          <View className="flex flex-row w-full justify-between items-center">
            <AppText className="text-2xl font-extralight">Horaire</AppText>
            <View className="flex flex-row items-center">
              <AppText className="text-gray-600">Aller - Retour</AppText>
              <AppSwitch
                onValueChange={() => {
                  setIsRoundTrip((previousState) => !previousState);
                  if (!isRoundTrip && goTime) {
                    const toDate = new Date(goTime.getTime());
                    toDate!.setHours(toDate!.getHours() + 1);
                    setReturnTime(toDate);
                  }
                }}
                value={isRoundTrip}
              />
            </View>
          </View>

          <View className="flex flex-col w-full flex-auto">

            <View className="flex flex-row w-full justify-around items-center mt-2">
              <View className="flex flex-col">
                <AppText className="text-base text-center font-bold">Aller</AppText>
                <AppButton
                  title={goTime != null ? `${goTime.getHours()}:${goTime.getMinutes() < 10 ? "0" : ""}${goTime.getMinutes()}` : ""}
                  className="bg-gray-500 rounded-xl m-1 p-2 "
                  onPress={() => setShowGoTime(true)}
                />
              </View>
              {
                  isRoundTrip
                  && (
                  <View className="flex flex-col">
                    <AppText className="text-base text-center font-bold">Retour</AppText>
                    <AppButton
                      title={returnTime != null ? `${returnTime.getHours()}:${returnTime.getMinutes() < 10 ? "0" : ""}${returnTime.getMinutes()}` : ""}
                      className="bg-gray-500 rounded-xl m-1 p-2"
                      onPress={() => setShowReturnTime(true)}
                    />
                  </View>
                  )
                }
            </View>

          </View>

          {
            showReturnTime
            && (
            <RNDateTimePicker
              mode="time"
              value={returnTime!}
              onChange={onChangeReturnTime}
              className="h-5 w-5"
            />
            )
          }
          {
              showGoTime
              && (
              <RNDateTimePicker
                mode="time"
                value={goTime!}
                onChange={onChangeGoTime}
                className="h-5 w-5"
              />
              )
          }

        </View>

        <AppButton
          title="Publier"
          className="bg-yellow-600 rounded-full m-1 p-1 mx-10"
          disabled={!startPoint || !endPoint}
          onPress={onPublicationPressed}
        />

      </View>

    </SafeAreaView>
  );
};

export default PublishScreen;
