import React, { useMemo, useState } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLiane, CoLianeMatch, ResolvedLianeRequest } from "@liane/common";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView.tsx";

type LianeOnMapItemProps = {
  item: CoLiane;
  openLiane: (liane: ResolvedLianeRequest) => void;
};

export const LianeOnMapItem = ({ item, openLiane }: LianeOnMapItemProps) => {
  const { navigation } = useAppNavigation();
  const lianeRequest = item?.members[0]?.lianeRequest;

  if (lianeRequest) {
    const { to, from } = extractWaypointFromTo(lianeRequest?.wayPoints);
    return (
      <View>
        <Pressable style={{ justifyContent: "center", display: "flex" }} onPress={() => openLiane(lianeRequest)}>
          <View>
            <Row style={styles.driverContainer}>
              <Row>
                <View style={styles.headerContainer}>
                  <View
                    style={{
                      backgroundColor: AppColors.backgroundColor,
                      paddingLeft: 10,
                      flex: 1,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: AppColors.grayBackground
                    }}>
                    <View style={{ paddingTop: 10, flexDirection: "row", justifyContent: "flex-start" }}>
                      <AppText
                        style={{
                          fontSize: 20,
                          fontWeight: "normal",
                          flexShrink: 1,
                          lineHeight: 27,
                          color: "black"
                        }}>
                        {`${from?.city}  `}
                      </AppText>
                      <AppText
                        style={{
                          fontSize: 16,
                          fontWeight: "normal",
                          flexShrink: 1,
                          lineHeight: 27,
                          color: AppColors.darkGray
                        }}>
                        {`-  ${from?.label}`}
                      </AppText>
                    </View>
                    <View style={{ paddingBottom: 5, flexDirection: "row", justifyContent: "flex-start" }}>
                      <AppText
                        style={{
                          fontSize: 20,
                          fontWeight: "normal",
                          flexShrink: 1,
                          lineHeight: 27,
                          color: "black"
                        }}>
                        {`${to?.city}  `}
                      </AppText>
                      <AppText
                        style={{
                          fontSize: 16,
                          fontWeight: "normal",
                          flexShrink: 1,
                          lineHeight: 27,
                          color: AppColors.darkGray
                        }}>
                        {`-  ${to?.label}`}
                      </AppText>
                    </View>
                    <View style={{ paddingBottom: 10, flexDirection: "row", justifyContent: "flex-start" }}>
                      <AppText
                        style={{
                          fontSize: 15,
                          fontWeight: "normal",
                          flexShrink: 1,
                          lineHeight: 20,
                          color: AppColors.darkGray
                        }}>
                        {extractDaysOnly(lianeRequest)}
                      </AppText>
                    </View>
                    <View style={{ position: "absolute", top: 10, right: 10 }}>
                      <AppIcon name={"arrow-right"} color={AppColors.darkGray} size={22} />
                    </View>
                    <View style={{ position: "absolute", bottom: 10, right: 10 }}>
                      <JoinedLianeView liane={item} />
                    </View>
                  </View>
                </View>
              </Row>
            </Row>
          </View>
        </Pressable>
      </View>
    );
  }

  return <View />;
};

const styles = StyleSheet.create({
  driverContainer: {
    alignItems: "center"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  subRow: {
    flex: 1,
    alignItems: "flex-end",
    padding: 15
  }
});
