import React, { PropsWithChildren, useState } from "react";
import Svg, { Path } from "react-native-svg";
import { ColorValue, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomOptionBgProps extends PropsWithChildren {
  color: ColorValue;
  childWidth?: number;
}
export const BottomOptionBg = ({ color, childWidth = 104, children }: BottomOptionBgProps) => {
  const [childViewWidth, setChildViewWidth] = useState<number>(childWidth);
  const { width } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const bgHeight = bottom + 72;

  const d = 56 - childViewWidth;
  console.log(
    childViewWidth,
    width,
    bgHeight,
    d,
    `M${width} ${bgHeight}V0.5H${344.5 + d}C${294.5 + d} 0.499992 ${299.374 + d} 36.5 ${278.5 + d} 36.5H60.5H0V${bgHeight}H${width}Z`
  );

  return (
    <View style={{ position: "absolute", bottom: 0, left: 0, width: "100%" }}>
      <Svg width={width} height={(bgHeight * width) / width} viewBox={`0 0 ${width} ${bgHeight}`} fill="none">
        <Path
          d={`M${width} ${bgHeight}V0.5H${344.5 + d}C${294.5 + d} 0.499992 ${299.374 + d} 36.5 ${278.5 + d} 36.5H60.5H0V${bgHeight}H${width}Z`}
          fill={color}
        />
      </Svg>
      <View
        style={{ position: "absolute", top: 0, right: 0, marginHorizontal: 12, marginVertical: 8 }}
        onLayout={event => {
          setChildViewWidth(event.nativeEvent.layout.width);
        }}>
        {children}
      </View>
    </View>
  );
};
