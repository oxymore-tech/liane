import React, { useContext, useMemo, useState } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch, RallyingPointPropertiesLabels, RallyingPointRequest } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import App from "@/App.tsx";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { TextField } from "@/components/forms/fields/TextField";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};
type FormValues = { name: string };

export const LianeRequestItem = ({ item, onRefresh, unreadLianes }: LianeRequestItemProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const [showLianeNameInput, setLianeNameInputVisible] = useState<boolean>(false);

  const [hasError, setError] = useState<any>();
  const methods = useForm<FormValues>({
    //   mode: "onChange",
    defaultValues: { name: "" }
  });
  const { setValue, watch, reset, formState, handleSubmit } = methods;

  const { to, from } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);

  const deleteLiane = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.delete(lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  };

  const renameLiane = async (name: string) => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        let newLiane = lianeRequest;
        newLiane.name = name;
        const result = await services.community.update(lianeRequest.id, newLiane);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
        setLianeNameInputVisible(false);
        setMyModalVisible(false);
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async data => {
    try {
      await renameLiane(data.name);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <View>
      <Pressable
        style={{ justifyContent: "center", display: "flex", marginRight: 20 }}
        onPress={() => item.state.type === "Attached" && navigation.navigate("CommunitiesChat", { liane: item.state.liane })}>
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
                  <View style={{ padding: 10 }}>
                    <AppText
                      style={{
                        fontSize: 22,
                        fontWeight: "500",
                        flexShrink: 1,
                        lineHeight: 27,
                        color: "black"
                      }}>
                      {item?.lianeRequest?.name}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        flexShrink: 1,
                        lineHeight: 27,
                        color: "black"
                      }}>
                      {`${from.city}`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        flexShrink: 1,
                        lineHeight: 27,
                        color: "black"
                      }}>
                      {`${to.city}`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 15,
                        fontWeight: "500",
                        flexShrink: 1,
                        lineHeight: 20,
                        color: AppColors.darkGray
                      }}>
                      {extractDaysOnly(item.lianeRequest)}
                    </AppText>
                    <Pressable
                      style={{ position: "absolute", top: 10, right: 10 }}
                      onPress={event => {
                        setMyModalVisible(true);
                      }}>
                      <AppIcon name={"edit-2-outline"} color={AppColors.darkGray} size={22} />
                    </Pressable>
                    <View style={styles.subRowsContainer}>
                      {item.state.type === "Detached" && <DetachedLianeItem lianeRequest={item.lianeRequest} state={item.state} />}

                      {item.state.type === "Pending" && (
                        <Row style={styles.subRow}>
                          <AppText style={{ fontSize: 14, fontWeight: "bold", lineHeight: 23, color: AppColors.black }}>
                            en attente de validation
                          </AppText>
                        </Row>
                      )}

                      {item.state.type === "Attached" && (
                        <Row style={styles.subRow}>
                          <JoinedLianeView liane={item.state.liane} />
                        </Row>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </Row>
          </Row>
        </View>
      </Pressable>
      <SimpleModal visible={myModalVisible} setVisible={setMyModalVisible} backgroundColor={AppColors.white} hideClose>
        {!showLianeNameInput ? (
          <Column>
            <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={() => setLianeNameInputVisible(true)}>
              <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>
                Renommer la liane
              </AppText>
            </Pressable>
            <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={() => setMyModalVisible(false)}>
              <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>
                Modifier la liane
              </AppText>
            </Pressable>
            <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={deleteLiane}>
              <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>
                Quitter la liane
              </AppText>
            </Pressable>
          </Column>
        ) : (
          <Column>
            <FormProvider {...methods}>
              <View>
                <TextField name="name" label={"Nom de la liane"} />
              </View>

              <View>
                <AppRoundedButton
                  enabled={formState.isValid}
                  color={defaultTextColor(AppColors.primaryColor)}
                  onPress={handleSubmit(onSubmit, setError)}
                  backgroundColor={AppColors.primaryColor}
                  text={"Envoyer"}
                />
              </View>
            </FormProvider>
          </Column>
        )}
      </SimpleModal>
    </View>
  );
};

const styles = StyleSheet.create({
  driverContainer: {
    alignItems: "center"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  subRowsContainer: {
    marginLeft: 28,
    marginRight: 10,
    alignItems: "flex-end",
    backgroundColor: AppColors.backgroundColor,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    display: "flex"
  },
  subRow: {
    flex: 1,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grayBackground,
    padding: 15
  }
});
