import { ActivityIndicator, StyleSheet, View } from "react-native";
import React, { useContext, useMemo, useRef, useState } from "react";
import AppMapView, {
  AppMapViewController,
  LianeDisplayLayer,
  LianeMatchRouteLayer,
  RallyingPointsDisplayLayer,
  WayPointDisplay
} from "@/components/map/AppMapView";
import { AppStyles } from "@/theme/styles";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { getPoint, RallyingPoint } from "@/api";
import { AppContext } from "@/components/ContextProvider";
import { Center, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { GeoJSON } from "geojson";
import { isWithinBox, fromPositions } from "@/api/geo";
import { FloatingBackButton, HomeHeader, ItineraryFormHeader, RallyingPointHeader } from "@/screens/home/HomeHeader";
import { FilterListView, HomeBottomSheetContainer, LianeMatchDetail } from "@/screens/home/BottomSheetView";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ItinerarySearchForm } from "@/screens/home/ItinerarySearchForm";
import { useActor, useInterpret } from "@xstate/react";
import { filterHasFullTrip, getSearchFilter, HomeMapContext, HomeMapMachine } from "@/screens/home/StateMachine";
import { getBoundingBox } from "@/util/geometry";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { AppIcon } from "@/components/base/AppIcon";

const HomeScreenView = () => {
  const { services } = useContext(AppContext);
  // const { navigation } = useAppNavigation<"Home">();

  const [movingDisplay, setMovingDisplay] = useState<boolean>(false);
  const [isLoadingDisplay, setLoadingDisplay] = useState<boolean>(false);

  const [rallyingPointsDisplay, setRallyingPointsDisplay] = useState<RallyingPoint[]>([]);

  const appMapRef = useRef<AppMapViewController>();
  const regionCallbackRef = useRef<number | undefined>();

  const machine = useContext(HomeMapContext);
  const [state] = useActor(machine);

  const lianeDisplay =
    state.context.lianeDisplay && state.matches("detail")
      ? {
          ...state.context.lianeDisplay,
          segments: state.context.lianeDisplay.segments.filter(s => s.lianes.includes(state.context.selectedMatch!.liane.id!))
        }
      : state.context.lianeDisplay;

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
    console.log("map stopped moving");
    if (state.context.filter.displayBounds && isWithinBox(bounds, state.context.filter.displayBounds)) {
      // Avoid refetching
      return;
    }
    setLoadingDisplay(true);
    regionCallbackRef.current = setTimeout(async () => {
      const initialRef = regionCallbackRef.current;

      if (payload.zoomLevel < 8) {
        // setLianeDisplay(undefined);
        setRallyingPointsDisplay([]);
        setLoadingDisplay(false);
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
          setLoadingDisplay(false);
        }
      }
    }, 1000);
  };

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
      bbox.paddingBottom = 220; //TODO variable scroll

      return bbox;
    } else if (state.matches("match")) {
      // Set bounds
      const { from, to } = state.context.filter!;

      const bbox = getBoundingBox([
        [from!.location.lng, from!.location.lat],
        [to!.location.lng, to!.location.lat]
      ]);
      console.debug(from, to, bbox);
      bbox.paddingTop = 216;
      bbox.paddingLeft = 40;
      bbox.paddingRight = 40;
      bbox.paddingBottom = 220; //TODO variable scroll
      return bbox;
    }
    return undefined;
  }, [state]);

  const loading = Object.values(state.value).find(s => s === "init" || s === "load") !== undefined;
  const loadingDisplay = isLoadingDisplay || (loading && state.context.reloadCause === "display");
  const loadingList = loading && !state.context.reloadCause;
  console.log(state.value);

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

  return (
    <View style={styles.page}>
      <View style={styles.container}>
        <AppMapView
          bounds={mapBounds}
          showGeolocation={state.matches("map") && !movingDisplay}
          onRegionChanged={onRegionChange}
          onStopMovingRegion={() => {
            setMovingDisplay(false);
            console.log("map touch end");
          }}
          onStartMovingRegion={() => {
            setMovingDisplay(true);
            console.log("map moving");
          }}
          ref={appMapRef}
          onSelectLocation={loc => {
            console.debug("sel loc", loc);
            appMapRef.current?.setCenter(loc, 12.1);
          }}>
          {["map", "match"].some(state.matches) && <LianeDisplayLayer lianeDisplay={lianeDisplay} loading={loadingDisplay || loadingList} />}
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
      </View>
      {state.matches("form") && (
        <Animated.View // entering={FadeInDown} exiting={FadeOutDown}
          style={[styles.container, { backgroundColor: AppColors.white }]}
        />
      )}

      {state.matches("map") && <HomeHeader onPress={() => machine.send("FORM")} />}
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

      {(() => {
        console.log(
          "debug show bSheet: ",
          !loadingDisplay,
          lianeDisplay !== undefined,
          ["point", "detail", "match"].some(state.matches) || (!movingDisplay && state.matches("map")),
          !movingDisplay
        );
        return (
          <HomeBottomSheetContainer
            display={
              !loadingDisplay && lianeDisplay && (["point", "detail", "match"].some(state.matches) || (!movingDisplay && state.matches("map")))
            }>
            {state.matches("map") && (
              <Row
                style={{
                  height: 40,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: AppColorPalettes.gray[200],
                  marginBottom: 16,
                  paddingHorizontal: 4
                }}>
                <Center
                  style={{
                    backgroundColor: AppColorPalettes.blue[700],
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 8,
                    height: 44,
                    position: "relative",
                    top: -2
                  }}>
                  <AppIcon name={"pin-outline"} size={18} color={AppColors.white} />
                  <AppText style={{ fontWeight: "bold", color: AppColors.white }}>A proximité</AppText>
                </Center>
                <Center style={{ paddingHorizontal: 12, height: 40, paddingVertical: 4 }}>
                  <AppIcon name={"star-outline"} size={18} />
                  <AppText style={{ fontWeight: "bold" }}>Favoris</AppText>
                </Center>
              </Row>
            )}
            {!isDetailState && <FilterListView loading={loadingList} />}
            {!loadingList && isDetailState && <LianeMatchDetail lianeMatch={state.context.selectedMatch!} />}
            {/*loadingList && isDetailState && <ActivityIndicator />*/}
          </HomeBottomSheetContainer>
        );
      })()}

      {loadingDisplay && (
        <Row style={[styles.loaderContainer, AppStyles.shadow]} spacing={8}>
          <ActivityIndicator color={AppColors.darkBlue} />
          <AppText>Chargement...</AppText>
        </Row>
      )}
    </View>
  );
};
const HomeScreen = () => {
  const { services } = useContext(AppContext);

  const m = useMemo(
    () =>
      HomeMapMachine({
        match: ctx => services.liane.match2(getSearchFilter(ctx.filter)),
        cacheRecentTrip: trip => services.location.cacheRecentTrip(trip).catch(e => console.error(e)),
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
  floatingSearchBar: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    position: "absolute",
    width: "100%"
  },
  loaderContainer: {
    position: "absolute",
    bottom: 96,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: AppColorPalettes.blue[100],
    alignSelf: "center",
    borderRadius: 24
  }
});
