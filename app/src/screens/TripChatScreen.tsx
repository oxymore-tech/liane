import React, { useCallback, useContext, useState } from "react";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bubble, GiftedChat, InputToolbar } from "react-native-gifted-chat";
import { HubConnection } from "@microsoft/signalr";
import {
  FlatList,
  KeyboardAvoidingView, Modal, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { useTailwind } from "tailwind-rn";
import { NavigationParamList } from "@/api/navigation";
import { ChatMessage, RallyingPoint } from "@/api";
import {
  createChatConnection,
  fromSignalr, getChatConnection, SignalrMessage, toSignalr, TypedSignalrMessage
} from "@/api/chat";
import ProposalBubble from "@/components/chat/ProposalBubble";
import { AppContext } from "@/components/ContextProvider";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppTextInput } from "@/components/base/AppTextInput";
import ScheduleTripItem from "@/components/ScheduleTripItem";

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = NativeStackNavigationProp<NavigationParamList, "Chat">;
type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const connection = createChatConnection();

const TripChatScreen = ({ route, navigation }: ChatProps) => {
  const { authUser } = useContext(AppContext);

  const [sendText, setSendText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const tw = useTailwind();

  const { matchedTripIntent } = route.params;
  const groupId = `${matchedTripIntent.from.id} ${matchedTripIntent.to.id}`;

  useFocusEffect(
    React.useCallback(() => {
      const from = matchedTripIntent.tripIntent.from as RallyingPoint;
      const to = matchedTripIntent.tripIntent.to as RallyingPoint;
      navigation.setOptions({ headerTitle: `${from?.label} ➔ ${to?.label}` });
      connection.start().then(() => {
        connection.invoke("JoinGroupChat", groupId)
          .then((conversation: ChatMessage[]) => {
            setMessages((previousMessages) => [...previousMessages, ...conversation]);
          });
        connection.on("ReceiveMessage", (message) => {
          setMessages((previousMessages) => [...previousMessages, message]);
        });
      });

      return () => {
        connection.stop().then(() => console.info(`Connection closed on ${groupId}`));
      };
    }, [])
  );

  const onSend = useCallback(async () => {
    const message :ChatMessage = { text: sendText };
    await connection.invoke("SendToGroup", message, groupId);
  }, [sendText]);

  const [proposalStart, setProposalStart] = useState<string>("");
  const [proposalEnd, setProposalEnd] = useState<string>("");
  const [proposalDay, setProposalDay] = useState<Date>(new Date());

  const renderBubble = ({ currentMessage }: Bubble<TypedSignalrMessage>["props"]) => {
    const isProposal = currentMessage?.messageType === "proposal";
    return (
      isProposal
        ? <ProposalBubble />
        : (
          <Bubble
            wrapperStyle={{
              left: tw("bg-yellow-400"),
              right: tw("bg-orange-400")
            }}
            {...currentMessage}
          />
        )
    );
  };

  const [showAccessory, setShowAccessory] = useState<boolean>(false);
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const onChangeDay = (event, selectedDay) => {
    setShowDatePicker(false);
    setProposalDay(selectedDay);
  };
  const sendProposal = () => {
    const message: TypedSignalrMessage = {
      _id: "TODO",
      text: "proposal",
      createdAt: new Date(),
      user: { _id: authUser?.id!, name: authUser!.phone },
      messageType: "proposal"
    };
    // TODO Send typed messages to all group users
    // onSend([m]);

    setMessages((previousMessages) => [...previousMessages, message]);

    setShowProposalModal(false);
  };

  const renderActions = () => (
    <View style={tw("flex-row items-center justify-center h-full ml-1")}>
      <Ionicons
        name={showAccessory ? "add-circle" : "add-circle-outline"}
        style={tw("text-2xl")}
        onPress={() => setShowAccessory(!showAccessory)}
      />
    </View>
  );

  const renderAccessory = () => (
    showAccessory && (
      <View style={tw("flex-row h-full bg-gray-200")}>
        <AppButton
          icon="timer-outline"
          style={tw("flex-row items-center justify-center m-1")}
          title="Proposer un trajet"
          onPress={() => setShowProposalModal(true)}
        />
      </View>
    )
  );

  return (
    <KeyboardAvoidingView
      style={tw("flex-1")}
    >
      <View style={tw("h-full")}>
        <FlatList
          style={tw("flex-1 bg-liane-orange")}
          data={messages}
          renderItem={({ item }) => (
            <View>
              <AppText>{item.text}</AppText>
            </View>
          )}
          keyExtractor={(item) => item.id!}
          // refreshing={refreshing}
          // onRefresh={refresh}
          inverted
        />
        <View style={tw("flex flex-row items-center bg-liane-orange")}>
          <AppButton icon="add-circle" style={tw("")} color="orange" />
          <AppTextInput
            style={tw("flex-1 h-12 bg-liane-yellow")}
            value={sendText}
            onChangeText={setSendText}
          />
          <AppButton
            style={tw("bg-transparent")}
            title="Envoyer"
            onPress={onSend}
          />
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showProposalModal}
      >
        <TouchableOpacity
          style={tw("flex-1 justify-center items-center")}
          onPress={() => setShowProposalModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={tw("flex-col justify-around items-center bg-blue-200 h-2/5 w-5/6 rounded-lg")}>
              <AppText> Entrer le trajet :</AppText>
              <View style={tw("flex-row items-center")}>
                <AppText>De</AppText>
                <TextInput
                  style={tw("ml-3 pl-2 w-4/6 bg-white")}
                  placeholder="Départ"
                  value={proposalStart}
                  onChangeText={(text) => setProposalStart(text)}
                />
              </View>

              <View style={tw("flex-row items-center")}>
                <AppText>À </AppText>
                <TextInput
                  style={tw("ml-3 pl-2 w-4/6 bg-white")}
                  placeholder="Arrivé"
                  value={proposalEnd}
                  onChangeText={(text) => setProposalEnd(text)}
                />
              </View>

              <View style={tw("flex-row items-center")}>
                <AppText>Le </AppText>

                <AppButton
                  title={proposalDay.toLocaleString()}
                  style={tw("ml-3 my-2 pl-2 w-4/6 rounded-md bg-white py-2 px-4")}
                  onPress={() => setShowDatePicker(true)}
                />
              </View>

              <AppButton
                style={tw("flex-row-reverse rounded-full my-2")}
                icon="paper-plane-outline"
                title="Envoyer la proposition"
                onPress={sendProposal}
              />

            </View>

          </TouchableWithoutFeedback>
        </TouchableOpacity>
        {
          showDatePicker && (
            <RNDateTimePicker
              mode="date"
              value={proposalDay}
              onChange={onChangeDay}
              style={tw("h-5 w-5")}
            />
          )
        }
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default TripChatScreen;
