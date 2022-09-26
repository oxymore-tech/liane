import React, { useState } from "react";
import {
  Alert, SafeAreaView, Switch, TouchableOpacity, View
} from "react-native";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import Autocomplete from "react-native-autocomplete-input";
import { useTailwind } from "tailwind-rn";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { getRallyingPoints, sendTripIntent } from "@/api/client";
import { AppTextInput } from "@/components/base/AppTextInput";
import { RallyingPoint, TripIntent } from "@/api";
import { getLastKnownLocation } from "@/api/location";
import { navigation } from "@/components/Navigation";

const PublishScreen = () => {
  const tw = useTailwind();

  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const [showToTime, setShowToTime] = useState(false);
  const [showFromTime, setShowFromTime] = useState(false);

  const [fromTime, setFromTime] = useState<Date>(new Date());
  const [toTime, setToTime] = useState<Date | null>(null);

  const onChangeFromTime = (event, selectedTime) => {
    setShowFromTime(false);
    setFromTime(selectedTime);
  };

  const onChangeToTime = (event, selectedTime) => {
    setShowToTime(false);
    setToTime(selectedTime);
  };

  const [filteredStartPoints, setFilteredStartPoints] = useState<RallyingPoint[]>([]);
  const [filteredEndPoints, setFilteredEndPoints] = useState<RallyingPoint[]>([]);

  const [startPoint, setStartPoint] = useState<RallyingPoint | null>(null);
  const [shownStartPoint, setShownStartPoint] = useState("");

  const [endPoint, setEndPoint] = useState<RallyingPoint | null>(null);
  const [shownEndPoint, setShownEndPoint] = useState("");

  const findStartPoint = async (query) => {
    setShownStartPoint(query);
    setStartPoint(null);

    if (query) {
      const regex = new RegExp(`${query.trim()}`, "i");
      const location = await getLastKnownLocation();

      await getRallyingPoints(query, location)
        .then((r) => {
          const f = r.filter((point) => point.label.search(regex) >= 0);
          setFilteredStartPoints(f);
        });

    } else {
      setFilteredStartPoints([]);
    }
  };

  const findEndPoint = async (query) => {
    setShownEndPoint(query);
    setEndPoint(null);

    if (query) {
      const regex = new RegExp(`${query.trim()}`, "i");
      const location = await getLastKnownLocation();

      await getRallyingPoints(query, location)
        .then((r) => {
          const f = r.filter((point) => point.label.search(regex) >= 0);
          setFilteredEndPoints(f);
        });

    } else {
      setFilteredEndPoints([]);
    }
  };

  const onPublicationPressed = async () => {
    let isValid = true;
    let message = "";

    if (startPoint == null || endPoint == null) {
      message += "Point de départ et/ou d'arrivé invalides\n";
      isValid = false;
    }
    if (isRoundTrip && fromTime.getTime() >= toTime!.getTime()) {
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

      navigation.navigate("Home");
    }
  };

  return (
    <SafeAreaView style={tw("h-full")}>
      <View style={tw("pt-5 pb-5 flex-row items-center bg-orange-400")}>
        <AppText style={tw("absolute text-lg text-center text-white w-full")}>
          Enregistrement d&apos;un trajet
        </AppText>
      </View>

      <View style={tw("flex flex-col h-full justify-around mx-2 -mb-20")}>

        <View style={tw("flex flex-col rounded-xl bg-gray-300 p-3 items-center z-10")}>

          <View style={tw("flex flex-row w-full justify-between items-center")}>
            <AppText style={tw("text-2xl font-extralight")}>Trajet</AppText>
          </View>

          <View style={tw("flex flex-row w-full items-center")}>

            <View style={tw("flex flex-col items-center mr-3")}>
              <View style={tw("h-3 w-3 bg-liane-yellow rounded-full -mb-1")} />
              <View style={tw("h-24 w-3 border-solid border border-liane-yellow")} />
              <View style={tw("h-3 w-3 bg-liane-yellow rounded-full -mt-1")} />
            </View>

            <View style={tw("flex-grow self-stretch")}>

              <View style={tw("absolute min-h-full -top-2 left-0 right-0 z-20")}>
                <AppText style={tw("flex-row text-base font-medium")}> Départ</AppText>
                <Autocomplete
                  inputContainerStyle={tw("border-0")}
                  renderTextInput={(props) => <AppTextInput {...props} style={tw("bg-white rounded px-1.5 py-0.5")} />}
                  data={filteredStartPoints}
                  value={shownStartPoint}
                  placeholder="Point de départ"
                  onChangeText={(text) => findStartPoint(text)}
                  flatListProps={{
                    renderItem: ({ item }: { item:RallyingPoint }) => (
                      <TouchableOpacity
                        style={tw("bg-gray-100")}
                        onPress={() => {
                          setStartPoint(item);
                          setShownStartPoint(item.label);
                          setFilteredStartPoints([]);
                        }}
                      >
                        <AppText style={tw("flex-row py-2.5 pl-2")}>{item.label}</AppText>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>
              <View style={tw("absolute min-h-full top-1/2 left-0 right-0 z-10")}>
                <AppText style={tw("flex-row text-base font-medium")}> Arrivé</AppText>
                <Autocomplete
                  inputContainerStyle={tw("border-0")}
                  renderTextInput={(props) => <AppTextInput {...props} style={tw("bg-white rounded px-1.5 py-0.5")} />}
                  data={filteredEndPoints}
                  value={shownEndPoint}
                  placeholder="Point d'arrivé"
                  onChangeText={(text) => findEndPoint(text)}
                  flatListProps={{
                    renderItem: ({ item }: { item:RallyingPoint }) => (
                      <TouchableOpacity
                        style={tw("bg-gray-100")}
                        onPress={() => {
                          setEndPoint(item);
                          setShownEndPoint(item.label);
                          setFilteredEndPoints([]);
                        }}
                      >
                        <AppText style={tw("flex-row py-2.5 pl-2")}>{item.label}</AppText>
                      </TouchableOpacity>
                    )
                  }}
                />
              </View>

            </View>
          </View>
        </View>

        <View style={tw("flex flex-col rounded-xl bg-gray-300 p-3 items-center")}>

          <View style={tw("flex flex-row w-full justify-between items-center")}>
            <AppText style={tw("text-2xl font-normal font-extralight")}>Horaire</AppText>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("text-sm font-medium")}>Aller - Retour</AppText>
              <Switch
                trackColor={{ false: "#767577", true: "#FF5B22" }}
                thumbColor="#f4f3f4"
                ios_backgroundColor="#3e3e3e"
                onValueChange={() => {
                  setIsRoundTrip((previousState) => !previousState);
                  if (!isRoundTrip) {
                    const toDate = new Date(fromTime.getTime());
                    toDate!.setHours(toDate!.getHours() + 1);
                    setToTime(toDate);
                  }
                }}
                value={isRoundTrip}
              />
            </View>
          </View>

          <View style={tw("flex flex-col w-full flex-auto")}>

            <View style={tw("flex flex-row w-full justify-around items-center mt-2")}>
              <View style={tw("flex flex-col")}>
                <AppText style={tw("text-base font-medium")}> Aller</AppText>
                <AppButton
                  title={`${fromTime.getHours()}:${fromTime.getMinutes() < 10 ? "0" : ""}${fromTime.getMinutes()}`}
                  style={tw("bg-gray-200")}
                  onPress={() => setShowFromTime(true)}
                />
              </View>
              {
                  isRoundTrip
                  && (
                  <View style={tw("flex flex-col")}>
                    <AppText style={tw("text-base font-medium")}> Retour</AppText>
                    <AppButton
                      title={toTime != null ? `${toTime.getHours()}:${toTime.getMinutes() < 10 ? "0" : ""}${toTime.getMinutes()}` : ""}
                      style={tw("bg-gray-200")}
                      onPress={() => setShowToTime(true)}
                    />
                  </View>
                  )
                }
            </View>

          </View>

          {
            showToTime
            && (
            <RNDateTimePicker
              mode="time"
              value={toTime!}
              onChange={onChangeToTime}
              style={tw("h-5 w-5")}
            />
            )
          }
          {
              showFromTime
              && (
              <RNDateTimePicker
                mode="time"
                value={fromTime}
                onChange={onChangeFromTime}
                style={tw("h-5 w-5")}
              />
              )
          }

        </View>

        <AppButton
          title="Publier"
          style={tw("bg-orange-400 rounded-full mx-10")}
          disabled={!startPoint || !endPoint}
          onPress={onPublicationPressed}
        />

      </View>

    </SafeAreaView>
  );
};

export default PublishScreen;
