import { FlatList, FlatListProps, ScrollView, ScrollViewProps, SectionList, SectionListProps, StyleSheet, useWindowDimensions } from "react-native";
import React, { createContext, PropsWithChildren, useContext, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Observable, Subject } from "rxjs";

export const AppBottomSheetHandleHeight = 24;
export interface BottomSheetProps extends PropsWithChildren {
  stops: number[];
  initialStop?: number;
  margins?: { bottom?: number; right?: number; left?: number };
  padding?: { top?: number };
  onScrolled?: (y: number) => void;
  canScroll?: boolean;
}

export type BottomSheetRefProps = {
  scrollTo: (y: number) => void;
  getTop: () => number;
};

interface BottomSheetContext {
  onScroll: (offset: number) => void;
  onEndScroll: (offset: number) => void;
  onStartScroll: (offset: number) => void;
  expanded: Observable<boolean>;
}

const BottomSheetContext = createContext<BottomSheetContext>();

export const AppBottomSheet = React.forwardRef<BottomSheetRefProps, BottomSheetProps>(
  ({ onScrolled, children, canScroll, stops, margins, padding }, ref) => {
    const marginBottom = margins?.bottom || 0;
    const insets = useSafeAreaInsets();
    const paddingTop = (padding?.top || insets.top + 16) - AppBottomSheetHandleHeight;
    const { height } = useWindowDimensions();
    const fillLimit = padding?.top || 0;

    const getPixelValue = (v: number) => {
      "worklet";
      return Math.min(v <= 1 ? v * height : v, height);
    };

    const pStops = stops.map(s => getPixelValue(s));

    const h = useSharedValue(pStops[0]);

    const context = useSharedValue({ y: 0 });
    const margin = useSharedValue({ bottom: marginBottom, left: margins?.left || 0, right: margins?.right || 0 });

    useEffect(() => {
      margin.value = { bottom: marginBottom, left: margins?.left || 0, right: margins?.right || 0 };
    }, [margins?.bottom, margins?.left, margins?.right]);

    const expanded = new Subject<boolean>();
    const notifyExpanded = (v: boolean) => {
      expanded.next(v);
    };

    const isExpanded = () => {
      "worklet";
      return h.value + marginBottom + paddingTop >= pStops[pStops.length - 1];
    };
    const scrollTo = (y: number) => {
      "worklet";
      //  scrollValue.current = y;
      h.value = withSpring(getPixelValue(y), { damping: 50 });

      runOnJS(notifyExpanded)(isExpanded());
    };

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

    useImperativeHandle(ref, () => ({ scrollTo, getTop: () => Math.min(height - h.value - marginBottom, height - pStops[0] - marginBottom) }), [
      h.value,
      height,
      pStops,
      scrollTo
    ]);

    const gesture = Gesture.Pan()
      .onStart(() => {
        context.value = { y: h.value };
      })
      .onUpdate(event => {
        h.value = Math.min(-event.translationY + context.value.y, height);

        runOnJS(notifyExpanded)(isExpanded());
      })
      .onEnd(event => {
        // Scroll to the closest stop

        const stopIndex = findClosestStop(h.value, event.translationY);

        const value = pStops[stopIndex];
        scrollTo(value);
        if (onScrolled) {
          runOnJS(onScrolled)(stops[stopIndex]);
        }
      })
      .enabled(canScroll || true);

    const bSheetBgStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        h.value,
        [0, height - fillLimit - 8, height - fillLimit, height],
        ["rgba(255,255,255,0)", "rgba(255,255,255,0)", AppColors.white, AppColors.white]
      );

      const bSheetIsExpanded = isExpanded();
      const top = bSheetIsExpanded ? 0 : Math.min(height - h.value - marginBottom, height - pStops[0] - marginBottom);

      return {
        backgroundColor,
        paddingRight: margin.value.right,
        paddingLeft: margin.value.left,
        paddingBottom: margin.value.bottom,
        paddingTop: -Math.min(-(paddingTop - top), 0),
        height: bSheetIsExpanded ? height : Math.max(h.value + marginBottom, pStops[0] + marginBottom),
        top
      };
    });

    const bSheetStyle = useAnimatedStyle(() => {
      const shadowColor = interpolateColor(
        h.value,
        [0, height - fillLimit - AppBottomSheetHandleHeight, height - fillLimit, height],
        ["#000", "#000", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]
      );
      return {
        shadowColor
      };
    });
    const handleStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        h.value,
        [0, height - fillLimit - AppBottomSheetHandleHeight, height - fillLimit, height],
        [AppColorPalettes.gray[400], AppColorPalettes.gray[400], "rgba(255,255,255,0)", "rgba(255,255,255,0)"]
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
              //borderColor: "red",
              //borderWidth: 2,
              left: 0,
              right: 0,
              bottom: 0,
              flex: 1,
              position: "absolute"
            }
          ]}>
          <Animated.View
            style={[
              styles.bottomSheetContainer,
              AppStyles.shadow,
              marginBottom > 0
                ? {
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12
                  }
                : {},
              bSheetStyle
            ]}
            //exiting={SlideOutDown}
            // entering={SlideInDown}
          >
            <Animated.View style={[styles.line, handleStyle]} />
            <BottomSheetContext.Provider
              value={{
                expanded,
                onScroll: offset => {
                  "worklet";
                  h.value = Math.min(offset + context.value.y, height);
                },
                onEndScroll: offset => {
                  "worklet";
                  const stopIndex = findClosestStop(h.value, offset);

                  const value = pStops[stopIndex];
                  scrollTo(value);
                  if (onScrolled) {
                    runOnJS(onScrolled)(stops[stopIndex]);
                  }
                },
                onStartScroll: () => {
                  "worklet";
                  context.value = { y: h.value };
                }
              }}>
              {children}
            </BottomSheetContext.Provider>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

