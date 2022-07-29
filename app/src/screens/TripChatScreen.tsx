import React, {useCallback, useContext, useState} from "react";
import {RouteProp, useFocusEffect} from "@react-navigation/native";
import {StackNavigationProp} from "@react-navigation/stack";
import {NavigationParamList} from "@/components/Navigation";
import {Bubble, GiftedChat} from 'react-native-gifted-chat'
import {tw} from "@/api/tailwind";
import {HubConnection} from "@microsoft/signalr";
import {IMessage, MatchedTripIntent} from "@/api";
import {getChatConnection} from "@/api/chat";
import {Alert, KeyboardAvoidingView} from "react-native";
import ProposalBubble, {Proposal} from "@/components/chat/ProposalBubble";
import {AppContext} from "@/components/ContextProvider";

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = StackNavigationProp<NavigationParamList, "Chat">;
type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const TripChatScreen = ({route, navigation}: ChatProps) => {
  const { authUser } = useContext(AppContext);
  const [messages, setMessages] = useState<IMessage[]>([]);
  
  let connection: HubConnection;
  let groupId;
  let username = "Alex";

  let matchedIntent : MatchedTripIntent | null;
  useFocusEffect(
      React.useCallback(() => {
        const tripIntent = route.params.tripIntent;
        navigation.setOptions({headerTitle: `${tripIntent.from.label} -> ${tripIntent.to.label}`});
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
          { cancelable: true }
      );
    }
  }, []);
  
  const renderBubble = (props, proposal?: Proposal | null ) => {
    
    return (
        proposal == null &&
        (
            <Bubble {...props}
                wrapperStyle={{
                  left: tw("bg-liane-yellow"),
                  right: tw("bg-liane-orange-lighter")
                }} 
            />  
        )
        || proposal != null && 
        (
            <ProposalBubble props={props} proposal={proposal}  />
        )
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
              name: `${username} | (${route.params.tripIntent.from.label} > ${route.params.tripIntent.to.label})`
            }}
            messages={messages}
            onSend={messages => onSend(messages)}
            renderBubble={(props) => renderBubble(props)}
        />

      </KeyboardAvoidingView>
  );
};

export default TripChatScreen;
