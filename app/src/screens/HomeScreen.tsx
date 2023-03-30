import { Pressable, StyleSheet, View } from "react-native";
import React, { useContext, useState } from "react";
import AppMapView from "@/components/map/AppMapView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppStyles } from "@/theme/styles";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes } from "@/theme/colors";
import { PositionButton } from "@/components/map/PositionButton";
import { LatLng } from "@/api";
import { AppContext } from "@/components/ContextProvider";

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const insets = useSafeAreaInsets();
  const navigateToSearch = () => {
    navigation.navigate("Search");
  };
  const { services } = useContext(AppContext);
  const [position, setCurrentPosition] = useState<LatLng>(services.location.getLastKnownLocation());

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <AppMapView position={position} />
      </View>

      <View style={[styles.floatingSearchBar, { marginTop: insets.top }]}>
        <Pressable style={AppStyles.inputBar} onPress={navigateToSearch}>
          <AppTextInput
            style={AppStyles.input}
            leading={<AppIcon name={"search-outline"} color={AppColorPalettes.gray[400]} />}
            trailing={
              <PositionButton
                onPosition={currentLocation => {
                  setCurrentPosition(currentLocation);
                }}
              />
            }
            editable={false}
            placeholder={"Trouver une Liane"}
            onPressIn={navigateToSearch}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default HomeScreen;
const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    height: "100%",
    width: "100%",
    flex: 1
  },
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  }
});
