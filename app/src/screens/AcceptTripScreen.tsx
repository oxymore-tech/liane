import React from "react";
import { Text, View } from "react-native";
import { Button, Header, Icon } from "react-native-elements";
import { tw } from "@/api/tailwind";

const AcceptTripScreen = ({ navigation } : any) => (
  <View style={tw("container")}>
    <Header
      leftComponent={<Icon name="arrow-left" type="font-awesome-5" solid color="white" onPress={() => navigation.navigate("Notifications")} />}
      centerComponent={{ text: "LIANE APP", style: { color: "#fff" } }}
      rightComponent={<Icon name="bell" type="font-awesome-5" solid color="white" />}
    />

    <View style={tw("pt-8 items-center")}>
      <View style={tw("bg-blue-200 px-3 py-1 rounded-full")}>
        <Text style={tw("text-blue-800 text-xl font-semibold")}>
          Accepter le covoiturage
        </Text>
      </View>
    </View>
    <View>
      <View style={tw("w-1/2 p-8")}>
        <Button
          icon={(
            <Icon
              name="check"
              size={40}
              color="white"
              type="font-awesome"
            />
                          )}
          onPress={() => navigation.navigate("Profil")}
          title="Accepter"
        />
      </View>
      <View style={tw("absolute right-0 w-1/2 p-8")}>
        <Button
          icon={(
            <Icon
              name="times"
              size={40}
              color="white"
              type="font-awesome"
            />
                          )}
          title="Refuser"
        />
      </View>
    </View>
  </View>
);

export default AcceptTripScreen;
