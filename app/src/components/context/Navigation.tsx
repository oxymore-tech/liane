import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

import { useAppNavigation } from "@/api/navigation";
import { Notification } from "@/api/notification";

import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { Row } from "@/components/base/AppLayout";
import { WithBadge } from "@/components/base/WithBadge";
import { UserPicture } from "@/components/UserPicture";
import { AppStatusBar } from "@/components/base/AppStatusBar";

import { ArchivedTripsScreen } from "@/screens/user/ArchivedTripsScreen";
import { OpenValidateTripScreen } from "@/screens/modals/OpenValidateTripScreen";
import { SettingsScreen } from "@/screens/user/SettingsScreen";
import { ShareTripLocationScreen } from "@/screens/modals/ShareTripLocationScreen";
import { AccountScreen } from "@/screens/user/AccountScreen";
import { PublishScreen } from "@/screens/publish/PublishScreen";
import { LianeDetailScreen, LianeJoinRequestDetailScreen } from "@/screens/detail/LianeDetailScreen";
import { OpenJoinRequestScreen } from "@/screens/modals/OpenJoinRequestScreen";
import { RequestJoinScreen } from "@/screens/search/RequestJoinScreen";
import { ProfileScreen } from "@/screens/user/ProfileScreen";
import { ProfileEditScreen } from "@/screens/user/ProfileEditScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import HomeScreen from "@/screens/home/HomeScreen";
import MyTripsScreen from "@/screens/user/MyTripsScreen";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
import NotificationScreen, { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";

import { useObservable } from "@/util/hooks/subscription";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const iconSize = 24;
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: useBottomBarStyle(),
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true
      }}>
      {makeTab(
        "Explorer",
        ({ focused }) => (
          <TabIcon iconName={"map-outline"} focused={focused} size={iconSize} />
        ),
        HomeScreen,
        { headerShown: false }
      )}
      {makeTab(
        "Mes trajets",
        ({ focused }) => (
          <TabIcon iconName={"calendar"} focused={focused} size={iconSize} />
        ),
        MyTripsScreen
      )}
      {makeTab(
        "Notifications",
        ({ focused }) => {
          const queryClient = useQueryClient();
          services.realTimeHub.subscribeToNotifications(async (_: Notification) => {
            await queryClient.invalidateQueries(NotificationQueryKey); //TODO just add received notification
          });
          return <BadgeTabIcon iconName={"bell-outline"} focused={focused} size={iconSize} value={notificationCount} />;
        },
        NotificationScreen
      )}
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user } = useContext(AppContext);

  if (user) {
    return (
      <Stack.Navigator initialRouteName={"Home"}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="ArchivedTrips" component={ArchivedTripsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Publish" component={PublishScreen} options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="LianeDetail" component={LianeDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ShareTripLocationScreen" component={ShareTripLocationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RequestJoin" component={RequestJoinScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenJoinLianeRequest" component={OpenJoinRequestScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenValidateTrip" component={OpenValidateTripScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="LianeJoinRequestDetail" component={LianeJoinRequestDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }
  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

type HomeScreenHeaderProp = {
  label: string;
  isRootHeader?: boolean;
  style?: StyleProp<ViewStyle>;
};
export const HomeScreenHeader = ({ isRootHeader = false, style = [] }: HomeScreenHeaderProp) => {
  const insets = useSafeAreaInsets();
  const { navigation } = useAppNavigation();
  return (
    <Row
      style={[
        {
          justifyContent: isRootHeader ? "space-between" : "flex-start",
          alignItems: "center",
          paddingHorizontal: isRootHeader ? 24 : 0,
          paddingTop: isRootHeader ? 12 : 0,
          paddingBottom: 32,
          minHeight: 60,
          marginTop: insets.top
        },
        style
      ]}>
      <AppStatusBar style="dark-content" />
      {!isRootHeader && (
        <Pressable style={{ paddingHorizontal: 16, paddingVertical: 12 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.primaryColor} />
        </Pressable>
      )}
    </Row>
  );
};

interface TabIconProps {
  // String or svg component
  iconName: IconName | React.FunctionComponent;
  focused: boolean;
  size: number;
}
const TabIcon = ({ iconName, focused, size }: TabIconProps) => {
  return (
    <View style={{ paddingHorizontal: 8 }}>
      {typeof iconName === "string" ? (
        <AppIcon size={size} name={iconName} color={focused ? AppColors.white : AppColors.secondaryColor} />
      ) : (
        iconName({
          color: focused ? AppColors.white : AppColorPalettes.blue[400],
          height: size,
          width: size
        })
      )}
    </View>
  );
};

const BadgeTabIcon = WithBadge(TabIcon);
const makeTab = (label: string, icon: (props: { focused: boolean }) => React.ReactNode, screen: any, { headerShown = true } = {}) => {
  return (
    <Tab.Screen
      name={label}
      component={screen}
      options={({ navigation }) => ({
        headerShown,
        /*  @ts-ignore */
        header: () => <View style={{ height: 28 }} />,
        tabBarLabel: ({ focused }) => (
          <AppText
            style={[styles.tabLabel, { color: focused ? AppColors.white : AppColors.secondaryColor, fontWeight: focused ? "bold" : "normal" }]}>
            {label}
          </AppText>
        ),
        tabBarIcon: icon,
        tabBarActiveBackgroundColor: AppColors.secondaryColor,
        tabBarItemStyle: { margin: 5, borderRadius: 18 }
      })}
    />
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    ...AppDimensions.bottomBar,
    backgroundColor: AppColors.white,
    position: "absolute",
    overflow: "hidden",
    alignItems: "stretch",
    paddingBottom: 0 // ios layout
  },
  tabLabel: {
    fontSize: 12,
    position: "relative",
    bottom: 2
  }
});

export const useBottomBarStyle = () => {
  const insets = useSafeAreaInsets();
  return [
    styles.bottomBar,
    {
      marginBottom: insets.bottom + AppDimensions.bottomBar.margin
    }
  ];
};

export default Navigation;
