import { Pressable, StyleSheet, View } from "react-native";
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
import { getPoint } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { FeatureCollection, GeoJSON } from "geojson";
import { isWithinBox, fromPositions } from "@/api/geo";
import { AnimatedFloatingBackButton, RallyingPointHeader } from "@/screens/home/HomeHeader";
import { FilterListView, FilterSelector, LianeDestinations, LianeNearestLinks } from "@/screens/home/BottomSheetView";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ItinerarySearchForm } from "@/screens/ItinerarySearchForm";
import { useActor, useInterpret } from "@xstate/react";
import { filterHasFullTrip, getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import { EmptyFeatureCollection, getBoundingBox } from "@/util/geometry";
import Animated, { FadeInDown, FadeOutDown, SlideInDown } from "react-native-reanimated";
import { Observable } from "rxjs";
import { useBehaviorSubject, useObservable } from "@/util/hooks/subscription";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStyles } from "@/theme/styles";
import { AppTextInput } from "@/components/base/AppTextInput";
import { AppIcon } from "@/components/base/AppIcon";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import { ItineraryFormHeader } from "@/components/trip/ItineraryFormHeader";
import { HomeBottomSheetContainer, TopRow } from "@/screens/home/HomeBottomSheet";
import { OfflineWarning } from "@/components/OfflineWarning";
import { LianeMatchDetailView } from "@/screens/home/LianeMatchDetailView";
import { useBottomBarStyle } from "@/components/Navigation";
import { useAppNavigation } from "@/api/navigation";

const HomeScreenView = ({ displaySource }: { displaySource: Observable<FeatureCollection> }) => {
  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
  const [isLoadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const { status } = useContext(AppContext);

  console.log("moving", movingDisplay);

  const backHandler = () => {
    if (state.can("BACK")) {
      // handle it
      machine.send("BACK");
      return true;
    }

    return false;
  };

  const bottomSheetScroll = useBehaviorSubject<BottomSheetObservableMessage>({ top: 0, expanded: false });

  const loading = Object.values(state.value).find(s => s === "init" || s === "load") !== undefined;
  const loadingDisplay = isLoadingDisplay || (loading && state.context.reloadCause === "display");
  const loadingList = loading && !state.context.reloadCause;
  const offline = status === "offline";
  const { navigation } = useAppNavigation<"Home">();

  const isMatchState = state.matches("match");
  const isDetailState = state.matches("detail");
  const isMapState = state.matches("map");

  const bottomSheetDisplay = state.matches("form") ? "none" : movingDisplay /*|| !lianeDisplay*/ ? "closed" : undefined;

  const bbStyle = useBottomBarStyle();
  React.useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: [...bbStyle, { display: isMapState ? undefined : "none" }] //{transform: [{translateY: state.matches("map") ? 0 : 80}]}]
    });
  });

  return (
    <AppBackContextProvider backHandler={backHandler}>
      <View style={styles.page}>
        <View style={styles.container}>
          <HomeMap
            displaySource={displaySource}
            bottomSheetObservable={bottomSheetScroll}
            onMovingStateChanged={setMovingDisplay}
            onFetchingDisplay={setLoadingDisplay}
            loading={loadingDisplay || loadingList}
          />
        </View>
        {state.matches("form") && (
          <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[styles.container, { backgroundColor: AppColors.white }]} />
        )}
        {offline && (
          <Animated.View style={{ position: "absolute", bottom: 96, left: 24, right: 24 }} entering={SlideInDown}>
            <OfflineWarning />
          </Animated.View>
        )}

        {!offline && !state.matches("map") && (
          <HomeBottomSheetContainer
            onScrolled={(v, expanded) => {
              //setMapBottom(v);
              bottomSheetScroll.next({ expanded, top: v });
            }}
            display={bottomSheetDisplay}
            canScroll={loadingDisplay && !movingDisplay}>
            {state.matches("point") && <TopRow loading={loadingList && !movingDisplay} title={"Prochains départs"} />}
            {state.matches("point") && <FilterSelector shortFormat={true} />}
            {isMatchState && <FilterListView loading={loadingList} />}

            {state.matches("point") && <LianeDestinations pickup={state.context.filter.from!} date={state.context.filter.targetTime?.dateTime} />}
            {!loadingList && isDetailState && <LianeMatchDetailView />}
            {/*loadingList && isDetailState && <ActivityIndicator />*/}
          </HomeBottomSheetContainer>
        )}

        {state.matches("map") && <HomeHeader bottomSheetObservable={bottomSheetScroll} onPress={() => machine.send("FORM")} />}
        {state.matches("form") && (
          <ItinerarySearchForm
            // updateField={(field, value) => machine.send("UPDATE", { data: { [field]: value } })}
            animateEntry={state.history?.matches("map") || state.history?.matches("detail") || false}
            trip={state.context.filter}
            onSelectTrip={t => {
              machine.send("UPDATE", { data: t });
            }}
            updateTrip={t => machine.send("UPDATE", { data: t })}
          />
        )}
        {isMatchState && (
          <ItineraryFormHeader
            updateTrip={t => machine.send("UPDATE", { data: t })}
            editable={false}
            animateEntry={state.history?.matches("detail")}
            onChangeField={field => {
              machine.send("UPDATE", { data: { [field]: undefined } });
            }}
            trip={state.context.filter}
          />
        )}
        {isDetailState && (
          <AnimatedFloatingBackButton
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
    </AppBackContextProvider>
  );
};

