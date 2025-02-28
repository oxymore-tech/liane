import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Center, Column } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { useAppNavigation } from "@/components/context/routing";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import AppMapView from "@/components/map/AppMapView.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { LianeMatchLianeRouteLayer } from "@/components/map/layers/LianeMatchRouteLayer.tsx";
import { WayPointDisplay } from "@/components/map/markers/WayPointDisplay.tsx";
import { getBoundingBox, getLianeId, isLiane, WayPoint } from "@liane/common";
import { AppBottomSheet, AppBottomSheetHandleHeight } from "@/components/base/AppBottomSheet.tsx";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DayOfTheWeekPicker } from "@/components/DayOfTheWeekPicker.tsx";
import { AppAvatars } from "@/components/UserPicture.tsx";
import { ContextActions, PendingAction } from "@/components/communities/ContextActions.tsx";
import { FloatingBackButton } from "@/components/FloatingBackButton.tsx";
import { WayPointsView } from "@/components/trip/WayPointsView.tsx";
import { useQueryClient } from "react-query";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { LianeQueryKey } from "@/util/hooks/query.ts";

export const LianeMapDetailScreen = () => {
  const { navigation, route } = useAppNavigation<"LianeMapDetail">();
  const { liane: matchOrLiane, request: lianeRequest } = route.params;

  const { services } = useContext(AppContext);
  const queryClient = useQueryClient();

  const insets = useSafeAreaInsets();

  const [error, setError] = useState<Error | undefined>(undefined);
  const [bSheetTop, setBSheetTop] = useState<number>(0);
  const [wayPoints, setWayPoints] = useState<WayPoint[]>([]);

  const [pendingAction, setPendingAction] = useState<PendingAction>();

  const lianeId = useMemo(() => getLianeId(matchOrLiane), [matchOrLiane]);

  const validate = useCallback(async () => {
    await queryClient.invalidateQueries(LianeQueryKey);
    navigation.goBack();
  }, [navigation, queryClient]);

  const members = useMemo(() => {
    if (isLiane(matchOrLiane)) {
      if (lianeRequest) {
        return [];
      }
      if (!matchOrLiane.members.length) {
        return [matchOrLiane.createdBy];
      }
      return matchOrLiane.members.map(m => m.user);
    } else {
      return matchOrLiane.members;
    }
  }, [lianeRequest, matchOrLiane]);

  useEffect(() => {
    if (!lianeId) {
      return;
    }
    services.community
      .getTrip(lianeRequest?.id ?? lianeId)
      .then(setWayPoints)
      .catch(setError);
  }, [lianeId, lianeRequest, services.community]);

  const mapBounds = useMemo(() => {
    if (wayPoints.length === 0) {
      return;
    }

    const coordinates = wayPoints.map(w => [w.rallyingPoint.location.lng, w.rallyingPoint.location.lat]);
    const bbox = getBoundingBox(coordinates);
    bbox.paddingTop = 24;
    bbox.paddingLeft = 100;
    bbox.paddingRight = 100;
    bbox.paddingBottom = bSheetTop + 50 + 24;
    return bbox;
  }, [bSheetTop, wayPoints]);

  const handleJoin = useCallback(async () => {
    if (lianeRequest && lianeRequest.id) {
      setPendingAction("join");
      try {
        await services.community.joinRequest(lianeRequest.id, lianeId);
        await validate();
      } finally {
        setPendingAction(undefined);
      }
    } else {
      navigation.navigate("Publish", { liane: matchOrLiane });
    }
  }, [lianeId, lianeRequest, matchOrLiane, navigation, services.community, validate]);

  const handleReject = useCallback(async () => {
    if (lianeRequest?.id && lianeId) {
      setPendingAction("reject");
      try {
        await services.community.reject(lianeRequest.id, lianeId);
        await validate();
      } finally {
        setPendingAction(undefined);
      }
    }
  }, [lianeId, lianeRequest?.id, services.community, validate]);

  const handleLeave = useCallback(async () => {
    if (!lianeId) {
      return;
    }
    setPendingAction("leave");
    try {
      await services.community.leave(lianeId);
      await validate();
    } finally {
      setPendingAction(undefined);
    }
  }, [lianeId, services.community, validate]);

  const weekDays = useMemo(() => {
    if (lianeRequest) {
      return lianeRequest.weekDays;
    }
    return matchOrLiane.weekDays;
  }, [lianeRequest, matchOrLiane.weekDays]);

  return (
    <GestureHandlerRootView style={styles.mainContainer}>
      {error && (
        <Center style={{ flex: 1 }}>
          <AppText style={{ color: ContextualColors.redAlert.text }}>{error.message}</AppText>
        </Center>
      )}
      <FloatingBackButton onPress={() => navigation.goBack()} />
      <AppMapView bounds={mapBounds}>
        {lianeId && <LianeMatchLianeRouteLayer wayPoints={wayPoints.map(w => w.rallyingPoint)} lianeId={lianeId} />}
        {wayPoints.map((w, i) => {
          let type: "to" | "from" | "step";
          if (i === 0) {
            type = "from";
          } else if (i === wayPoints.length - 1) {
            type = "to";
          } else {
            type = "step";
          }
          return <WayPointDisplay key={`liane_${w.rallyingPoint.id}`} rallyingPoint={w.rallyingPoint} type={type} />;
        })}
      </AppMapView>
      <AppBottomSheet onChange={v => setBSheetTop(v)} snapPoints={[AppBottomSheetHandleHeight, "50%", "100%"]} index={1}>
        <BottomSheetScrollView style={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 50 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              flex: 1
            }}>
            <ContextActions
              matchOrLiane={matchOrLiane}
              lianeRequest={lianeRequest}
              onJoin={handleJoin}
              onReject={handleReject}
              onLeave={handleLeave}
              pendingAction={pendingAction}
            />
          </View>

          <Column spacing={10} style={styles.bottom}>
            <DayOfTheWeekPicker selectedDays={weekDays} dualOptionMode={true} />
            <WayPointsView wayPoints={wayPoints} style={{ backgroundColor: AppColorPalettes.gray[100], borderRadius: 20 }} dark={false} />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "flex-end",
                marginRight: 10
              }}>
              <AppAvatars users={members} size={40} max={10} />
            </View>
          </Column>
        </BottomSheetScrollView>
      </AppBottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: AppColors.white,
    justifyContent: "flex-start",
    flex: 1,
    height: "100%"
  },
  bottom: {
    marginVertical: 16,
    paddingBottom: 50
  }
});
