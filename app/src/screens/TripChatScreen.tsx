import React, { useCallback, useContext, useState } from "react";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bubble, GiftedChat, InputToolbar } from "react-native-gifted-chat";
import { HubConnection } from "@microsoft/signalr";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { useTailwind } from "tailwind-rn";
import { NavigationParamList } from "@/components/Navigation";
import { ChatMessage, RallyingPoint } from "@/api";
import { getChatConnection } from "@/api/chat";
import ProposalBubble from "@/components/chat/ProposalBubble";
import { AppContext } from "@/components/ContextProvider";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = NativeStackNavigationProp<NavigationParamList, "Chat">;
type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const TripChatScreen = ({ route, navigation }: ChatProps) => {
  const { authUser } = useContext(AppContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const tw = useTailwind();

  const { matchedTripIntent } = route.params;
  const groupId = `${matchedTripIntent.p1.id} ${matchedTripIntent.p2.id}`;

  let connection: HubConnection;
  const username = "Alex";

  useFocusEffect(
    React.useCallback(() => {
      const from = matchedTripIntent.tripIntent.from as RallyingPoint;
      const to = matchedTripIntent.tripIntent.to as RallyingPoint;
      navigation.setOptions({ headerTitle: `${from?.label} ➔ ${to?.label}` });

      connection = getChatConnection();
      connection.start().then(() => {
        connection.invoke("JoinGroupChat", groupId).then((conversation: ChatMessage[]) => {
          setMessages((previousMessages) => GiftedChat.append(previousMessages, conversation));
          connection.on("ReceiveMessage", (message) => {
            setMessages((previousMessages) => GiftedChat.append(previousMessages, [message]));
          });
        });
      });

      return () => {
        connection.stop().then(() => console.info(`Connection closed on ${groupId}`));
      };
    }, [])
  );

  const onSend = useCallback((toSendMessages: ChatMessage[] = []) => {
    if (matchedTripIntent.members.length > 0) {
      connection.invoke("SendToGroup", toSendMessages[0], groupId)
        .catch((reason) => console.log(reason));
    } else {
      Alert.alert(
        "Vous êtes le seul membre de ce groupe de trajet",
        "",
        [
          {
            text: "OK"
          }
        ],
        { cancelable: true }
      );
    }
  }, []);

  // const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalStart, setProposalStart] = useState<string>("");
  const [proposalEnd, setProposalEnd] = useState<string>("");
  const [proposalDay, setProposalDay] = useState<Date>(new Date());

  const renderBubble = ({ currentMessage }: Bubble<ChatMessage>["props"]) => {
    const isProposal = currentMessage?.messageType === "proposal";
    return (
      isProposal
        ? <ProposalBubble />
        : (
          <Bubble
            wrapperStyle={{
              left: tw("bg-yellow-400"),
              right: tw("bg-orange-400-lighter")
            }}
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
    const message: ChatMessage = {
      _id: "TODO",
      text: "proposal",
      createdAt: new Date(),
      user: { _id: authUser?.uid!, name: username },
      messageType: "proposal"
    };
    // TODO Send typed messages to all group users
    // onSend([m]);

    setMessages((previousMessages) => GiftedChat.append(previousMessages, [message]));

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
      <GiftedChat
        alignTop={false}
        initialText=""
        renderUsernameOnMessage
        user={{
          _id: authUser?.uid!,
          name: username
        }}
        messages={messages}
        onSend={onSend}
        renderBubble={renderBubble}
        renderActions={renderActions}
        renderAccessory={renderAccessory}
        renderInputToolbar={(props) => <InputToolbar {...props} accessoryStyle={tw(showAccessory ? "h-12" : "h-0")} />}
      />

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
