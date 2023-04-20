import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import React, { useContext, useMemo, useRef, useState } from "react";
import AppMapView, {
  AppMapViewController,
  LianeDisplayLayer,
  LianeMatchRouteLayer,
  PotentialLianeLayer,
  RallyingPointsDisplayLayer,
  WayPointDisplay
} from "@/components/map/AppMapView";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { getPoint, RallyingPoint } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { GeoJSON } from "geojson";
import { isWithinBox, fromPositions } from "@/api/geo";
import { FloatingBackButton, ItineraryFormHeader, RallyingPointHeader } from "@/screens/home/HomeHeader";
import {
  FilterListView,
  HomeBottomSheetContainer,
  LianeDestinations,
  LianeMatchDetail,
  LianeNearestLinks,
  TopRow
} from "@/screens/home/BottomSheetView";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ItinerarySearchForm } from "@/screens/home/ItinerarySearchForm";
import { useActor, useInterpret } from "@xstate/react";
import { filterHasFullTrip, getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import { getBoundingBox } from "@/util/geometry";
import Animated from "react-native-reanimated";
import { Observable } from "rxjs";
import { useBehaviorSubject, useObservable } from "@/util/hooks/subscription";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";

const HomeScreenView = () => {
  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
  const [isLoadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const lianeDisplay =
    state.context.lianeDisplay && state.matches("detail")
      ? {
          ...state.context.lianeDisplay,
          segments: state.context.lianeDisplay.segments.filter(s => s.lianes.includes(state.context.selectedMatch!.liane.id!))
        }
      : state.context.lianeDisplay;

  const bottomSheetScroll = useBehaviorSubject<BottomSheetObservableMessage>({ top: 0, expanded: false });

  const loading = Object.values(state.value).find(s => s === "init" || s === "load") !== undefined;
  const loadingDisplay = isLoadingDisplay || (loading && state.context.reloadCause === "display");
  const loadingList = loading && !state.context.reloadCause;
  console.log(state.value);

  const isMatchState = state.matches("match");
  const isDetailState = state.matches("detail");

  const bottomSheetDisplay = state.matches("form") ? "none" : movingDisplay || !lianeDisplay ? "closed" : undefined;

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <HomeMap
          bottomSheetObservable={bottomSheetScroll}
          onMovingStateChanged={setMovingDisplay}
          onFetchingDisplay={setLoadingDisplay}
          loading={loadingDisplay || loadingList}
        />
      </View>
      {state.matches("form") && (
        <Animated.View // entering={FadeInDown} exiting={FadeOutDown}
          style={[styles.container, { backgroundColor: AppColors.white }]}
        />
      )}

      <HomeBottomSheetContainer
        onScrolled={(v, expanded) => {
          //setMapBottom(v);
          bottomSheetScroll.next({ expanded, top: v });
        }}
        display={bottomSheetDisplay}
        canScroll={!state.matches("map") || (loadingDisplay && !movingDisplay)}>
        {(state.matches("map") || state.matches("point")) && (
          <TopRow loading={loadingList && !movingDisplay} title={state.matches("point") ? "Prochains départs" : "À proximité"} />
        )}
        {isMatchState && <FilterListView loading={loadingList} />}
        {state.matches("map") && <LianeNearestLinks />}
        {state.matches("point") && <LianeDestinations pickup={state.context.filter.from!} date={state.context.filter.targetTime?.dateTime} />}
        {!loadingList && isDetailState && <LianeMatchDetail />}
        {/*loadingList && isDetailState && <ActivityIndicator />*/}
      </HomeBottomSheetContainer>

      {state.matches("map") && <HomeHeader bottomSheetObservable={bottomSheetScroll} onPress={() => machine.send("FORM")} />}
      {state.matches("form") && (
        <ItinerarySearchForm
          onSelectTrip={t => {
            machine.send("UPDATE", { data: t });
          }}
        />
      )}
      {isMatchState && (
        <ItineraryFormHeader
          editable={false}
          onChangeFrom={() => {
            machine.send("UPDATE", { data: { from: undefined } });
          }}
          onChangeTo={() => {
            machine.send("UPDATE", { data: { to: undefined } });
          }}
          onBackPressed={() => {
            machine.send("BACK");
          }}
        />
      )}
      {isDetailState && (
        <FloatingBackButton
          onPress={() => {
            machine.send("BACK");
          }}
        />
      )}

      {state.matches("point") && (
        <RallyingPointHeader
          rallyingPoint={state.context.filter.from!}
          onBackPressed={() => {
            machine.send("BACK");
          }}
        />
      )}
    </View>
  );
};

interface BottomSheetObservableMessage {
  expanded: boolean;

  top: number;
}
const HomeHeader = (props: { onPress: () => void; bottomSheetObservable: Observable<BottomSheetObservableMessage> }) => {
  const insets = useSafeAreaInsets();

  const { expanded } = useObservable(props.bottomSheetObservable, {});
  console.log("bsheet expanded =", expanded);
  return (
    <View style={[styles.floatingSearchBar, { marginTop: insets.top }]}>
      <Pressable style={[AppStyles.inputBar, !expanded ? AppStyles.shadow : styles.border]} onPress={props.onPress}>
        <AppTextInput
          style={AppStyles.input}
          leading={<AppIcon name={"search-outline"} color={AppColorPalettes.gray[400]} />}
          editable={false}
          placeholder={"Trouver une Liane"}
          onPressIn={props.onPress}
        />
      </Pressable>
    </View>
  );
};
const HomeMap = ({
  onMovingStateChanged,
  loading,
  onFetchingDisplay,
  bottomSheetObservable
}: {
  loading?: boolean;
  onMovingStateChanged: (moving: boolean) => void;
  onFetchingDisplay: (fetching: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
}) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const { top } = useObservable(bottomSheetObservable, { top: 52 });
  const { height } = useWindowDimensions();

  const lianeDisplay =
    state.context.lianeDisplay && state.matches("detail")
      ? {
          ...state.context.lianeDisplay,
          segments: state.context.lianeDisplay.segments.filter(s => s.lianes.includes(state.context.selectedMatch!.liane.id!))
        }
      : state.context.lianeDisplay;
  const mapBounds = useMemo(() => {
    if (state.matches("detail")) {
      const coordinates = (lianeDisplay?.segments ?? [])
        .filter(s => s.lianes.includes(state.context.selectedMatch!.liane.id!))
        .map(s => s.coordinates)
        .flat();
      if (filterHasFullTrip(state.context.filter)) {
        const { from, to } = state.context.filter!;
        coordinates.push([from!.location.lng, from!.location.lat]);
        coordinates.push([to!.location.lng, to!.location.lat]);
      }
      const bbox = getBoundingBox(coordinates);
      bbox.paddingTop = 120;
      bbox.paddingLeft = 40;
      bbox.paddingRight = 40;
      bbox.paddingBottom = Math.min(top + 24, (height - 120) / 2);

      return bbox;
    } else if (state.matches("match")) {
      // Set bounds
      const { from, to } = state.context.filter!;

      const bbox = getBoundingBox([
        [from!.location.lng, from!.location.lat],
        [to!.location.lng, to!.location.lat]
      ]);

      bbox.paddingTop = 216;
      bbox.paddingLeft = 40;
      bbox.paddingRight = 40;
      bbox.paddingBottom = Math.min(top + 24, (height - 216) / 2);
      console.debug(bbox, top, height);
      return bbox;
    }
    return undefined;
  }, [state, lianeDisplay?.segments, top, height]);

  const { services } = useContext(AppContext);
  const [rallyingPointsDisplay, setRallyingPointsDisplay] = useState<RallyingPoint[]>([]);

  const regionCallbackRef = useRef<number | undefined>();
  const onRegionChange = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => {
    console.debug("zoom", payload.zoomLevel);
    setMovingDisplay(false);
    if (!state.matches("map")) {
      return;
    }
    if (regionCallbackRef.current) {
      console.log("cancel");
      clearTimeout(regionCallbackRef.current);
    }
    const bounds = fromPositions(payload.visibleBounds);
    //console.log("map stopped moving");
    if (state.context.filter.displayBounds && isWithinBox(bounds, state.context.filter.displayBounds)) {
      // Avoid refetching
      return;
    }
    onFetchingDisplay(true);
    regionCallbackRef.current = setTimeout(async () => {
      const initialRef = regionCallbackRef.current;

      if (payload.zoomLevel < 8) {
        // setLianeDisplay(undefined);
        setRallyingPointsDisplay([]);
        onFetchingDisplay(false);
        return;
      }
      try {
        if (regionCallbackRef.current === initialRef) {
          // If current timeout is still active, fetch display

          machine.send("DISPLAY", { data: bounds });
          if (payload.zoomLevel >= 8 && bounds) {
            const res = await services.rallyingPoint.view(bounds.from, bounds.to);
            setRallyingPointsDisplay(res);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        if (regionCallbackRef.current === initialRef) {
          // If current timeout is still active, show display
          onFetchingDisplay(false);
        }
      }
    }, 1000);
  };

  const isMatchState = state.matches("match");
  const isDetailState = state.matches("detail");

  const detailStateData = useMemo(() => {
    if (!isDetailState) {
      return undefined;
    }
    return {
      pickup: getPoint(state.context.selectedMatch!, "pickup"),
      deposit: getPoint(state.context.selectedMatch!, "deposit")
    };
  }, [isDetailState, state.context.selectedMatch]);

  const [movingDisplay, setMovingDisplay] = useState<boolean>();
  const appMapRef = useRef<AppMapViewController>();

  return (
    <AppMapView
      bounds={mapBounds}
      showGeolocation={state.matches("map") && !movingDisplay}
      onRegionChanged={onRegionChange}
      onStopMovingRegion={() => {
        onMovingStateChanged(false);
        setMovingDisplay(false);
        //console.log("map touch end");
      }}
      onStartMovingRegion={() => {
        setMovingDisplay(true);
        onMovingStateChanged(true);
        // console.log("map moving");
      }}
      ref={appMapRef}
      onSelectLocation={loc => {
        console.debug("sel loc", loc);
        appMapRef.current?.setCenter(loc, 12.1);
      }}>
      {(state.matches("map") ||
        state.matches("point") ||
        (isMatchState && !(state.matches({ match: "idle" }) && state.context.matches.length === 0))) && (
        <LianeDisplayLayer lianeDisplay={lianeDisplay} loading={loading} useWidth={isMatchState ? 3 : undefined} />
      )}
      {isMatchState && state.matches({ match: "idle" }) && state.context.matches.length === 0 && (
        <PotentialLianeLayer from={state.context.filter.from!} to={state.context.filter.to!} />
      )}
      {isDetailState && <LianeMatchRouteLayer />}

      {["map", "point"].some(state.matches) && (
        <RallyingPointsDisplayLayer
          rallyingPoints={rallyingPointsDisplay}
          onSelect={rp => {
            if (rp) {
              machine.send("SELECT", { data: rp });
            } else {
              machine.send("BACK");
            }
          }}
        />
      )}

      {isDetailState && state.context.filter.from?.id !== detailStateData!.pickup.id && (
        <WayPointDisplay rallyingPoint={detailStateData!.pickup} type={"pickup"} />
      )}
      {isDetailState && state.context.filter.to?.id !== detailStateData!.deposit.id && (
        <WayPointDisplay rallyingPoint={detailStateData!.deposit} type={"deposit"} />
      )}
      {["detail", "match", "point"].some(state.matches) && (
        <WayPointDisplay
          rallyingPoint={state.context.filter.from || detailStateData!.pickup}
          type={"from"}
          // showIcon={state.context.selectedMatch === undefined}
          active={!isDetailState || !state.context.filter.from || state.context.filter.from.id === detailStateData!.pickup.id}
        />
      )}
      {["detail", "match"].some(state.matches) && (
        <WayPointDisplay
          rallyingPoint={state.context.filter.to || detailStateData!.deposit}
          type={"to"}
          //  showIcon={state.context.selectedMatch === undefined}
          active={!isDetailState || !state.context.filter.to || state.context.filter.to.id === detailStateData!.deposit.id}
        />
      )}
    </AppMapView>
  );
};
const HomeScreen = () => {
  const { services } = useContext(AppContext);

  const m = useMemo(
    () =>
      HomeMapMachine({
        match: ctx => services.liane.match2(getSearchFilter(ctx.filter)),
        cacheRecentTrip: trip => services.location.cacheRecentTrip(trip).catch(e => console.error(e)),
        cacheRecentPoint: rp => services.location.cacheRecentLocation(rp).catch(e => console.error(e)),
        display: async ctx => {
          if (!ctx.filter.displayBounds) {
            return undefined;
          }
          const a = ctx.filter.displayBounds.to.lng - ctx.filter.displayBounds.from.lng;
          const b = ctx.filter.displayBounds.to.lat - ctx.filter.displayBounds.from.lat;
          if (a * a + b * b > 4) {
            // Area is too big
            return undefined;
          }
          return services.liane.display(ctx.filter.displayBounds.from, ctx.filter.displayBounds.to, ctx.filter?.targetTime?.dateTime);
        }
      }),
    [services]
  );
  const machine = useInterpret(m);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HomeMapContext.Provider value={machine}>
        <HomeScreenView />
      </HomeMapContext.Provider>
    </GestureHandlerRootView>
  );
};
export default HomeScreen;

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    height: "100%",
    width: "100%",
    position: "absolute",
    flex: 1
  },
  border: {
    borderWidth: 1,
    borderColor: AppColorPalettes.gray[200]
  },
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  }
});
