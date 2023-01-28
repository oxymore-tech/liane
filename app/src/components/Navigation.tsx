import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import EmptyScreen from "@/screens/EmptyScreen";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import HomeScreen from "@/screens/HomeScreen";
import { AppText } from "@/components/base/AppText";
import MyTripsScreen from "@/screens/MyTripsScreen";
import LianeIcon from "@/assets/icon.svg";
import { LianeModalScreen } from "@/screens/lianeWizard/LianeModalScreen";
import { LianeDetailScreen } from "@/screens/LianeDetailScreen";
import SignUpScreen from "@/screens/signUp/SignUpScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const insets = useSafeAreaInsets();
  // const { authUser } = useContext(AppContext);
  const iconSize = 24;
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: [
          styles.bottomBar,
          {
            marginBottom: insets.bottom + AppDimensions.bottomBar.marginVertical
          }
        ],
        tabBarShowLabel: false
      }}>
      {makeTab("Rechercher", "search-outline", HomeScreen, iconSize, {
        headerShown: false
      })}
      {makeTab("Mes trajets", LianeIcon, MyTripsScreen, (iconSize * 4) / 3)}
      {makeTab("Notifications", "bell-outline", EmptyScreen, iconSize)}
    </Tab.Navigator>
  );
}

function Navigation() {
  const { authUser } = useContext(AppContext);

  if (authUser) {
    return (
      <Stack.Navigator initialRouteName={"Home"}>
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="LianeWizard" component={LianeModalScreen} options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="LianeDetail" component={LianeDetailScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const makeTab = (label: string, iconName: IconName | React.FunctionComponent, screen: any, iconSize: number = 24, { headerShown = true } = {}) => (
  <Tab.Screen
    name={label}
    component={screen}
    options={{
      headerShown,
      headerStyle: { backgroundColor: "#00000000" },
      headerShadowVisible: false,
      tabBarLabel: ({ focused }) => (
        <AppText style={[styles.tabLabel, { color: focused ? AppColors.white : AppColorPalettes.blue[400] }]}>{label}</AppText>
      ),
      tabBarIcon: ({ focused }) =>
        typeof iconName === "string" ? (
          <AppIcon size={iconSize} name={iconName} color={focused ? AppColors.white : AppColorPalettes.blue[400]} />
        ) : (
          iconName({
            color: focused ? AppColors.white : AppColorPalettes.blue[400],
            height: iconSize,
            width: iconSize
          })
        ) // TODO resize svg file directly
    }}
  />
);

const styles = StyleSheet.create({
  bottomBar: {
    backgroundColor: AppColorPalettes.blue[700],
    position: "absolute",
    overflow: "hidden",
    alignItems: "stretch",
    height: AppDimensions.bottomBar.height,
    marginHorizontal: AppDimensions.bottomBar.marginHorizontal,
    borderRadius: AppDimensions.bottomBar.borderRadius,
    paddingBottom: 0 // ios layout
  },
  tabLabel: {
    fontSize: AppDimensions.textSize.small,
    fontWeight: "400",
    marginBottom: 8
  }
});

// Wrap Component to allow bottom sheets scrolling on Android
// gestureHandlerRootHOC(
export default Navigation;
