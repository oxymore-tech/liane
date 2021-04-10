import React, { useState } from "react";
import {
  Alert, FlatList, RefreshControl, Text, View
} from "react-native";
import { Header, Icon, ListItem } from "react-native-elements";
import { deleteNotification, getNotifications } from "@api/client";
import * as SMS from "expo-sms";

import tailwind from "tailwind-rn";

const wait = (timeout: number) => new Promise((resolve) => setTimeout(resolve, timeout));

const NotificationsScreen = ({ navigation }: any) => {
  const [list, setList] = useState<any>();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    updateNotifications();
    wait(2000).then(() => setRefreshing(false));
  }, []);

  function updateNotifications() {
    getNotifications().then((result) => {
      const notificationsList: any[] = [];
      console.log("Resultat :", result);
      result.forEach((notification) => {
        notificationsList.push({
          name: notification.message,
          subtitle: notification.date
        });
      });
      setList(notificationsList);
    });
  }

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      updateNotifications();
    });

    return unsubscribe;
  }, [navigation]);

  /*
  [
      {
        name: 'Martin souhaite covoiturer avec vous !',
        avatar_url: 'https://s3.amazonaws.com/uifaces/faces/twitter/ladylexy/128.jpg',
        subtitle: 'Demande du 12/12/12 à 12h12',
        tripId : 999
      },
      {
        name: 'Chris souhaite covoiturer avec vous :',
        avatar_url: 'https://s3.amazonaws.com/uifaces/faces/twitter/adhamdannaway/128.jpg',
        subtitle: 'Vice Chairman',
        tripId : 444
      }
    ]
  */
  const keyExtractor = (item: any, index: { toString: () => any; }) => index.toString();
  const acceptTrip = async function (message: string) {
    const isAvailable = await SMS.isAvailableAsync();
    const phoneNumber = message.split(" ").pop();
    const user = message.split(" ")[0];
    if (isAvailable && phoneNumber) {
      const { result } = await SMS.sendSMSAsync(
        phoneNumber,
        `Bonjour ${user}, je suis disposé à covoiturer avec vous.`
      );
    } else {
      Alert.alert(`Vous pouvez contacter ${user} au ${phoneNumber}`);
    }
  };

  const deleteTrip = (subtitle: number) => {
    deleteNotification(subtitle).then(() => {
      updateNotifications();
    });
  };

  const renderMenu = () => (
    <View style={tailwind("pt-8 items-center")}>
      <View style={tailwind("bg-blue-200 px-3 py-1 rounded-full")}>
        <Text style={tailwind("text-blue-800 text-xl font-semibold")}>
          Notifications
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: any) => (
    <ListItem bottomDivider onPress={() => acceptTrip(item.name)}>
      {
        // <Avatar source={{uri: item.avatar_url}} />
      }
      <ListItem.Content>
        <ListItem.Title>{item.name}</ListItem.Title>
        <ListItem.Subtitle>{item.subtitle}</ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron name="times" type="font-awesome" color="#f50" onPress={() => deleteTrip(item.subtitle)} />
    </ListItem>
  );

  return (
    <View style={tailwind("container")}>
      <Header
        leftComponent={{ icon: "menu", color: "#fff", onPress: () => navigation.openDrawer() }}
        centerComponent={{ text: "LIANE APP", style: { color: "#fff" } }}
        rightComponent={<Icon name="bell" type="font-awesome-5" solid color="white" />}
      />

      <FlatList
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
        ListHeaderComponent={renderMenu}
        style={tailwind("pt-8")}
        keyExtractor={keyExtractor}
        data={list}
        renderItem={renderItem}
      />
    </View>
  );
};

export default NotificationsScreen;
