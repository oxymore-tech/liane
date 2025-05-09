import React, { PropsWithChildren, useContext, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";

// @ts-ignore
const AppWindowsDimensionsContext = React.createContext<{ width: number; height: number }>();

export const useAppWindowsDimensions = () => {
  return useContext<{ width: number; height: number }>(AppWindowsDimensionsContext);
};

export const AppWindowsSizeProvider = (props: PropsWithChildren) => {
  const d = useWindowDimensions();
  //console.debug(initialWindowMetrics?.insets, StatusBar.currentHeight, Dimensions.get("screen").height, Dimensions.get("window").height, d.height);
  const [dimensions, setDimensions] = useState(d);
  return (
    <View
      onLayout={
        Platform.OS === "android"
          ? event => {
              // Needed to correctly siez window on some android devices
              const { width, height } = event.nativeEvent.layout;

              setDimensions({ ...dimensions, width, height });
            }
          : undefined
      }
      style={[
        {
          top: 0,
          // borderColor: "red",
          // borderWidth: 2,
          left: 0,
          right: 0,
          bottom: 0,
          flex: 1,
          position: "absolute"
        }
      ]}>
      <AppWindowsDimensionsContext.Provider value={dimensions}>{props.children}</AppWindowsDimensionsContext.Provider>
    </View>
  );
};
