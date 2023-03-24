import { ColorValue, Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AppColors, WithAlpha } from "@/theme/colors";

export interface AppPressableProps extends PressableProps, PropsWithChildren {
  backgroundStyle?: StyleProp<ViewStyle>;
  foregroundColor?: ColorValue;
  children: ReactNode | undefined;
  clickable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pressable with an overlay when pressed
 */
export function AppPressable({ backgroundStyle, foregroundColor, children, style, clickable = true, ...props }: AppPressableProps) {
  const opacitySv = useSharedValue(0);
  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(opacitySv.value, { duration: 75 })
    };
  }, []);
  const foreground = useMemo(() => {
    if (backgroundStyle) {
      // Get border radius from background shape
      const styles = StyleSheet.flatten(backgroundStyle);
      return Object.fromEntries(
        [
          "borderRadius",
          "borderBottomEndRadius",
          "borderBottomLeftRadius",
          "borderBottomRightRadius",
          "borderBottomStartRadius",
          "borderTopEndRadius",
          "borderTopLeftRadius",
          "borderTopRightRadius",
          "borderTopStartRadius"
        ].map(k => [k, styles[k]])
      );
    }
    return {};
  }, [backgroundStyle]);

  const contentView = useMemo(() => <View style={style}>{children}</View>, [children, style]);

  const overlayColor = foregroundColor ? { backgroundColor: foregroundColor } : styles.pressedDefault;
  return (
    <Pressable
      {...props}
      style={backgroundStyle}
      onTouchEnd={() => {
        opacitySv.value = 0;
      }}
      onTouchCancel={() => {
        opacitySv.value = 0;
      }}
      onTouchStart={() => {
        opacitySv.value = 1;
      }}>
      <View>
        {contentView}
        {clickable && <Animated.View style={[overlayColor, foreground, styles.pressedFixed, opacityStyle]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressedDefault: {
    backgroundColor: WithAlpha(AppColors.black, 0.3)
  },
  pressedFixed: {
    position: "absolute",
    right: 0,
    left: 0,
    top: 0,
    bottom: 0
  }
});
