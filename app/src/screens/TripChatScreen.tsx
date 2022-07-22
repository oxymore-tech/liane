import React, {useCallback, useEffect, useState} from "react";
import {RouteProp, useFocusEffect} from "@react-navigation/native";
import {StackNavigationProp} from "@react-navigation/stack";
import {NavigationParamList} from "@/components/Navigation";
import {Bubble, GiftedChat, QuickReplies, User} from 'react-native-gifted-chat'
import {Websocket} from 'websocket-ts';
import {tw} from "@/api/tailwind";
import {getStoredToken} from "@/api/storage";
import {BaseUrl} from "@/api/http";
import {HttpTransportType, HubConnection, HubConnectionBuilder, LogLevel} from "@microsoft/signalr";

export interface IMessage {
  _id: string | number
  text: string
  createdAt: Date | number
  user: User
  image?: string
  video?: string
  audio?: string
  system?: boolean
  sent?: boolean
  received?: boolean
  pending?: boolean
  quickReplies?: QuickReplies
}

type ChatRouteProp = RouteProp<NavigationParamList, "Chat">;
type ChatNavigationProp = StackNavigationProp<NavigationParamList, "Chat">;
type ChatProps = {
  route: ChatRouteProp;
  navigation: ChatNavigationProp;
};

const TripChatScreen = ({ route, navigation }: ChatProps) => {
  const [isSending, setIsSending] = useState(false);
  
  let tmpID = 486;
  let ws: Websocket; // Websocket
  let connection : HubConnection;
  
  useFocusEffect(
      React.useCallback(() => {

        console.log("INIT CHAT")
        const tripIntent = route.params.tripIntent;
        navigation.setOptions({ headerTitle: `${tripIntent.from.label} -> ${tripIntent.to.label}` });
        
        /*
        // Create new websocket
        getStoredToken().then((token) => {
          ws = new WebsocketBuilder(BaseUrl + "/ws?ApiToken=" + token)
              .onOpen((i, ev) => { console.log("opened") })
              .onClose((i, ev) => { console.log("closed") })
              .onError((i, ev) => { console.log("error") })
              .onRetry((i, ev) => { console.log("retry") })
              .onMessage((i, ev) => {

                tmpID++;
                if (isSending) {
                  setIsSending(false);
                }
                else {
                  const m : IMessage[] = [{
                    _id: tmpID,
                    text: ev.data,
                    createdAt: new Date(),
                    user: { _id: 3 },
                  }];

                  setMessages(previousMessages => GiftedChat.append(previousMessages, m))
                }
              })
              .build();
        }        
         
      );
      */
        
        // Create signalr hub connection
        connection = new HubConnectionBuilder()
            .withUrl(BaseUrl + "/hub", {
              accessTokenFactory: async () : Promise<string> => {
                return await getStoredToken() as string;
                }, 
              //skipNegotiation: true,
              //transport: HttpTransportType.WebSockets
            })
            .configureLogging(LogLevel.Trace)
            .build();

        connection.start().then(() => {
          connection.on("ReceiveMessage", (user, message) => {
            tmpID++;
            const m: IMessage[] = [{
              _id: tmpID,
              text: message,
              createdAt: new Date(),
              user: {_id: 3},
            }];

            setMessages(previousMessages => GiftedChat.append(previousMessages, m));
          });
        });

 
        
        return () => {
          // Close websocket
          // ws.close();
         }
      }, [])
  );
  
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hello developer',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'React Native',
          avatar: 'https://placeimg.com/190/150/any',
        },
      },
    ])
  }, [])

  const onSend = useCallback((messages = []) => {
    /*
    setIsSending(true);
     ws.send(messages[0].text);
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
     */
    
    connection.invoke("SendMessage", messages[0]._id.toString() , messages[0].text).then(
        (value) => console.log("SUCCESS :" + value), 
        (reason) => console.log(reason)
    );
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
    
  }, [])
     
  
  return (
      <GiftedChat 
          messages={messages}
          onSend={messages => onSend(messages)}
          renderBubble={(props) => {
            return (
                <Bubble {...props}
                        wrapperStyle={{
                          left: tw("bg-liane-yellow"),
                          right: tw("bg-liane-orange-lighter")
                        }}
                />
            )}}
          user={{
            _id: 1,
          }}
      />
  );
};

export default TripChatScreen;