interface BottomSheetObservableMessage {
  expanded: boolean;
  top: number;
}
const HomeHeader = (props: { onPress: () => void; bottomSheetObservable: Observable<BottomSheetObservableMessage> }) => {
  const insets = useSafeAreaInsets();

  const { expanded } = useObservable(props.bottomSheetObservable, { expanded: false, top: 0 });
  // console.log("bsheet expanded =", expanded);
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
  displaySource,
  onMovingStateChanged,
  loading,
  onFetchingDisplay,
  bottomSheetObservable
}: {
  displaySource: Observable<FeatureCollection>;
  loading?: boolean;
  onMovingStateChanged: (moving: boolean) => void;
  onFetchingDisplay: (fetching: boolean) => void;
  bottomSheetObservable: Observable<BottomSheetObservableMessage>;
}) => {
  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);
  const isMatchStateIdle = state.matches({ match: "idle" });

  const { top: bSheetTop } = useObservable(bottomSheetObservable, { expanded: false, top: 52 });
  const { height } = useAppWindowsDimensions();
  const { top: insetsTop } = useSafeAreaInsets();
  const lianeDisplay = useObservable(displaySource, EmptyFeatureCollection);

  console.debug("display :", lianeDisplay.features.length);

  const pickupsDisplay = useMemo(() => {
    if (isMatchStateIdle) {
      return state.context.matches!.map(m => getPoint(m, "pickup"));
    }
    return [];
  }, [isMatchStateIdle, state.context.matches]);

  const mapBounds = useMemo(() => {
    if (state.matches("detail")) {
      const coordinates = []; // TODO (lianeDisplay?.segments ?? [])
      //.filter(s => s.lianes.includes(state.context.selectedMatch!.liane.id!))
      // .map(s => s.coordinates)
      // .flat();
      if (filterHasFullTrip(state.context.filter)) {
        const { from, to } = state.context.filter!;
        coordinates.push([from!.location.lng, from!.location.lat]);
        coordinates.push([to!.location.lng, to!.location.lat]);
      }
      const bbox = getBoundingBox(coordinates);
      bbox.paddingTop = insetsTop + 96;
      bbox.paddingLeft = 72;
      bbox.paddingRight = 72;
      bbox.paddingBottom = Math.min(bSheetTop + 40, (height - bbox.paddingTop) / 2 + 24);
      console.debug(bbox, bSheetTop, height);

      return bbox;
    } else if (state.matches("match")) {
      // Set bounds
      const { from, to } = state.context.filter!;

      const bbox = getBoundingBox([
        [from!.location.lng, from!.location.lat],
        [to!.location.lng, to!.location.lat]
      ]);

      bbox.paddingTop = insetsTop + 180;
      bbox.paddingLeft = 72;
      bbox.paddingRight = 72;
      bbox.paddingBottom = Math.min(bSheetTop + 40, (height - bbox.paddingTop) / 2 + 24);
      console.debug(bbox, bSheetTop, height);
      return bbox;
    }
    return undefined;
  }, [state, insetsTop, bSheetTop, height]);

  const regionCallbackRef = useRef<number | undefined>();
  const onRegionChange = async (payload: { zoomLevel: number; isUserInteraction: boolean; visibleBounds: GeoJSON.Position[] }) => {
    console.debug("zoom", payload.zoomLevel);

    if (!state.matches("map")) {
      return;
    }
    if (regionCallbackRef.current) {
      clearTimeout(regionCallbackRef.current);
    }
    const bounds = fromPositions(payload.visibleBounds);
    if (state.context.filter.displayBounds && isWithinBox(bounds, state.context.filter.displayBounds)) {
      // Avoid refetching
      return;
    }
    onFetchingDisplay(true);
    regionCallbackRef.current = setTimeout(async () => {
      const initialRef = regionCallbackRef.current;

      if (payload.zoomLevel < 8) {
        onFetchingDisplay(false);
        return;
      }
      try {
        if (regionCallbackRef.current === initialRef) {
          // If current timeout is still active, fetch display

          machine.send("DISPLAY", { data: bounds });
          if (payload.zoomLevel >= 8 && bounds) {
            /*  const ctx = { ...state.context };
            ctx.filter.displayBounds = bounds;
            const res = await fetchDisplay(ctx);
            setLianeDisplay(res || lianeDisplay);*/
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

  //const [movingDisplay, setMovingDisplay] = useState<boolean>();
  const appMapRef = useRef<AppMapViewController>(null);

  return (
    <AppMapView
      bounds={mapBounds}
      showGeolocation={state.matches("map")} //&& !movingDisplay}
      onRegionChanged={onRegionChange}
      onStopMovingRegion={() => {
        onMovingStateChanged(false);
        //  setMovingDisplay(false);
        //console.log("map touch end");
      }}
      onStartMovingRegion={() => {
        // setMovingDisplay(true);
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
        (isMatchState && !(state.matches({ match: "idle" }) && state.context.matches!.length === 0))) && (
        <LianeDisplayLayer lianeDisplay={lianeDisplay} loading={loading} useWidth={isMatchState && !loading ? 3 : undefined} />
      )}
      {isMatchState && state.matches({ match: "idle" }) && state.context.matches!.length === 0 && (
        <PotentialLianeLayer from={state.context.filter.from!} to={state.context.filter.to!} />
      )}
      {isDetailState && (
        <LianeMatchRouteLayer
          from={state.context.filter.from!}
          to={state.context.filter.to!}
          match={state.context.selectedMatch!}
          loadingFeatures={lianeDisplay}
        />
      )}

      {isMatchStateIdle && <RallyingPointsDisplayLayer rallyingPoints={pickupsDisplay} cluster={false} interactive={false} />}
      {["map", "point"].some(state.matches) && (
        <RallyingPointsDisplayLayer
          rallyingPoints={lianeDisplay}
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
  const displaySubject = useBehaviorSubject<FeatureCollection>(EmptyFeatureCollection);

  const [m] = useState(() =>
    HomeMapMachine({
      services: {
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
      },
      observables: {
        displaySubject
      }
    })
  );
  const machine = useInterpret(m);
  machine.subscribe(s => console.log(JSON.stringify(s.history?.value)));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HomeMapContext.Provider value={machine}>
        <HomeScreenView displaySource={displaySubject} />
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
