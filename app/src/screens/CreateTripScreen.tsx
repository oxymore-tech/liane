import React, { useState } from "react";
import { SafeAreaView, TextInput, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";

const CreateTripScreen = () => {
  const [newTripName, setNewTripName] = useState("");
  
  // Add trips to scheduled trips on press ?
  
  return (
      <SafeAreaView>

          <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
            <AppText style={tw("absolute text-lg text-center text-white w-full")}>
              Enregistrement d'un trajet
            </AppText>
          </View>

        <View style={tw("rounded-xl bg-gray-300 m-4 p-3 content-center")}>

          <TextInput
              style={tw("rounded-md bg-white py-2 px-4 border-solid border-2 border-black")}
              onChangeText={(text) => {setNewTripName(text)}}
              value={newTripName}
              placeholder="Nom du trajet"
          />
          
          </View>
      </SafeAreaView>
  );
};

export default CreateTripScreen;
