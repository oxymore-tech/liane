import React, { useCallback, useContext, useState } from "react";
import { CoLianeMatch, CoLianeRequest } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { AppColors } from "@/theme/colors";
import { AppLogger } from "@/api/logger";
import { useAppNavigation } from "@/components/context/routing.ts";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";
import { AppTextInput } from "@/components/base/AppTextInput.tsx";
import { Alert } from "react-native";

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
  const [deleting, setDeleting] = useState(false);

  const deleteLiane = useCallback(async () => {
    if (!item.lianeRequest.id) {
      return;
    }
    Alert.alert(
      "Confirmation",
      item.state.type === "Attached" ? "Êtes-vous sûr de vouloir quitter la liane ?" : "Êtes-vous sûr de vouloir supprimer votre liane ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Continuer",
          onPress: async () => {
            try {
              setDeleting(true);
              await services.community.delete(item.lianeRequest.id!);
              if (onRefresh) {
                onRefresh();
              }
            } finally {
              setDeleting(false);
            }
          },
          style: "destructive"
        }
      ],
      {
        cancelable: true
      }
    );
  }, [item.lianeRequest.id, item.state.type, onRefresh, services.community]);

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
        <Column spacing={30} style={{ alignItems: "center" }}>
          <AppButton
            onPress={() => setLianeNameInputVisible(true)}
            value="Renommer"
            color={AppColors.secondaryColor}
            icon="edit"
            style={{ width: 200 }}
          />
          <AppButton
            onPress={() => {
              setMyModalVisible(false);
              navigation.navigate("Publish", {
                initialValue: item.lianeRequest
              });
            }}
            value="Modifier"
            icon="refresh"
            color={AppColors.secondaryColor}
            style={{ width: 200 }}
          />
          <AppButton
            onPress={deleteLiane}
            loading={deleting}
            value={item.state.type === "Attached" ? "Quitter" : "Supprimer"}
            icon="log-out"
            style={{ width: 200 }}
          />
        </Column>
      ) : (
        <Column spacing={32}>
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
