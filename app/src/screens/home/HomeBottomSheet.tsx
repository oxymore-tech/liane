import React, { PropsWithChildren, useContext, useEffect, useRef } from "react";
import { HomeMapContext } from "@/screens/home/StateMachine";
import { useActor } from "@xstate/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { AppBottomSheet, AppBottomSheetHandleHeight, BottomSheetRefProps } from "@/components/base/AppBottomSheet";
import { View } from "react-native";
import { AppColors } from "@/theme/colors";

export const HomeBottomSheetContainer = (
  props: {
    display?: "closed" | "full" | "none";
    canScroll?: boolean;
    onScrolled?: (y: number, isFull: boolean, isClosed: boolean) => void;
  } & PropsWithChildren
) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const isMapState = state.matches("map");
  const isMatchState = state.matches("match");
  const isPointState = state.matches("point");

  const insets = useSafeAreaInsets();
  const { height } = useAppWindowsDimensions();
  const h = useBottomTabBarHeight();
  const ref = useRef<BottomSheetRefProps>(null);

  useEffect(() => {
    if (props.display === "closed") {
      ref.current?.scrollTo(0.2);
    } else if (props.display === "full") {
      ref.current?.scrollTo(1);
    }
  }, [props.display]);
  useEffect(() => {
    const transitionListener = (s: any) => {
      if (s.matches("detail")) {
        ref.current?.scrollTo(0.7);
      } else if (s.matches("match")) {
        ref.current?.scrollTo(0.4);
      }
    };
    machine.onTransition(transitionListener);
    return () => {
      machine.off(transitionListener);
    };
  }, []);

  if (props.display === "none") {
    return <View />;
  }

  const bottomSpace = insets.bottom + h;

  let stops: number[];
  let paddingTop: number;
  let initialIndex: number;
  if (isMapState) {
    stops = [AppBottomSheetHandleHeight + h / 2 + 28, 0.3, 1];
    paddingTop = 96;
    initialIndex = 1;
  } else if (isMatchState || isPointState) {
    stops = [AppBottomSheetHandleHeight + h / 2 + 52, 0.35, 1];
    paddingTop = 124;
    initialIndex = 1;
  } else {
    stops = [0.35, 0.7, 1];
    paddingTop = 72;
    initialIndex = 1;
  }

  return (
    <AppBottomSheet
      ref={ref}
      stops={stops}
      initialStop={initialIndex}
      onScrolled={v => {
        if (props.onScrolled) {
          props.onScrolled(v <= 1 ? height * v : v, v === stops[stops.length - 1], v === stops[0]);
        }
      }}
      canScroll={props.canScroll}
      padding={{ top: paddingTop + insets.top }}
      backgroundStyle={{
        backgroundColor: isMatchState ? AppColors.lightGrayBackground : AppColors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24
      }}
      margins={{ right: isMapState ? 24 : 0, left: isMapState ? 24 : 0, bottom: bottomSpace }}>
      {props.children}
    </AppBottomSheet>
  );
};
