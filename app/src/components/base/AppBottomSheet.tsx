import { StyleSheet, useWindowDimensions, View } from "react-native";
import React, { PropsWithChildren, useCallback, useEffect, useImperativeHandle } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppColorPalettes } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const AppBottomSheetHandleHeight = 32;
export interface BottomSheetProps extends PropsWithChildren {
  stops: number[];
  initialStop?: number;
  margins?: { bottom?: number; right?: number; left?: number };
  padding?: { top?: number };
  onScrolled?: (y: number) => void;
}

export type BottomSheetRefProps = {
  scrollTo: (y: number) => void;
};

export const AppBottomSheet = React.forwardRef<BottomSheetRefProps, BottomSheetProps>(
  ({ onScrolled, children, stops, initialStop, margins, padding }, ref) => {
    const marginBottom = margins?.bottom || 0;
    const insets = useSafeAreaInsets();
    const paddingTop = (padding?.top || insets.top + 16) - AppBottomSheetHandleHeight;
    const { height } = useWindowDimensions();

    const getPixelValue = (v: number) => {
      "worklet";
      return Math.min((v <= 1 ? v * height : v) + marginBottom, height);
    };

    const pStops = stops.map(s => getPixelValue(s));
    //console.log(pStops);

    const h = useSharedValue(getPixelValue(initialStop || pStops[0] + marginBottom));
    const context = useSharedValue({ y: 0 });
    const margin = useSharedValue({ bottom: marginBottom, left: margins?.left || 0, right: margins?.right || 0 });
    useEffect(() => {
      margin.value = { bottom: marginBottom, left: margins?.left || 0, right: margins?.right || 0 };
    }, [margins]);

    useEffect(() => {
      if (initialStop) {
        scrollTo(initialStop);
      }
    }, [initialStop]);

    const scrollTo = useCallback(
      (y: number) => {
        "worklet";

        h.value = withSpring(getPixelValue(y), { damping: 50 });
      },
      [h]
    );

    const findClosestStop = (value: number, direction: number) => {
      "worklet";
      // direction is up if negative
      if (value < pStops[0]) {
        return 0;
      }
      for (let i = 1; i < stops.length; i++) {
        const a = value - pStops[i - 1];
        const b = pStops[i] - value;
        if (a >= 0 && b >= 0) {
          const ratio = a / b;
          if (direction < 0) {
            return ratio < 0.2 ? i - 1 : i;
          } else {
            return ratio < 0.8 ? i - 1 : i;
          }
        }
      }

      return stops.length - 1;
    };

    useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = { y: h.value };
      })
      .onUpdate(event => {
        h.value = Math.min(-event.translationY + context.value.y, height);
      })
      .onEnd(event => {
        // Scroll to the closest stop
        // console.log(findClosestStop(h.value - marginBottom, event.translationY), h.value - marginBottom, event.translationY);
        const stopIndex = findClosestStop(h.value, event.translationY);

        const value = pStops[stopIndex];
        scrollTo(value);
        if (onScrolled) {
          onScrolled(value);
        }
      });

    const bSheetBgStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        h.value,
        [0, height - 80, height],
        ["rgba(255,255,255,0)", "rgba(255,255,255,0)", AppColorPalettes.gray[100]]
      );
      const top = Math.min(height - h.value, height - pStops[0]);

      return {
        backgroundColor,
        paddingRight: margin.value.right,
        paddingLeft: margin.value.left,
        paddingBottom: margin.value.bottom,
        paddingTop: -Math.min(-(paddingTop - top), 0),
        height: Math.max(h.value, pStops[0]),
        top
      };
    });

    const bSheetStyle = useAnimatedStyle(() => {
      const shadowColor = interpolateColor(h.value, [0, height - 80, height], ["#000", "#000", "rgba(255,255,255,0)"]);
      return {
        shadowColor
      };
    });
    const handleStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        h.value,
        [0, height - 80, height],
        [AppColorPalettes.gray[400], AppColorPalettes.gray[400], "rgba(255,255,255,0)"]
      );
      return {
        backgroundColor
      };
    });
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            bSheetBgStyle,
            {
              borderColor: "red",
              borderWidth: 2,
              left: 0,
              right: 0,
              bottom: 0,
              flex: 1,
              position: "absolute"
            }
          ]}>
          <Animated.View
            style={[
              {
                overflow: "hidden",
                backgroundColor: AppColorPalettes.gray[100],
                flex: 1,
                width: "100%",
                zIndex: 100,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12
              },
              AppStyles.shadow,
              bSheetStyle
            ]}
            //exiting={SlideOutDown}
            // entering={SlideInDown}
          >
            <Animated.View style={[styles.line, handleStyle]} />

            {children}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetContainer: {
    overflow: "hidden",
    backgroundColor: AppColorPalettes.gray[100],
    position: "absolute",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  line: {
    width: 52,
    height: 4,
    backgroundColor: AppColorPalettes.gray[400],
    alignSelf: "center",
    marginVertical: 14,
    borderRadius: 2
  }
});
