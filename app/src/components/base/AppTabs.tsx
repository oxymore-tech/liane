import React from "react";
import { ColorValue, LayoutChangeEvent, StyleSheet } from "react-native";
import { Easing, SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

import { Column, Row } from "@/components/base/AppLayout";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";

import { AppColorPalettes, AppColors } from "@/theme/colors";

export interface AppTabsProps {
  items: string[];
  onSelect: (index: number) => void;
  selectedColor?: ColorValue;
  unselectedTextColor?: ColorValue;
  selectedTextColor?: ColorValue;
  selectedIndex?: number;
  isSelectable?: ((index: number) => boolean) | undefined;
  fontSize?: number;
}

export const AppTabs = ({
  items,
  isSelectable,
  onSelect,
  selectedIndex = 0,
  selectedColor = AppColors.primaryColor,
  fontSize = 14
}: AppTabsProps) => {
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  return (
    <Column style={styles.mainContainer}>
      <Row style={styles.rowContainer} spacing={4}>
        {items.map((item, index) => (
          <AppPressableOverlay
            key={index}
            backgroundStyle={[
              styles.pressableStyle,
              selectedIndex === index ? { backgroundColor: selectedColor } : { borderWidth: 1, borderColor: AppColors.fontColor }
            ]}
            disabled={isSelectable ? !isSelectable(index) : false}
            onLayout={event => onLayout(event, index, selectedIndex, width, offset)}
            onPress={() => onSelect(index)}>
            <AppText
              style={[
                styles.textStyle,
                { fontSize: fontSize },
                selectedIndex === index ? { color: AppColors.backgroundColor, fontWeight: "bold" } : { color: AppColors.fontColor }
              ]}>
              {item}
            </AppText>
          </AppPressableOverlay>
        ))}
      </Row>
    </Column>
  );
};

const onLayout = (event: LayoutChangeEvent, index: number, selectedIndex: number, width: SharedValue<number>, offset: SharedValue<number>) => {
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
};

const styles = StyleSheet.create({
  mainContainer: {
    marginHorizontal: 18
  },
  rowContainer: {
    alignItems: "center",
    justifyContent: "space-between"
  },
  pressableStyle: {
    borderRadius: 18
  },
  textStyle: {
    paddingHorizontal: 22,
    paddingVertical: 6
  },
  underline: {
    borderBottomColor: AppColorPalettes.gray[200],
    borderBottomWidth: 1
  },
  animatedView: {
    borderRadius: 2,
    height: 4,
    position: "relative",
    top: -3
  },
  selected: {
    fontWeight: "bold",
    color: AppColors.white
  },
  unselected: {
    borderWidth: 1,
    borderColor: AppColors.fontColor
  }
});
