import React, { useContext, useState } from "react";
import { createNativeStackNavigator, NativeStackHeaderProps } from "@react-navigation/native-stack";
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { WithBadge } from "@/components/base/WithBadge";
import { ArchivedTripsScreen } from "@/screens/user/ArchivedTripsScreen";
import { OpenValidateTripScreen } from "@/screens/modals/OpenValidateTripScreen";
import { SettingsScreen } from "@/screens/user/SettingsScreen";
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

import { useObservable } from "@liane/common";
import { AppStyles } from "@/theme/styles";
import { Row } from "@/components/base/AppLayout";
import { NavigationScreenTitles, useAppNavigation } from "@/api/navigation";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { CommunitiesScreen } from "@/screens/communities/CommunitiesScreen";
import NotificationScreen from "@/screens/notifications/NotificationScreen";
import { TripGeolocationWizard } from "@/screens/home/TripGeolocationWizard";
import { UserPicture } from "@/components/UserPicture";
import { NavigationState, ParamListBase, PartialState, Route } from "@react-navigation/native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const Button = () => {
  const [showButtonLabel, setShowButtonLabel] = useState(false);
  const { width } = useAppWindowsDimensions();
  const { navigation } = useAppNavigation();
  return (
    <View style={{ position: "relative", top: -8 }}>
      {showButtonLabel && (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={{ position: "absolute", top: -40, left: -width / 2 + 28, width }}>
          <View
            style={[
              {
                paddingVertical: 2,
                paddingHorizontal: 8,
                backgroundColor: AppColors.primaryColor,
                borderRadius: 4,
                flexShrink: 1,
                alignSelf: "center"
              },
              AppStyles.shadow
            ]}>
            <AppText style={{ color: AppColors.white, fontWeight: "bold", fontSize: 16 }}>Créer une Liane</AppText>
          </View>
        </Animated.View>
      )}
      <AppPressableIcon
        onTouchStart={() => setShowButtonLabel(true)}
        onTouchEnd={() => setShowButtonLabel(false)}
        onTouchCancel={() => setShowButtonLabel(false)}
        size={32}
        color={AppColors.white}
        onPress={() => navigation.navigate("Publish", {})}
        name={"plus-outline"}
        style={{ padding: 12 }}
        backgroundStyle={{ borderRadius: 24, backgroundColor: AppColors.primaryColor }}
      />
    </View>
  );
};
const ButtonTabBar = ({ state, descriptors, navigation, insets }: BottomTabBarProps) => {
  const buildItem = (
    r: Route<Extract<string, string>, ParamListBase[string]> & { state?: NavigationState | PartialState<NavigationState> },
    i: number
  ) => {
    const { options } = descriptors[r.key];
    const Icon = options.tabBarIcon;
    const Label = options.tabBarLabel;
    const focused = state.index === i;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: r.key,
        canPreventDefault: true
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(r.name);
      }
    };

    return (
      <View key={r.name} style={{ flex: 1 }}>
        <AppPressableOverlay
          backgroundStyle={{ borderRadius: 4 }}
          style={[{ backgroundColor: focused ? options.tabBarActiveBackgroundColor : undefined }, options.tabBarItemStyle]}
          onPress={onPress}>
          {/*@ts-ignore*/}
          {Icon && <Icon focused={focused} />}
          {/*@ts-ignore*/}
          {Label && !(Label instanceof String) && <Label focused={focused} />}
        </AppPressableOverlay>
      </View>
    );
  };

  return (
    <Row style={[{ paddingBottom: insets.bottom, justifyContent: "space-evenly", backgroundColor: AppColors.white }, AppStyles.shadow]}>
      {state.routes.slice(0, 2).map((r, i) => buildItem(r, i))}
      <Button />
      {state.routes.slice(2, 4).map((r, i) => buildItem(r, i + 2))}
    </Row>
  );
};
function Home() {
  const { services, user } = useContext(AppContext);
  const notificationCount = useObservable<number>(services.notification.unreadNotificationCount, 0);
  const iconSize = 24;
  return (
    <Tab.Navigator
      tabBar={ButtonTabBar}
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
        "Communauté",
        ({ focused }) => {
          return <TabIcon iconName={"people-outline"} focused={focused} size={iconSize} />;
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
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RequestJoin" component={RequestJoinScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenJoinLianeRequest" component={OpenJoinRequestScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="OpenValidateTrip" component={OpenValidateTripScreen} options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen
          name="TripGeolocationWizard"
          component={TripGeolocationWizard}
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
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
    <Row style={{ paddingTop: insets.top + 16, padding: 16, backgroundColor: AppColors.white }} spacing={24}>
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