const WithBottomSheetContext =
  <T,>(WrappedComponent: React.ComponentType<T & ScrollViewProps>) =>
  (props: T & ScrollViewProps) => {
    const context = useContext(BottomSheetContext);

    if (!context) {
      return <WrappedComponent {...props} />;
    }
    const { onScroll, onEndScroll, onStartScroll, expanded } = context;
    const [sheetExpanded, setBSheetExpanded] = useState(false);

    useEffect(() => {
      const sub = expanded.subscribe(setBSheetExpanded);
      return () => sub.unsubscribe();
    });

    const gesture = Gesture.Pan()
      .onStart(event => {
        onStartScroll(-event.translationY);
      })
      .onUpdate(event => {
        onScroll(-event.translationY);
      })
      .onEnd(event => {
        // Scroll to the closest stop
        onEndScroll(-event.translationY);
      })
      .enabled(!sheetExpanded);
    return (
      <GestureDetector gesture={gesture}>
        <WrappedComponent
          {...props}
          overScrollMode={"never"}
          bounces={false}
          scrollEnabled={sheetExpanded}
          onScroll={event => {
            // reached top
            if (event.nativeEvent.contentOffset.y === 0) {
              setBSheetExpanded(false);
            }
          }}
          onScrollEndDrag={event => {
            if (event.nativeEvent.contentOffset.y === 0) {
              setBSheetExpanded(false);
            }
          }}
        />
      </GestureDetector>
    );
  };

export const AppBottomSheetFlatList = WithBottomSheetContext(<T,>(props: FlatListProps<T>) => {
  return <FlatList {...props} />;
});

export const AppBottomSheetScrollView = WithBottomSheetContext((props: ScrollViewProps) => {
  return <ScrollView {...props} />;
});

export const AppBottomSheetSectionList = WithBottomSheetContext(<T,>(props: SectionListProps<T>) => {
  return <SectionList {...props} />;
});
const styles = StyleSheet.create({
  bottomSheetContainer: {
    overflow: "hidden",
    backgroundColor: AppColors.white,
    flex: 1,
    width: "100%",
    zIndex: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  line: {
    width: 52,
    height: 4,
    backgroundColor: AppColorPalettes.gray[400],
    alignSelf: "center",
    marginVertical: 10,
    borderRadius: 2
  }
});