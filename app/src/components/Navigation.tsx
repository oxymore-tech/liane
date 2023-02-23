import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import NotificationScreen from "@/screens/NotificationScreen";
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
import { LianeMatchDetailScreen } from "@/screens/LianeMatchDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Home() {
  const insets = useSafeAreaInsets();
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
      {makeTab("Notifications", "bell-outline", NotificationScreen, iconSize)}
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user } = useContext(AppContext);

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
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LianeMatchDetail" component={LianeMatchDetailScreen} options={{ headerShown: false }} />
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

const makeTab = (label: string, iconName: IconName | React.FunctionComponent, screen: any, iconSize: number = 24, { headerShown = true } = {}) => (
  <Tab.Screen
    name={label}
    component={screen}
    options={({ navigation }) => ({
      headerShown,
      header: () => <HomeScreenHeader label={label} navigation={navigation} />,
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
    })}
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
