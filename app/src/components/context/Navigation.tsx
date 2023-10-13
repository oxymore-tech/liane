import React, { useContext } from "react";
import { createNativeStackNavigator, NativeStackHeaderProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { WithBadge } from "@/components/base/WithBadge";

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

import { AppColorPalettes, AppColors } from "@/theme/colors";

import { useObservable } from "@/util/hooks/subscription";
import { AppStyles } from "@/theme/styles";
import { Row } from "@/components/base/AppLayout";
import { NavigationScreenTitles } from "@/api/navigation";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { CommunitiesScreen } from "@/screens/communities/CommunitiesScreen";
import NotificationScreen from "@/screens/notifications/NotificationScreen";

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
        ({ focused }) => {
          return <BadgeTabIcon iconName={"calendar"} focused={focused} size={iconSize} value={notificationCount} />;
        },
        MyTripsScreen,
        { headerShown: false } //TODO generic header ?
      )}
      {makeTab(
        "Communautés",
        ({ focused }) => {
          return <TabIcon iconName={"people-outline"} focused={focused} size={iconSize} />;
        },
        CommunitiesScreen
      )}
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user } = useContext(AppContext);

  if (user) {
    return (
      <Stack.Navigator
        initialRouteName={"Home"}
        screenOptions={{ header: PageHeader, contentStyle: { backgroundColor: AppColors.lightGrayBackground } }}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="ArchivedTrips" component={ArchivedTripsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
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
        <Stack.Screen name="Notifications" component={NotificationScreen} />
      </Stack.Navigator>
    );
  }
  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

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
      options={() => ({
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

export const PageHeader = (props: { title?: string | undefined } & Partial<NativeStackHeaderProps>) => {
  const insets = useSafeAreaInsets();
  // @ts-ignore
  const defaultName = props.route?.name ? NavigationScreenTitles[props.route.name] || "" : "";
  return (
    <Row style={{ paddingTop: insets.top + 16, padding: 16, backgroundColor: AppColors.white }} spacing={24}>
      <AppPressableIcon name={"arrow-ios-back-outline"} color={AppColors.primaryColor} size={32} onPress={() => props.navigation?.goBack()} />
      <AppText style={{ fontSize: 20, fontWeight: "bold", color: AppColors.primaryColor }}>{props.title || defaultName}</AppText>
    </Row>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    itemSpacing: 16,
    margin: 0,
    backgroundColor: AppColors.white,
    overflow: "hidden",
    alignItems: "stretch",
    paddingBottom: 0 // ios layout
  },
  tabLabel: {
    fontSize: 12,
    position: "relative",
    bottom: 2
  },
  headerContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 8,
    marginRight: 16
  },
  filterContainer: {
    height: 50,
    backgroundColor: AppColors.primaryColor,
    borderRadius: 18,
    paddingVertical: 4,
    paddingLeft: 4
  }
});

export const useBottomBarStyle = () => {
  const insets = useSafeAreaInsets();
  return [
    styles.bottomBar,
    AppStyles.shadow,
    {
      paddingBottom: insets.bottom,
      minHeight: insets.bottom + 54
    }
  ];
};

export default Navigation;
