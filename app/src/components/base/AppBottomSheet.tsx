import { FlatListProps, ScrollViewProps, StyleProp, StyleSheet, View } from "react-native";
import React, {
  createContext,
  forwardRef,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { FlatList, Gesture, GestureDetector, ScrollView } from "react-native-gesture-handler";
import Animated, { interpolate, interpolateColor, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { AppColors } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Observable, Subject } from "rxjs";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import Handle from "@/components/base/Handle.tsx";

export const AppBottomSheetHandleHeight = 60;

export interface BottomSheetProps extends PropsWithChildren {
  // Preset heights for this bottom sheet. I the value is greater than 1, the unit is in pixels,
  // otherwise the value is considered to be a ratio of the total height.
  stops: number[];
  // The index of the initial bottom sheet height.
  initialStop?: number;
  margins?: { bottom?: number; right?: number; left?: number };
  // The upper space from which to consider the bottom sheet as expanded.
  padding?: { top?: number };
  onScrolled?: (y: number) => void;
  canScroll?: boolean;
  style?: StyleProp<any>;
}

export type BottomSheetRefProps = {
  scrollTo: (y: number) => void;
  getTop: () => number;
};

export interface BottomSheetObservableMessage {
  expanded: boolean;
  top: number;
}

interface BottomSheetContext {
  onScroll: (offset: number) => boolean;
  onEndScroll: (offset: number) => void;
  onStartScroll: (offset: number) => void;
  expanded: Observable<boolean>;
}

// @ts-ignore
const BottomSheetContext = createContext<BottomSheetContext>();

export const AppBottomSheet = React.forwardRef<BottomSheetRefProps, BottomSheetProps>(
  ({ onScrolled, children, style, canScroll, stops, margins, padding, initialStop = 0 }, ref) => {
    const marginBottom = margins?.bottom || 0;
    const insets = useSafeAreaInsets();
    const paddingTop = (padding?.top || insets.top + 16) - AppBottomSheetHandleHeight;
    const { height, width } = useAppWindowsDimensions();
    const fillLimit = padding?.top || 0;
    const currentStop = useSharedValue<number>(initialStop);

    const getPixelValue = useCallback(
      (v: number) => {
        "worklet";
        return Math.min(v <= 1 ? v * height : v, height);
      },
      [height]
    );

    const pStops = stops.map(s => getPixelValue(s));

    // Current height of the bottom sheet
    const h = useSharedValue(pStops[currentStop.value]);

    // Context used to retain values while panning the bottom sheet
    const context = useSharedValue({ y: 0 });

    // Store margins as shared values to allow animation
    const margin = useSharedValue({ bottom: marginBottom, left: margins?.left ?? 0, right: margins?.right ?? 0 });

    useEffect(() => {
      margin.value = { bottom: marginBottom, left: margins?.left ?? 0, right: margins?.right ?? 0 };
    }, [margin, marginBottom, margins?.bottom, margins?.left, margins?.right]);

    const expanded = useMemo(() => new Subject<boolean>(), []);

    const notifyExpanded = useCallback(
      (v: boolean) => {
        expanded.next(v);
      },
      [expanded]
    );

    const updateCurrentStop = (index: number) => {
      currentStop.value = index;
    };

    const isExpanded = useCallback(() => {
      "worklet";
      return h.value + marginBottom + paddingTop >= pStops[pStops.length - 1];
    }, [h.value, marginBottom, pStops, paddingTop]);

    const scrollTo = useCallback(
      (y: number) => {
        "worklet";
        h.value = withSpring(getPixelValue(y), { damping: 50 });
        runOnJS(notifyExpanded)(isExpanded());
      },
      [getPixelValue, h, isExpanded, notifyExpanded]
    );

    const PanThreshHold = 52;
    const findClosestStop = (value: number, direction: number) => {
      "worklet";
      // direction is up if negative
      if (value < pStops[0]) {
        return 0;
      }
      // Find the closest stop in the current scrolling direction
      for (let i = 1; i < stops.length; i++) {
        const a = value - pStops[i - 1];
        const b = pStops[i] - value;
        if (a >= 0 && b >= 0) {
          const ratio = a / b;
          if (direction < 0) {
            return ratio < 0.2 && a <= PanThreshHold ? i - 1 : i;
          } else {
            return ratio < 0.8 || b > PanThreshHold ? i - 1 : i;
          }
        }
      }
      return stops.length - 1;
    };

    useImperativeHandle(ref, () => ({ scrollTo, getTop: () => Math.min(height - h.value - marginBottom, height - pStops[0] - marginBottom) }), [
      h.value,
      height,
      marginBottom,
      pStops,
      scrollTo
    ]);

    // Handle pan gesture and scroll to closest stop
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
        runOnJS(updateCurrentStop)(stopIndex);
        const value = pStops[stopIndex];
        scrollTo(value);
        if (onScrolled) {
          runOnJS(onScrolled)(stops[stopIndex]);
        }
      })
      .enabled(canScroll || true);

    const bgColor = useMemo(() => {
      return StyleSheet.flatten(style)?.backgroundColor || AppColors.white;
    }, [style]);

    // Animate the expanded bottom sheet background
    const bSheetBgStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        h.value,
        [0, height - fillLimit - 8, height - fillLimit, height],
        ["rgba(255,255,255,0)", "rgba(255,255,255,0)", bgColor, bgColor]
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

    // Animate shadow and elevation
    const bSheetStyle = useAnimatedStyle(() => {
      const shadowColor = interpolateColor(
        h.value,
        [0, height - fillLimit - AppBottomSheetHandleHeight, height - fillLimit, height],
        ["#000", "#000", "rgba(255,255,255,0)", "rgba(255,255,255,0)"]
      );
      const elevation = interpolate(h.value, [0, height - fillLimit - AppBottomSheetHandleHeight, height - fillLimit, height], [4, 4, 0, 0]);
      return {
        shadowColor,
        elevation,
        width: withTiming(width - margin.value.right - margin.value.left, { duration: 300 }) // withTiming is important as is forces recalculation of the layout
      };
    });

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            bSheetBgStyle,
            {
              left: 0,
              right: 0,
              bottom: 0,
              flex: 1,
              position: "absolute"
            }
          ]}>
          <Animated.View
            style={[
              styles.bottomSheetContainerDefaults,
              style,
              styles.bottomSheetContainer,
              AppStyles.shadow,
              marginBottom > 0
                ? {
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8
                  }
                : {},
              bSheetStyle
            ]}>
            <Handle animatedIndex={currentStop} animatedPosition={h} />
            <BottomSheetContext.Provider
              value={{
                expanded,
                onScroll: offset => {
                  "worklet";
                  h.value = Math.min(offset + context.value.y, height);
                  return isExpanded();
                },
                onEndScroll: offset => {
                  "worklet";
                  const stopIndex = findClosestStop(h.value, -offset);
                  runOnJS(updateCurrentStop)(stopIndex);
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
              <View style={style}>{children}</View>
            </BottomSheetContext.Provider>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);

// Wrapper component to handle scrolling (listview, etc.) inside a bottom sheet
const WithBottomSheetContext =
  <T,>(WrappedComponent: React.ComponentType<T & ScrollViewProps>) =>
  (props: T & ScrollViewProps) => {
    const context = useContext(BottomSheetContext);
    const expandedScrollDelta = useSharedValue({ y: 0, expanded: false });

    if (!context) {
      return <WrappedComponent {...props} />;
    }
    const { onScroll, onEndScroll, onStartScroll, expanded } = context;
    const [sheetExpanded, setBSheetExpanded] = useState(false);

    useEffect(() => {
      const sub = expanded.subscribe(setBSheetExpanded);
      return () => sub.unsubscribe();
    }, [expanded, expandedScrollDelta]);

    const scrollRef = useRef<AppBottomSheetScrollRefProps>();
    const scrollTo = (y: number) => {
      scrollRef.current?.scrollTo(y);
    };

    // Handles pan gestures while bsheet is not expanded (ie. when pan gesture is caught by the list component)
    const gesture = Gesture.Pan()
      .onStart(event => {
        onStartScroll(-event.translationY);
      })
      .onUpdate(event => {
        const nowExpanded = onScroll(-event.translationY);
        if (nowExpanded && !expandedScrollDelta.value.expanded) {
          expandedScrollDelta.value.expanded = true;
          expandedScrollDelta.value.y = event.translationY;
        } else if (nowExpanded) {
          runOnJS(scrollTo)(-event.translationY + expandedScrollDelta.value.y);
        }
      })
      .onEnd(event => {
        // Scroll to the closest stop
        onEndScroll(-event.translationY);
        expandedScrollDelta.value.expanded = false;
      })
      .enabled(!sheetExpanded);

    return (
      <GestureDetector gesture={gesture}>
        <WrappedComponent
          {...props}
          ref={scrollRef}
          showsVerticalScrollIndicator={sheetExpanded}
          overScrollMode={"never"}
          bounces={false}
          scrollEventThrottle={16}
          scrollEnabled={sheetExpanded}
          onScroll={event => {
            // reached top
            //console.debug("scroll", event.nativeEvent);
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

interface AppBottomSheetScrollRefProps {
  scrollTo: (y: number) => void;
}

export const AppBottomSheetFlatList = WithBottomSheetContext(
  forwardRef<AppBottomSheetScrollRefProps, FlatListProps<any>>((props: FlatListProps<any>, ref) => {
    const fRef = useRef<FlatList>(null);
    useImperativeHandle(ref, () => ({
      scrollTo: y => fRef.current?.scrollToOffset({ offset: y, animated: false })
    }));
    return <FlatList ref={fRef} {...props} />;
  })
);

export const AppBottomSheetScrollView = WithBottomSheetContext(
  forwardRef<AppBottomSheetScrollRefProps, ScrollViewProps>((props: ScrollViewProps, ref) => {
    const fRef = useRef<ScrollView>(null);
    useImperativeHandle(ref, () => ({
      scrollTo: y => fRef.current?.scrollTo({ y, animated: false })
    }));
    return <ScrollView ref={fRef} {...props} />;
  })
);

const styles = StyleSheet.create({
  bottomSheetContainerDefaults: {
    backgroundColor: AppColors.white,
    paddingTop: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  bottomSheetContainer: {
    overflow: "hidden",
    flex: 1,
    width: "100%",
    zIndex: 100,
    alignSelf: "center"
  }
});
