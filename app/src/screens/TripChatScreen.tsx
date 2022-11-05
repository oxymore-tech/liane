import React, { useCallback, useState } from "react";
import { RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import RNDateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { NavigationParamList } from "@/api/navigation";
import { ChatMessage, RallyingPoint, TypedMessage } from "@/api";
import { createChatConnection } from "@/api/chat";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppTextInput } from "@/components/base/AppTextInput";

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = NativeStackNavigationProp<NavigationParamList, "Chat">;

type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const connection = createChatConnection();

const TripChatScreen = ({ route, navigation }: ChatProps) => {
  const [sendText, setSendText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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
            setMessages(conversation);
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
    const message: ChatMessage = { text: sendText };
    await connection.invoke("SendToGroup", message, groupId);
    setSendText("");
  }, [sendText]);

  const [proposalStart, setProposalStart] = useState<string>("");
  const [proposalEnd, setProposalEnd] = useState<string>("");
  const [proposalDay, setProposalDay] = useState<Date>(new Date());

  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const onChangeDay = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    setProposalDay(date ?? new Date());
  };
  const sendProposal = () => {
    const message: TypedMessage = {
      text: "proposal",
      type: "proposal"
    };
    // TODO Send typed messages to all group users
    // onSend([m]);

    setMessages((previousMessages) => [...previousMessages, message]);

    setShowProposalModal(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
    >
      <View className="h-full">
        <FlatList
          className="flex-1"
          data={messages}
          renderItem={({ item }) => (
            <View>
              <AppText>{item.text}</AppText>
            </View>
          )}
          keyExtractor={(item) => item.id!}
        />
        <View className="flex flex-row items-center">
          <AppButton icon="add-circle" color="yellow" />
          <AppTextInput
            className="flex-1 h-12"
            value={sendText}
            onChangeText={setSendText}
          />
          <AppButton
            className="bg-transparent"
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
          className="flex-1 justify-center items-center"
          onPress={() => setShowProposalModal(false)}
        >
          <TouchableWithoutFeedback>
            <View className="flex-col justify-around items-center bg-blue-200 h-2/5 w-5/6 rounded-lg">
              <AppText> Entrer le trajet :</AppText>
              <View className="flex-row items-center">
                <AppText>De</AppText>
                <TextInput
                  className="ml-3 pl-2 w-4/6 bg-white"
                  placeholder="Départ"
                  value={proposalStart}
                  onChangeText={(text) => setProposalStart(text)}
                />
              </View>

              <View className="flex-row items-center">
                <AppText>À </AppText>
                <TextInput
                  className="ml-3 pl-2 w-4/6 bg-white"
                  placeholder="Arrivé"
                  value={proposalEnd}
                  onChangeText={(text) => setProposalEnd(text)}
                />
              </View>

              <View className="flex-row items-center">
                <AppText>Le </AppText>

                <AppButton
                  title={proposalDay.toLocaleString()}
                  className="ml-3 my-2 pl-2 w-4/6 rounded-md bg-white py-2 px-4"
                  onPress={() => setShowDatePicker(true)}
                />
              </View>

              <AppButton
                className="flex-row-reverse rounded-full my-2"
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
                      className="h-5 w-5"
                    />
                    )
                }
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default TripChatScreen;
