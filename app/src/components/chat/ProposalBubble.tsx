import { Bubble, MessageText, RenderMessageTextProps } from "react-native-gifted-chat";
import { View } from "react-native";
import React from "react";
import { useTailwind } from "tailwind-rn";
import { AppButton } from "@/components/base/AppButton";
import { ChatMessage } from "@/api";

export interface Proposal {
  start: string,
  end: string,
  date: Date
}

const ProposalBubble = () => {
  const tw = useTailwind();

  return (
    <Bubble
      wrapperStyle={{
        left: tw("bg-yellow-400 w-5/6 "),
        right: tw("bg-orange-400-lighter w-5/6 ")
      }}
      renderMessageText={(props: RenderMessageTextProps<ChatMessage>) => (
        <View style={tw("flex w-full")}>
          <MessageText customTextStyle={tw("font-bold ")} currentMessage={props.currentMessage} />

          <View style={tw("flex-row justify-around w-full mt-5")}>

            <AppButton
              style={tw("flex-col border-2")}
              title="Rejoindre"
              outline
            />

            <AppButton
              style={tw("flex-col border-2")}
              title="Non merci"
              outline
            />
          </View>

        </View>
      )}
    />
  );
};

export default ProposalBubble;