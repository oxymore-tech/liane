import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import NotificationScreen, { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { AppText } from "@/components/base/AppText";
import MyTripsScreen from "@/screens/user/MyTripsScreen";
import LianeIcon from "@/assets/icon.svg";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
//import { LianeInvitationScreen } from "@/screens/LianeInvitationScreen";
import { Row } from "@/components/base/AppLayout";
import { ProfileScreen } from "@/screens/user/ProfileScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import HomeScreen from "@/screens/home/HomeScreen";
import { WithBadge } from "@/components/base/WithBadge";
import { RequestJoinScreen } from "@/screens/search/RequestJoinScreen";
import { useObservable } from "@/util/hooks/subscription";
import { getNotificationNavigation, RootNavigation, useAppNavigation } from "@/api/navigation";
import { OpenJoinRequestScreen } from "@/screens/modals/OpenJoinRequestScreen";
import { useQueryClient } from "react-query";
import { PublishScreen } from "@/screens/publish/PublishScreen";
import { LianeDetailScreen, LianeJoinRequestDetailScreen } from "@/screens/detail/LianeDetailScreen";
import { Notification } from "@/api/notification";
import { ArchivedTripsScreen } from "@/screens/user/ArchivedTripsScreen";
import { UserPicture } from "@/components/UserPicture";
import { OpenValidateTripScreen } from "@/screens/modals/OpenValidateTripScreen";
import { AppStatusBar } from "@/components/base/AppStatusBar";
import { SettingsScreen } from "@/screens/user/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/*
function AppTabBar(props: BottomTabBarProps) {
  // const [show, setShow] = useState(true);
  const style = props.descriptors[props.state.routes[props.state.index].key].options.tabBarStyle;
  const display = !style || StyleSheet.flatten(style).display !== "none";
  if (StyleSheet.flatten(style).display === "none") {
    props.descriptors[props.state.routes[props.state.index].key].options.tabBarStyle = {
      ...StyleSheet.flatten(style),
      display: undefined
    };
  }
  return (
    display && (
      <Animated.View exiting={SlideOutDown}>
        <BottomTabBar {...props} />
      </Animated.View>
    )
  );
}
*/
function Home() {
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const iconSize = 24;
  return (
    <Tab.Navigator
      // TODO tabBar={AppTabBar}
      screenOptions={{
        tabBarStyle: useBottomBarStyle(),
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true
      }}>
      {makeTab(
        "Carte",
        ({ focused }) => (
          <TabIcon iconName={"map-outline"} focused={focused} size={iconSize} />
        ),
        HomeScreen,
        {
          headerShown: false
        }
      )}
      {makeTab(
        "Mes trajets",
        ({ focused }) => (
          <TabIcon iconName={LianeIcon} focused={focused} size={(iconSize * 4) / 3} />
        ),
        MyTripsScreen
      )}
      {makeTab(
        "Notifications",
        ({ focused }) => {
          const queryClient = useQueryClient();
          services.chatHub.subscribeToNotifications(async (_: Notification) => {
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
  const { user, services } = useContext(AppContext);

  useEffect(() => {
    const initialNotification = services.notification.getInitialNotification();
    if (user && initialNotification) {
      // check if app was opened by a notification
      const navigate = getNotificationNavigation(initialNotification);
      if (navigate) {
        navigate(RootNavigation);
      }
    }
  }, [services.notification, user]);

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
        <Stack.Screen name="RequestJoin" component={RequestJoinScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenJoinLianeRequest" component={OpenJoinRequestScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenValidateTrip" component={OpenValidateTripScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="LianeJoinRequestDetail" component={LianeJoinRequestDetailScreen} options={{ headerShown: false }} />
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
};

const PageTitle = ({ title }: { title: string }) => <AppText style={{ fontSize: 22, fontWeight: "500", color: AppColors.darkBlue }}>{title}</AppText>;

export const HomeScreenHeader = ({ label, isRootHeader = false }: HomeScreenHeaderProp) => {
  const insets = useSafeAreaInsets();
  const { navigation } = useAppNavigation();
  const { user } = useContext(AppContext);
  return (
    <Row
      style={{
        justifyContent: isRootHeader ? "space-between" : "flex-start",
        alignItems: "center",
        paddingHorizontal: isRootHeader ? 24 : 0,
        paddingTop: isRootHeader ? 12 : 0,
        paddingBottom: 32,
        minHeight: 60,
        marginTop: insets.top
      }}>
      <AppStatusBar style="dark-content" />
      {!isRootHeader && (
        <Pressable
          style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          onPress={() => {
            navigation.goBack();
          }}>
          <AppIcon name={"arrow-ios-back-outline"} color={AppColors.darkBlue} />
        </Pressable>
      )}
      <PageTitle title={label} />
      {isRootHeader && (
        <Pressable
          onPress={() => {
            // @ts-ignore
            navigation.navigate("Profile", { user });
          }}>
          <UserPicture size={36} url={user?.pictureUrl} id={user?.id} />
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
        <AppIcon size={size} name={iconName} color={focused ? AppColors.white : AppColorPalettes.blue[400]} />
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
        header: () => <HomeScreenHeader label={label} navigation={navigation} isRootHeader={true} />,
        tabBarLabel: ({ focused }) => (
          <AppText style={[styles.tabLabel, { color: focused ? AppColors.white : AppColorPalettes.blue[400] }]}>{label}</AppText>
        ),
        tabBarIcon: icon
      })}
    />
  );
};

const BottomBarStyle = {
  backgroundColor: AppColorPalettes.blue[700],
  position: "absolute",
  overflow: "hidden",
  alignItems: "stretch",
  height: AppDimensions.bottomBar.height,
  marginHorizontal: AppDimensions.bottomBar.marginHorizontal,
  borderRadius: AppDimensions.bottomBar.borderRadius,
  paddingBottom: 0 // ios layout
} as const;

export const useBottomBarStyle = () => {
  const insets = useSafeAreaInsets();
  return [
    styles.bottomBar,
    {
      marginBottom: insets.bottom + AppDimensions.bottomBar.marginVertical
    }
  ];
};

const styles = StyleSheet.create({
  bottomBar: BottomBarStyle,
  tabLabel: {
    fontSize: AppDimensions.textSize.small,
    fontWeight: "400",
    position: "relative",
    bottom: 12
    // marginBottom: 8
  }
});

export default Navigation;
