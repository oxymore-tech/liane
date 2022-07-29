import React, {useCallback, useContext, useState} from "react";
import {RouteProp, useFocusEffect} from "@react-navigation/native";
import {StackNavigationProp} from "@react-navigation/stack";
import {NavigationParamList} from "@/components/Navigation";
import {Bubble, GiftedChat, InputToolbar} from 'react-native-gifted-chat'
import {tw} from "@/api/tailwind";
import {HubConnection} from "@microsoft/signalr";
import {IMessage, MatchedTripIntent} from "@/api";
import {getChatConnection} from "@/api/chat";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import ProposalBubble, {Proposal} from "@/components/chat/ProposalBubble";
import {AppContext} from "@/components/ContextProvider";
import {AppText} from "@/components/base/AppText";
import {Ionicons} from "@expo/vector-icons";
import {AppButton} from "@/components/base/AppButton";
import RNDateTimePicker from "@react-native-community/datetimepicker";

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = StackNavigationProp<NavigationParamList, "Chat">;
type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const TripChatScreen = ({route, navigation}: ChatProps) => {
  const {authUser} = useContext(AppContext);
  const [messages, setMessages] = useState<IMessage[]>([]);

  let connection: HubConnection;
  let groupId;
  let username = "Alex";
  let matchedIntent: MatchedTripIntent | null;

  useFocusEffect(
      React.useCallback(() => {
        const tripIntent = route.params.tripIntent;
        navigation.setOptions({headerTitle: `${tripIntent.from.label} ➔ ${tripIntent.to.label}`});
        matchedIntent = route.params.matchedIntent;

        // If there is a match open the chat connection
        if (matchedIntent != null) {
          groupId = matchedIntent.p1.id + " " + matchedIntent.p2.id;

          connection = getChatConnection();
          connection.start().then(() => {
            connection.invoke("JoinGroupChat", groupId).then((conversation: IMessage[]) => {
              setMessages(previousMessages => GiftedChat.append(previousMessages, conversation));
              connection.on("ReceiveMessage", (message) => {
                setMessages(previousMessages => GiftedChat.append(previousMessages, [message]));
              });
            });
          });
        }

        return () => {
          if (matchedIntent != null) {
            connection.stop().then(r => console.log("Connection closed on " + groupId));
          }
        }
      }, [])
  );

  const onSend = useCallback((messages: IMessage[] = []) => {
    if (matchedIntent != null) {
      connection.invoke("SendToGroup", messages[0], groupId)
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
          {cancelable: true}
      );
    }
  }, []);

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [proposalStart, setProposalStart] = useState<string>("");
  const [proposalEnd, setProposalEnd] = useState<string>("");
  const [proposalDay, setProposalDay] = useState<Date>(new Date());

  const renderBubble = (props) => {
    const isProposal = props.currentMessage.messageType == "proposal";
    return (
        !isProposal &&
        (
            <Bubble {...props}
                    wrapperStyle={{
                      left: tw("bg-liane-yellow"),
                      right: tw("bg-liane-orange-lighter")
                    }}
            />
        )
        || isProposal &&
        (
            <ProposalBubble props={props} proposal={proposal!}/>
        )
    )
  };
  
  const [showAccessory, setShowAccessory] = useState<boolean>(false);
  const [showProposalModal, setShowProposalModal] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const onChangeDay = (event, selectedDay) => {
    setShowDatePicker(false);
    setProposalDay(selectedDay);
  };
  const sendProposal = () => {
    const p: Proposal = {
      start: proposalStart,
      end: proposalEnd,
      date: proposalDay
    }

    setProposal(p);

    const message: IMessage = {
      _id: "TODO",
      text: "proposal",
      createdAt: new Date(),
      user: {_id: authUser?.uid!, name: username},
      messageType: "proposal"
    }
    // TODO Send typed messages to all group users
    //onSend([m]);

    setMessages(previousMessages => GiftedChat.append(previousMessages, [message]));

    setShowProposalModal(false);
  }

  const renderActions = (props) => {
    return (
        <View style={tw("flex-row items-center justify-center h-full ml-1")}>
          <Ionicons name={showAccessory ? "add-circle" : "add-circle-outline"}
                    style={tw("text-2xl")}
                    onPress={() => setShowAccessory(!showAccessory)}
          />
        </View>
    )
  };
  const renderAccessory = (props) => {


    return (
        showAccessory &&
        <View style={tw("flex-row h-full bg-gray-200")}>
            <AppButton icon={"timer-outline"} iconStyle={tw("text-xl mr-2 text-white")}
                       buttonStyle={tw("flex-row items-center justify-center m-1")}
                       title={"Proposer un trajet"} titleStyle={tw("text-white text-sm")}
                       onPress={() => setShowProposalModal(true)}
            />
        </View>
    )
  };

  return (
      <KeyboardAvoidingView
          style={tw("flex-1")}
      >
        <GiftedChat
            alignTop={false}
            initialText={""}

            renderUsernameOnMessage={true}
            user={{
              _id: authUser?.uid!,
              name: username
            }}
            messages={messages}
            onSend={messages => onSend(messages)}
            renderBubble={(props) => renderBubble(props)}

            renderActions={(props) => renderActions(props)}

            renderAccessory={(props) => renderAccessory(props)}
            renderInputToolbar={(props) => {
              return <InputToolbar {...props} accessoryStyle={tw(showAccessory ? "h-12" : "h-0")}/>;
            }}
        />

        <Modal
            animationType="fade"
            transparent={true}
            visible={showProposalModal}
        >

          <TouchableOpacity style={tw("flex-1 justify-center items-center")}
                            onPress={() => setShowProposalModal(false)}>
            <TouchableWithoutFeedback>
              <View style={tw("flex-col justify-around items-center bg-blue-200 h-2/5 w-5/6 rounded-lg")}>
                <AppText> Entrer le trajet :</AppText>
                <View style={tw("flex-row items-center")}>
                  <AppText>De</AppText>
                  <TextInput style={tw("ml-3 pl-2 w-4/6 bg-white")} placeholder={"Départ"}
                             value={proposalStart} onChangeText={(text) => setProposalStart(text)}/>
                </View>

                <View style={tw("flex-row items-center")}>
                  <AppText>À </AppText>
                  <TextInput style={tw("ml-3 pl-2 w-4/6 bg-white")} placeholder={"Arrivé"}
                             value={proposalEnd} onChangeText={(text) => setProposalEnd(text)}/>
                </View>

                <View style={tw("flex-row items-center")}>
                  <AppText>Le </AppText>

                  <AppButton
                      title={proposalDay.toLocaleString()}
                      titleStyle={tw("text-xs text-gray-600")}
                      buttonStyle={tw("ml-3 my-2 pl-2 w-4/6 rounded-md bg-white py-2 px-4")}
                      onPress={() => setShowDatePicker(true)}
                  />
                </View>

                <AppButton buttonStyle={tw("flex-row-reverse rounded-full my-2")}
                           icon={"paper-plane-outline"} iconStyle={tw("text-xl text-white ml-1")}
                           title={"Envoyer la proposition"}
                           onPress={sendProposal}
                />

              </View>

            </TouchableWithoutFeedback>
          </TouchableOpacity>

          {
              showDatePicker
              && (
                  <RNDateTimePicker
                      mode={"date"}
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
