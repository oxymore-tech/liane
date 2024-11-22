import React, { useCallback, useContext, useState } from "react";

import { Pressable } from "react-native";
import { CoLianeMatch, CoLianeRequest } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { AppLogger } from "@/api/logger";
import { useAppNavigation } from "@/components/context/routing.ts";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";

type ModalLianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  myModalVisible: boolean;
  setMyModalVisible: (arg0: boolean) => void;
};

export const ModalLianeRequestItem = ({ item, onRefresh, myModalVisible, setMyModalVisible }: ModalLianeRequestItemProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [showLianeNameInput, setLianeNameInputVisible] = useState<boolean>(false);

  const [name, setName] = useState<string>(item.lianeRequest.name);

  const deleteLiane = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.delete(lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
        if (onRefresh) {
          onRefresh();
        }
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", e);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  };

  const renameLiane = useCallback(async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.update(lianeRequest.id, {
          ...lianeRequest,
          name: name,
          wayPoints: lianeRequest.wayPoints.map(w => w.id),
          createdBy: lianeRequest.createdBy.id
        } as CoLianeRequest);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
        setLianeNameInputVisible(false);
        setMyModalVisible(false);
        if (onRefresh) {
          onRefresh();
        }
      } catch (e) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", e);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  }, [item, name, onRefresh, services.community, setMyModalVisible]);

  const isValid = name.length > 0;

  return (
    <SimpleModal visible={myModalVisible} setVisible={setMyModalVisible} backgroundColor={AppColors.white} hideClose>
      {!showLianeNameInput ? (
        <Column>
          <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={() => setLianeNameInputVisible(true)}>
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>
              Renommer la liane
            </AppText>
          </Pressable>
          <Pressable
            style={{ margin: 16, flexDirection: "row" }}
            onPress={() => {
              setMyModalVisible(false);
              navigation.navigate("Publish", {
                initialValue: item.lianeRequest
              });
            }}>
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>
              Modifier la liane
            </AppText>
          </Pressable>
          <Pressable style={{ margin: 16, flexDirection: "row" }} onPress={deleteLiane}>
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>Quitter la liane</AppText>
          </Pressable>
        </Column>
      ) : (
        <Column>
          <AppTextInput value={name} onChangeText={setName} autoFocus={true} placeholder="Choisissez un libéllé pour vous" />
          <Row spacing={8} style={{ justifyContent: "center" }}>
            <AppButton color={AppColors.secondaryColor} onPress={() => setLianeNameInputVisible(false)} value="Annuler" />
            <AppButton disabled={!isValid} color={AppColors.primaryColor} onPress={renameLiane} value="Enregistrer" />
          </Row>
        </Column>
      )}
    </SimpleModal>
  );
};
