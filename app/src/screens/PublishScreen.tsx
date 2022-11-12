import React, { useState } from "react";
import { Alert, SafeAreaView, View } from "react-native";
import RNDateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { AppText } from "@/components/base/AppText";
import { sendTripIntent } from "@/api/client";
import { RallyingPoint, TripIntent } from "@/api";
import { RootNavigation } from "@/api/navigation";
import { AppButton } from "@/components/base/AppButton";
import { AppSwitch } from "@/components/base/AppSwitch";
import { RallyingPointInput } from "@/components/base/RallyingPointInput";

const PublishScreen = () => {

  const [from, setFrom] = useState<RallyingPoint>();
  const [to, setTo] = useState<RallyingPoint>();

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

  const onPublicationPressed = async () => {
    let isValid = true;
    let message = "";

    if (from == null || to == null) {
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

    if (from && to) {
      const tripIntent: Partial<TripIntent> = {
        from: from.id,
        to: to.id,
        goTime: { hour: 9, minute: 0 }
      };

      await sendTripIntent(tripIntent);

      RootNavigation.navigate("Home");
    }
  };

  return (
    <SafeAreaView className="h-full bg-gray-800">
      <View className="pt-5 pb-5 flex-row items-center">
        <AppText className="text-2xl text-center text-white w-full">
          Je m&apos;intérresse
        </AppText>
      </View>

      <View>

        <RallyingPointInput
          zIndex={1000}
          placeholder="Départ"
          value={from}
          onChange={setFrom}
        />

        <RallyingPointInput
          zIndex={2000}
          placeholder="Arrivé"
          value={to}
          onChange={setTo}
        />

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
                  color="blue"
                  title={goTime != null ? `${goTime.getHours()}:${goTime.getMinutes() < 10 ? "0" : ""}${goTime.getMinutes()}` : ""}
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
          color="yellow"
          disabled={!from || !to}
          onPress={onPublicationPressed}
        />

      </View>

    </SafeAreaView>
  );
};

export default PublishScreen;
