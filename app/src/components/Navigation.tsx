import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import NotificationScreen, { NotificationQueryKey } from "@/screens/notifications/NotificationScreen";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { AppText } from "@/components/base/AppText";
import MyTripsScreen from "@/screens/MyTripsScreen";
import LianeIcon from "@/assets/icon.svg";
import { LianeDetailScreen } from "@/screens/LianeDetailScreen";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
import { LianeInvitationScreen } from "@/screens/LianeInvitationScreen";
import { Row } from "@/components/base/AppLayout";
import Avatar from "@/assets/avatar.svg";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { SearchScreen } from "@/screens/search/SearchScreen";
import HomeScreen from "@/screens/HomeScreen";
import { LianeWizardScreen } from "@/screens/lianeWizard/LianeWizardScreen";
import { SearchResultsScreen } from "@/screens/search/SearchResultsScreen";
import { LianeMatchDetailScreen } from "@/screens/search/LianeMatchDetailScreen";
import { WithBadge } from "@/components/base/WithBadge";
import { RequestJoinScreen } from "@/screens/search/RequestJoinScreen";
import { useObservable } from "@/util/hooks/subscription";
import { getNotificationNavigation, RootNavigation } from "@/api/navigation";
import { OpenJoinRequestScreen } from "@/screens/OpenJoinRequestScreen";
import { LianeJoinRequestDetailScreen } from "@/screens/search/LianeJoinRequestDetailScreen";
import { useQueryClient } from "react-query";
import { Notification } from "@/api";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const { services } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount);
  const iconSize = 24;
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: useBottomBarStyle(),
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true
      }}>
      {makeTab(
        "Rechercher",
        ({ focused }) => (
          <TabIcon iconName={"search-outline"} focused={focused} size={iconSize} />
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
          services.chatHub.subscribeToNotifications(async (n: Notification) => {
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
    const initialNotification = services.notification.initialNotification();
    if (user && initialNotification) {
      // check if app was opened by a notification
      const navigate = getNotificationNavigation(initialNotification);
      if (navigate) {
        navigate(RootNavigation);
      }
    }
  }, [user?.id, services.notification]);

  if (user) {
    return (
      <Stack.Navigator initialRouteName={"Home"}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="LianeWizard" component={LianeWizardScreen} options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="LianeDetail" component={LianeDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LianeInvitation" component={LianeInvitationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="RequestJoin" component={RequestJoinScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenJoinLianeRequest" component={OpenJoinRequestScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LianeMatchDetail" component={LianeMatchDetailScreen} options={{ headerShown: false }} />
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
  navigation: any; //TODO
};

const HomeScreenHeader = ({ label, navigation }: HomeScreenHeaderProp) => {
  const insets = useSafeAreaInsets();
  return (
    <Row
      style={{
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 32,
        minHeight: 60,
        marginTop: insets.top
      }}>
      <AppText style={{ fontSize: 22, fontWeight: "500", color: AppColors.darkBlue }}>{label}</AppText>
      <Pressable
        onPress={() => {
          navigation.navigate("Profile");
        }}>
        <Avatar height={36} />
      </Pressable>
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
  return typeof iconName === "string" ? (
    <AppIcon size={size} name={iconName} color={focused ? AppColors.white : AppColorPalettes.blue[400]} />
  ) : (
    iconName({
      color: focused ? AppColors.white : AppColorPalettes.blue[400],
      height: size,
      width: size
    })
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
        header: () => <HomeScreenHeader label={label} navigation={navigation} />,
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
    marginBottom: 8
  }
});

// Wrap Component to allow bottom sheets scrolling on Android
// gestureHandlerRootHOC(
export default Navigation;
