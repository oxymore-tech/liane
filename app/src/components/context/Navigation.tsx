import React, { useContext, useEffect } from "react";
import { createNativeStackNavigator, NativeStackHeaderProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useNavigation } from "@react-navigation/native";
import { Row } from "@/components/base/AppLayout";
import { AppContext } from "@/components/context/ContextProvider";
import HomeScreen from "@/screens/home/HomeScreen";
import TripScheduleScreen from "@/screens/user/TripScheduleScreen";
import { CommunitiesScreen } from "@/screens/communities/CommunitiesScreen";
import { UserPicture } from "@/components/UserPicture";
import { ProfileScreen } from "@/screens/user/ProfileScreen";
import { ArchivedTripsScreen } from "@/screens/user/ArchivedTripsScreen";
import { SettingsScreen } from "@/screens/user/SettingsScreen";
import { PublishScreen } from "@/screens/publish/PublishScreen";
import { TripDetailScreen } from "@/screens/detail/TripDetailScreen.tsx";
import { LianeTripDetailScreen } from "@/screens/communities/LianeTripDetail.tsx";
import { CommunitiesChatScreen } from "@/screens/communities/CommunitiesChatScreen";
import { CommunitiesDetailScreen } from "@/screens/communities/CommunitiesDetailScreen";
import { LianeMapDetailScreen } from "@/screens/communities/LianeMapDetail.tsx";
import { TripGeolocationWizard } from "@/screens/home/TripGeolocationWizard";
import { ProfileEditScreen } from "@/screens/user/ProfileEditScreen";
import { AccountScreen } from "@/screens/user/AccountScreen";
import { RallyingPointRequestsScreen } from "@/screens/user/RallyingPointRequestsScreen";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { WithBadge } from "@/components/base/WithBadge";
import { MatchListScreen } from "@/screens/communities/MatchListScreen.tsx";
import { useObservable } from "@/util/hooks/subscription.ts";
import { map } from "rxjs";
import { AppPressableIcon } from "@/components/base/AppPressable.tsx";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const { services, user, refreshUser } = useContext(AppContext);
  const notifications = useObservable<number>(services.realTimeHub.unreadNotifications.pipe(map(n => Object.entries(n).length)), 0);

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
        tabBarHideOnKeyboard: true,
        animation: "fade",
      }}>
      {makeTab(
        "Explorer",
        ({ focused }) => (
          <TabIcon iconName={"map-outline"} focused={focused} size={iconSize} />
        ),
        HomeScreen
      )}
      {makeTab(
        "Lianes",
        ({ focused }) => {
          return <BadgeTabIcon iconName="liane" focused={focused} size={iconSize} value={notifications} />;
        },
        CommunitiesScreen
      )}
      {makeTab(
        "Calendrier",
        ({ focused }) => {
          return <TabIcon iconName="calendar" focused={focused} size={iconSize} />;
        },
        TripScheduleScreen
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
      <Stack.Navigator initialRouteName={"Home"} screenOptions={{ header: EmptyPageHeader }}>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="ArchivedTrips" component={ArchivedTripsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Publish" component={PublishScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        <Stack.Screen name="CommunitiesChat" component={CommunitiesChatScreen} />
        <Stack.Screen name="LianeMapDetail" component={LianeMapDetailScreen} />
        <Stack.Screen name="LianeTripDetail" component={LianeTripDetailScreen} />
        <Stack.Screen name="CommunitiesDetails" component={CommunitiesDetailScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
        <Stack.Screen
          name="TripGeolocationWizard"
          component={TripGeolocationWizard}
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="RallyingPointRequests" component={RallyingPointRequestsScreen} />
        <Stack.Screen name="MatchList" component={MatchListScreen} />
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
    <View >
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
        headerShown: false,
        tabBarLabel: ({ focused }) => (
          <AppText
            style={[
              styles.tabLabel,
              { color: focused ? AppColors.secondaryColor : AppColorPalettes.gray[500], fontWeight: focused ? "bold" : "normal" }
            ]}>
            {label}
          </AppText>
        ),
        tabBarIcon: icon
      })}
    />
  );
};

export const EmptyPageHeader = (props: { title?: string | undefined; goBack?: () => void } & Partial<NativeStackHeaderProps>) => {
  const insets = useSafeAreaInsets();
  return <Row style={[styles.header, { paddingTop: insets.top }]} />;
};

export const PageHeader = (props: { title?: string | undefined; goBack?: () => void } & Partial<NativeStackHeaderProps>) => {
  // @ts-ignore
  const defaultName = props.route?.name ? NavigationScreenTitles[props.route.name] || "" : "";
  return (
    <Row style={[styles.header, { paddingTop: 16 }]} spacing={24}>
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
    paddingBottom: 8,
    backgroundColor: AppColors.white,
    alignItems: "center"
  },
  tabLabel: {
    marginBottom: 0,
    fontSize: 14
  }
});

export const useBottomBarStyle = () => {
  const insets = useSafeAreaInsets();
  return [
    AppStyles.shadow,
    {
      paddingTop: 8,
      paddingBottom: Math.min(insets.bottom, 16),
      minHeight: insets.bottom + 70
    }
  ];
};

export default Navigation;
