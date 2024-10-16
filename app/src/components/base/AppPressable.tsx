import {
  ColorValue,
  Pressable,
  PressableProps,
  RotateTransform,
  StyleProp,
  StyleSheet,
  TranslateXTransform,
  TranslateYTransform,
  View,
  ViewStyle
} from "react-native";
import React, { PropsWithChildren, ReactNode, useMemo } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AppColors, WithAlpha } from "@/theme/colors";
import { AppIcon, AppIconProps } from "@/components/base/AppIcon";

export interface AppPressableOverlayProps extends PressableProps, PropsWithChildren {
  backgroundStyle?: StyleProp<ViewStyle>;
  foregroundColor?: ColorValue;
  children: ReactNode | undefined;
  clickable?: boolean;
  style?: StyleProp<ViewStyle>;
  align?: "center" | "flex-start" | "flex-end" | undefined;
}

export function AppPressable(props: PressableProps) {
  // @ts-ignore
  return <Pressable {...props} style={[styles.pressableDefault, props.style, styles.pressableTarget]} />;
}

export const AppPressableIcon = (
  props: Omit<AppPressableOverlayProps, "children"> &
    AppIconProps & { iconTransform?: (RotateTransform | TranslateXTransform | TranslateYTransform)[] | undefined }
) => (
  <AppPressableOverlay align="center" backgroundStyle={{ borderRadius: 8 }} {...props}>
    <View style={{ transform: props.iconTransform }}>
      <AppIcon name={props.name} color={props.color} opacity={props.opacity} size={props.size} />
    </View>
  </AppPressableOverlay>
);

/**
 * Pressable with an overlay when pressed
 * Props:
 * - "backgroundStyle" : style the pressable container (use to set appearance properties)
 * - "style" : style of the inner content of the pressable
 */
export function AppPressableOverlay({
  backgroundStyle,
  foregroundColor,
  children,
  style,
  clickable = true,
  align,
  disabled,
  onPress,
  ...props
}: AppPressableOverlayProps) {
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
        ].map(k => {
          //@ts-ignore
          return [k, styles[k]];
        })
      );
    }
    return {};
  }, [backgroundStyle]);

  const contentView = useMemo(() => <View style={style}>{children}</View>, [children, style]);

  const overlayColor = foregroundColor ? { backgroundColor: foregroundColor } : styles.pressedDefault;
  return (
    <Pressable
      {...props}
      onPress={clickable && !disabled ? onPress : undefined}
      style={[backgroundStyle, styles.pressableTarget]}
      onTouchEnd={e => {
        opacitySv.value = 0;
        props.onTouchEnd?.(e);
      }}
      onTouchCancel={e => {
        opacitySv.value = 0;
        props.onTouchCancel?.(e);
      }}
      onTouchStart={e => {
        opacitySv.value = 1;
        props.onTouchStart?.(e);
      }}>
      <View style={[styles.pressableTarget, { alignItems: align, justifyContent: align }]}>
        {contentView}
        {clickable && !disabled && <Animated.View style={[overlayColor, foreground, styles.pressedFixed, opacityStyle]} />}
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
  },
  pressableTarget: {
    minHeight: 36,
    minWidth: 36
  }
});
