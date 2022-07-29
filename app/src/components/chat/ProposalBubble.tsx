import {Bubble, MessageText} from "react-native-gifted-chat";
import {tw} from "@/api/tailwind";
import {View} from "react-native";
import {AppButton} from "@/components/base/AppButton";
import React from "react";

export interface Proposal {
  start: string, 
  end: string,
  date: Date
}

const ProposalBubble = (params: {props, proposal: Proposal}) => {
  return (
      <Bubble {...params.props}

              wrapperStyle={{
                left: tw("bg-liane-yellow w-5/6 "),
                right: tw("bg-liane-orange-lighter w-5/6 ")
              }}
              timeTextStyle={{
                right: tw("text-black"),
                left: tw("text-black")
              }}

              renderMessageText={(props) => {
                props.currentMessage.text = `${props.user.name} fera le trajet ${params.proposal.start} → ${params.proposal.end} le ${params.proposal.date.toLocaleDateString()}`;
                return (
                    <View style={tw("flex w-full")}>
                      <MessageText {...props} customTextStyle={tw("font-inter-bold ")} />

                      <View style={tw("flex-row justify-around w-full mt-5")}>

                        <AppButton buttonStyle={tw("flex-col border-2")}
                                   title={"Rejoindre"}
                                   type={"outline"}/>

                        <AppButton buttonStyle={tw("flex-col border-2")}
                                   title={"Non merci"}
                                   type={"outline"}/>
                      </View>

                    </View>
                );
              }}
      />
  );
}

export default ProposalBubble;