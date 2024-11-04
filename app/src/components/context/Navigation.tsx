import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator, NativeStackHeaderProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationScreenTitles } from "@/components/context/routing";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { AppPressableIcon } from "@/components/base/AppPressable";
import { useNavigation } from "@react-navigation/native";
import { Row } from "@/components/base/AppLayout";
import { AppContext } from "@/components/context/ContextProvider";
import HomeScreen from "@/screens/home/HomeScreen";
import MyTripsScreen from "@/screens/user/MyTripsScreen";
import { CommunitiesScreen } from "@/screens/communities/CommunitiesScreen";
import { UserPicture } from "@/components/UserPicture";
import { ProfileScreen } from "@/screens/user/ProfileScreen";
import { ArchivedTripsScreen } from "@/screens/user/ArchivedTripsScreen";
import { SettingsScreen } from "@/screens/user/SettingsScreen";
import { PublishScreen } from "@/screens/publish/PublishScreen";
import { LianeDetailScreen } from "@/screens/detail/LianeDetailScreen";
import { LianeTripDetailScreen } from "@/screens/communities/LianeTripDetail.tsx";
import { CommunitiesChatScreen } from "@/screens/communities/CommunitiesChatScreen";
import { CommunitiesDetailScreen } from "@/screens/communities/CommunitiesDetailScreen";
import { LianeMapDetailScreen } from "@/screens/communities/LianeMapDetail.tsx";
import { TripGeolocationWizard } from "@/screens/home/TripGeolocationWizard";
import { ProfileEditScreen } from "@/screens/user/ProfileEditScreen";
import { AccountScreen } from "@/screens/user/AccountScreen";
import NotificationScreen from "@/screens/notifications/NotificationScreen";
import { RallyingPointRequestsScreen } from "@/screens/user/RallyingPointRequestsScreen";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { WithBadge } from "@/components/base/WithBadge";
import { MatchListScreen } from "@/screens/communities/MatchListScreen.tsx";
import { useObservable } from "@/util/hooks/subscription.ts";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const { services, user, refreshUser } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const notificationHub = useObservable<string[]>(services.realTimeHub.unreadNotifications, []);

  const iconSize = 24;

  const navigation = useNavigation();

  useEffect(() => {
    return navigation.addListener("state", _ => {
      //Security to ensure that we always have a token
      return refreshUser();
    });
  }, [navigation, refreshUser]);

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
        "Calendrier",
        ({ focused }) => {
          return <TabIcon iconName="calendar" focused={focused} size={iconSize} />;
        },
        MyTripsScreen,
        { headerShown: false }
      )}
      {makeTab(
        "Lianes",
        ({ focused }) => {
          return <BadgeTabIcon iconName="liane" focused={focused} size={iconSize} value={Math.max(notificationCount, notificationHub.length)} />;
        },
        CommunitiesScreen
      )}
      {makeTab(
        "Vous",
        ({ focused }) => {
          return (
            <UserPicture
              size={iconSize}
              url={user?.pictureUrl}
              id={user?.id}
              borderWidth={1}
              borderColor={focused ? AppColors.secondaryColor : AppColorPalettes.gray[400]}
            />
          );
        },
        ProfileScreen
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
        <Stack.Screen name="CommunitiesChat" component={CommunitiesChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LianeMapDetail" component={LianeMapDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LianeTripDetail" component={LianeTripDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CommunitiesDetails" component={CommunitiesDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="TripGeolocationWizard"
          component={TripGeolocationWizard}
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} />
        <Stack.Screen name="RallyingPointRequests" component={RallyingPointRequestsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MatchList" component={MatchListScreen} options={{ headerShown: false }} />
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
        <AppIcon size={size} name={iconName} color={focused ? AppColors.secondaryColor : AppColorPalettes.gray[400]} />
      ) : (
        iconName({
          color: focused ? AppColors.secondaryColor : AppColorPalettes.gray[400],
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
        header: () => <View style={{ height: 0 }} />,
        tabBarLabel: ({ focused }) => (
          <AppText
            style={[
              styles.tabLabel,
              { color: focused ? AppColors.secondaryColor : AppColorPalettes.gray[500], fontWeight: focused ? "bold" : "normal" }
            ]}>
            {label}
          </AppText>
        ),
        tabBarIcon: icon,
        // tabBarActiveBackgroundColor: AppColors.secondaryColor,
        tabBarItemStyle: { paddingHorizontal: 2, alignSelf: "center", alignItems: "center", rowGap: 2, paddingVertical: 4 }
      })}
    />
  );
};

export const PageHeader = (props: { title?: string | undefined; goBack?: () => void } & Partial<NativeStackHeaderProps>) => {
  const insets = useSafeAreaInsets();
  // @ts-ignore
  const defaultName = props.route?.name ? NavigationScreenTitles[props.route.name] || "" : "";
  return (
    <Row style={[styles.header, { paddingTop: insets.top + 16 }]} spacing={24}>
      <AppPressableIcon
        name={"arrow-ios-back-outline"}
        color={AppColors.primaryColor}
        size={32}
        onPress={props.goBack || (() => props.navigation?.goBack())}
      />
      <AppText style={{ fontSize: 20, fontWeight: "bold", color: AppColors.primaryColor }}>{props.title || defaultName}</AppText>
    </Row>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: AppColors.white,
    alignItems: "center"
  },
  bottomBar: {
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
