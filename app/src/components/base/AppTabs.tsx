import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { ColorValue, View } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import React from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export interface AppTabsProps {
  items: string[];
  onSelect: (index: number) => void;
  selectedColor?: ColorValue;
  unselectedTextColor?: ColorValue;
  selectedTextColor?: ColorValue;
  selectedIndex?: number;
  isSelectable?: ((index: number) => boolean) | undefined;
}

export const AppTabs = ({
  items,
  selectedIndex = 0,
  isSelectable,
  selectedColor = AppColors.orange,
  onSelect,
  unselectedTextColor = AppColorPalettes.gray[800],
  selectedTextColor = AppColorPalettes.gray[800]
}: AppTabsProps) => {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const translateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: offset.value
      }
    ],
    width: width.value
  }));

  return (
    <Column>
      <Row>
        {items.map((item, index) => {
          return (
            <AppPressableOverlay
              disabled={isSelectable ? !isSelectable(index) : false}
              onLayout={event => {
                if (index === selectedIndex) {
                  width.value = withTiming(event.nativeEvent.layout.width, {
                    duration: 300,
                    easing: Easing.out(Easing.exp)
                  });
                  offset.value = withTiming(event.nativeEvent.layout.x, {
                    duration: 300,
                    easing: Easing.out(Easing.ease)
                  });
                }
              }}
              onPress={() => onSelect(index)}>
              <AppText
                style={{
                  paddingHorizontal: 24,
                  fontWeight: selectedIndex === index ? "bold" : undefined,
                  paddingVertical: 16,
                  color: selectedIndex === index ? selectedTextColor : unselectedTextColor
                }}>
                {item}
              </AppText>
            </AppPressableOverlay>
          );
        })}
      </Row>
      <View style={{ borderBottomColor: AppColorPalettes.gray[200], borderBottomWidth: 1 }} />
      <Animated.View style={[{ borderRadius: 2, height: 4, backgroundColor: selectedColor, position: "relative", top: -3 }, translateStyle]} />
    </Column>
  );
};
