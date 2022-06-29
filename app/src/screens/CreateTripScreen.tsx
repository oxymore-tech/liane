import React, { useState } from "react";
import { SafeAreaView, Switch, TouchableOpacity, View, StyleSheet } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { ToggleButton } from 'react-native-paper';
import { AppButton } from "@/components/base/AppButton";
import { getRallyingPoints } from "@/api/client";
import Autocomplete from 'react-native-autocomplete-input';
import {AppTextInput} from "@/components/base/AppTextInput";
import { RallyingPoint } from "@/api";
import {getLastKnownLocation} from "@/api/location";

const CreateTripScreen = () => {

  const [isRoundTrip, setIsRoundTrip] = useState(false);
  
  const [isRegular, setIsRegular] = useState(false);
  
  const [day, setDay] = useState(new Date());
  const [showDay, setShowDay] = useState(false);
  
  const [showToTime, setShowToTime] = useState(false);
  const [showFromTime, setShowFromTime] = useState(false);

  const [toTime, setToTime] = useState(new Date());
  const [fromTime, setFromTime] = useState( () => {
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() + 1)
    return fromDate;
  });
  
  const [status, setStatus] = useState({driverStatus: false, passengerStatus: false, neutralStatus: false});
  
  const onStatusButtonToggle = (value: string) => {
    const newStatus = {
      driverStatus: false,
      passengerStatus: false,
      neutralStatus: false
    };
    newStatus[value + "Status"] = true;  
    
    setStatus(newStatus);
  };
  
  const onChangeDay = (event, selectedDay) => {
    setShowDay(false);
    setDay(selectedDay);
  }
  
  const onChangeToTime = (event, selectedTime) => {
    setShowToTime(false);
    setToTime(selectedTime);
  }

  const onChangeFromTime = (event, selectedTime) => {
    setShowFromTime(false);
    setFromTime(selectedTime);
  }
  
  const [filteredStartPoints, setFilteredStartPoints] = useState<RallyingPoint[]>([]);
  const [filteredEndPoints, setFilteredEndPoints] = useState<RallyingPoint[]>([]);
  
  const [startPoint, setStartPoint] = useState<RallyingPoint | null>(null);
  const [shownStartPoint, setShownStartPoint] = useState("");

  const [endStart, setEndPoint] = useState<RallyingPoint | null>(null);
  const [shownEndPoint, setShownEndPoint] = useState("");

  const findStartPoint = async (query) => {
    setShownStartPoint(query);
    setStartPoint(null);

    if (query) {
      const regex = new RegExp(`${query.trim()}`, 'i');
      let location = await getLastKnownLocation();
      
      await getRallyingPoints(query, location)
          .then((r) => {
            const f = r.filter((point) => point.label.search(regex) >= 0);
            setFilteredStartPoints(f);
          });
      
    } else {
      setFilteredStartPoints([]);
    }
  };
  
  const findEndPoint = (query) => {
    setShownEndPoint(query);
    setEndPoint(null);
    
    if (query) {
      const regex = new RegExp(`${query.trim()}`, 'i');
      
      getRallyingPoints(query).then((r) => {
        const f = r.filter((point) => point.label.search(regex) >= 0);
        setFilteredEndPoints(f);
      });
      
    } else {
      setFilteredEndPoints([]);
    }
  }
  
  const onPublicationPressed = () => {
    // Add trips to scheduled trips when pressed ?
  }
    
  return (
      <SafeAreaView>
          <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
            <AppText style={tw("absolute text-lg text-center text-white w-full")}>
              Enregistrement d'un trajet
            </AppText>
          </View>
        
        <View style={tw("flex flex-col h-full justify-around mx-2 -mb-20")}>
          
        {/* Start/End locations selection */}
        <View style={tw("flex flex-col rounded-xl bg-gray-300 p-3 items-center z-10")}>
          
          <View style={tw("flex flex-row w-full justify-between items-center")}>
            <AppText style={tw("text-2xl font-inter-extralight")}>Trajet</AppText>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("text-sm font-inter-medium")}>Aller - Retour</AppText>
              <Switch
                  trackColor={{ false: "#767577", true: "#FF5B22" }}
                  thumbColor="#f4f3f4"
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={() => setIsRoundTrip(previousState => !previousState)}
                  value={isRoundTrip}
              />
            </View>
          </View>
          
          <View style={tw("flex flex-row w-full items-center")}>
            
            <View style={tw("flex flex-col items-center mr-3")}>
              <View style={tw("h-3 w-3 bg-orange-light rounded-full -mb-1")}></View>
              <View style={tw("h-24 w-3 border-solid border border-orange-light")}></View>
              <View style={tw("h-3 w-3 bg-orange-light rounded-full -mt-1")}></View>
            </View>
            
              <View style={autocompleteStyle.autocompleteContainer}>
                
                <View style={autocompleteStyle.autocompleteContainerTop}>
                  <AppText style={tw("flex-row text-base font-inter-medium")}> Départ</AppText>
                  <Autocomplete
                        inputContainerStyle={tw("border-0")}
                        renderTextInput={(props) => {
                          return <AppTextInput {...props} style={tw("bg-white rounded px-1.5 py-0.5")}></AppTextInput>
                        }}
                        
                        data={filteredStartPoints}
                        value={shownStartPoint}
                        placeholder="Point de départ"
                        onChangeText={(text) => findStartPoint(text)}
                        flatListProps={{
                          renderItem: ({item}) => (
                              <TouchableOpacity style={tw("bg-gray-100")}
                                                onPress={() => {
                                                  setStartPoint(item);
                                                  setShownStartPoint(item.label);
                                                  setFilteredStartPoints([]);
                                                }}>
                                <AppText style={tw("flex-row py-2.5 pl-2")}>{item.label}</AppText>
                              </TouchableOpacity>
                          ),
                        }}
                    />
                </View>
                <View style={autocompleteStyle.autocompleteContainerBot}>
                  <AppText style={tw("flex-row text-base font-inter-medium")}> Arrivé</AppText>
                  <Autocomplete
                      inputContainerStyle={tw("border-0")}
                      renderTextInput={(props) => {
                        return <AppTextInput {...props} style={tw("bg-white rounded px-1.5 py-0.5")}></AppTextInput>
                      }}

                      data={filteredEndPoints}
                      value={shownEndPoint}
                      placeholder="Point d'arrivé"
                      onChangeText={(text) => findEndPoint(text)}
                      flatListProps={{
                        renderItem: ({item}) => (
                            <TouchableOpacity style={tw("bg-gray-100")}
                                              onPress={() => {
                                                setEndPoint(item);
                                                setShownEndPoint(item.label);
                                                setFilteredEndPoints([]);
                                              }}>
                              <AppText style={tw("flex-row py-2.5 pl-2")}>{item.label}</AppText>
                            </TouchableOpacity>
                        ),
                      }}
                  />
                </View>
              
              </View>
          </View>
        </View>

        {/* Date/Time selection */}
        <View style={tw("flex flex-col rounded-xl bg-gray-300 p-3 items-center")}>

          <View style={tw("flex flex-row w-full justify-between items-center")}>
            <AppText style={tw("text-2xl font-inter-normal font-inter-extralight")}>Horaire</AppText>
            <View style={tw("flex flex-row items-center")}>
              <AppText style={tw("text-sm font-inter-medium")}>Régulier</AppText>
              <Switch
                  trackColor={{ false: "#767577", true: "#FF5B22" }}
                  thumbColor="#f4f3f4"
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={() => setIsRegular(previousState => !previousState)}
                  value={isRegular}
              />
            </View>
          </View>

          <View style={tw("flex flex-col w-full flex-auto")}>

              <AppButton
                  title={day.toDateString()}
                  titleStyle={tw("text-gray-600")}
                  buttonStyle={tw("rounded-md bg-white py-2 px-4")}
                  onPress={() => setShowDay(true)}
              />
            
              <View style={tw("flex flex-row w-full justify-around items-center mt-2")}>
                <View style={tw("flex flex-col")}>
                  <AppText style={tw("text-base font-inter-medium")}> Aller</AppText>
                  <AppButton title={toTime.getHours() + ":" + (toTime.getMinutes() < 10 ? "0" : "") + toTime.getMinutes()}
                             titleStyle={tw("text-gray-600")}
                             buttonStyle={tw("bg-gray-200")}
                             onPress={() => setShowToTime(true)}/>
                </View>
                {
                  isRoundTrip &&
                  <View style={tw("flex flex-col")}>
                    <AppText style={tw("text-base font-inter-medium")}> Retour</AppText>
                    <AppButton title={fromTime.getHours()  + ":" + (fromTime.getMinutes() < 10 ? "0" : "") + fromTime.getMinutes()}
                               titleStyle={tw("text-gray-600")}
                               buttonStyle={tw("bg-gray-200")}
                               onPress={() => setShowFromTime(true)}/>
                  </View>
                }
              </View>
              
            </View>

          {/* DatePickers */}
          {
              showDay &&
              <RNDateTimePicker mode="date" value={day}
                                onChange={onChangeDay}
                                style={tw("h-5 w-5")}/>
          }
          {
            showToTime &&
            <RNDateTimePicker mode="time" value={toTime} 
                              onChange={onChangeToTime}
                              style={tw("h-5 w-5")}/>
          }
          {
              showFromTime &&
              <RNDateTimePicker mode="time" value={fromTime}
                                onChange={onChangeFromTime}
                                style={tw("h-5 w-5")}/>
          }

        </View>

        {/* Status selection */}
        <View style={tw("flex flex-row bg-gray-300 h-16 rounded-xl items-center justify-center")}>
          
          <ToggleButton style={tw("flex flex-grow h-full rounded-l-xl rounded-r-none " + (status.passengerStatus ? "bg-liane-orange" : ""))}
              icon={() => <View><AppText style={tw("text-base " + (status.passengerStatus ? "text-white" : "text-gray-500"))}>Passager</AppText></View>}
              status={status.passengerStatus ? "checked" : "unchecked"}
              onPress={() => onStatusButtonToggle("passenger")} />
          
          <ToggleButton style={tw("flex flex-grow h-full rounded-none " + (status.neutralStatus ? "bg-liane-orange" : ""))}
              icon={() => <View><AppText style={tw("text-base " + (status.neutralStatus ? "text-white" : "text-gray-500"))}>Neutre</AppText></View>}
              status={status.neutralStatus ? "checked" : "unchecked"}
              onPress={() => onStatusButtonToggle("neutral")} />
          
          <ToggleButton style={tw("flex flex-grow h-full rounded-r-xl rounded-l-none " + (status.driverStatus ? "bg-liane-orange" : ""))}
              icon={() => <View><AppText style={tw("text-base " + (status.driverStatus ? "text-white" : "text-gray-500"))}>Conducteur</AppText></View>}
              status={status.driverStatus ? "checked" : "unchecked"}
              onPress={() => onStatusButtonToggle("driver")} />
        
        </View>
        
        <AppButton title="Publier" 
                   buttonStyle={tw("bg-liane-orange rounded-full mx-10")}
                    onPress={onPublicationPressed}
        />
        
        </View>
        
      </SafeAreaView>
  );
};

const autocompleteStyle = StyleSheet.create({
  autocompleteContainer: {
    flex: 1,
    flexGrow: 1,
    alignSelf: "stretch",
  },
  autocompleteContainerTop: {
    position: 'absolute',
    minHeight: "50%",
    top: "-4%",
    left: 0,
    right: 0,
    zIndex: 20,
  },
  autocompleteContainerBot: {
    position: 'absolute',
    minHeight: "50%",
    top: '52%',
    left: 0,
    right: 0,
    zIndex: 10,
  }
});

export default CreateTripScreen;
