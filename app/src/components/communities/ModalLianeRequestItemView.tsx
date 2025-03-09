import React, { useCallback, useContext, useState } from "react";
import { CoLianeRequest, ResolvedLianeRequest } from "@liane/common";
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
  lianeRequest?: ResolvedLianeRequest;
  attached?: boolean;
  onRefresh: ((deleted: boolean) => void) | undefined;
  myModalVisible: boolean;
  setMyModalVisible: (arg0: boolean) => void;
};

export const ModalLianeRequestItem = ({ lianeRequest, attached, onRefresh, myModalVisible, setMyModalVisible }: ModalLianeRequestItemProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [showLianeNameInput, setLianeNameInputVisible] = useState<boolean>(false);

  const [name, setName] = useState<string>(lianeRequest?.name ?? "");
  const [deleting, setDeleting] = useState(false);

  const deleteLiane = useCallback(async () => {
    if (!lianeRequest?.id) {
      return;
    }
    Alert.alert(
      "Confirmation",
      attached ? "Êtes-vous sûr de vouloir quitter la liane ?" : "Êtes-vous sûr de vouloir supprimer votre liane ?",
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
              await services.community.delete(lianeRequest.id!);
              if (onRefresh) {
                onRefresh(true);
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
  }, [lianeRequest?.id, attached, services.community, onRefresh]);

  const renameLiane = useCallback(async () => {
    if (!lianeRequest?.id) {
    }
    try {
      const result = await services.community.update(lianeRequest.id, {
        ...lianeRequest,
        name: name,
        wayPoints: lianeRequest.wayPoints.map(w => w.id)
      } as CoLianeRequest);
      AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
      setLianeNameInputVisible(false);
      setMyModalVisible(false);
      if (onRefresh) {
        onRefresh(false);
      }
    } catch (e) {
      AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", e);
    }
  }, [lianeRequest, name, onRefresh, services.community, setMyModalVisible]);

  const isValid = name.length > 0;

  return (
    <SimpleModal visible={lianeRequest && myModalVisible} setVisible={setMyModalVisible} backgroundColor={AppColors.white} hideClose>
      {!showLianeNameInput ? (
        <Column spacing={30} style={{ alignItems: "center" }}>
          <AppButton
            onPress={() => {
              setName(lianeRequest?.name ?? "");
              setLianeNameInputVisible(true);
            }}
            value="Renommer"
            color={AppColors.secondaryColor}
            icon="edit"
            style={{ width: 200 }}
          />
          <AppButton
            onPress={() => {
              navigation.navigate("Publish", {
                initialValue: lianeRequest
              });
            }}
            value="Modifier"
            icon="refresh"
            color={AppColors.secondaryColor}
            style={{ width: 200 }}
          />
          <AppButton onPress={deleteLiane} loading={deleting} value={attached ? "Quitter" : "Supprimer"} icon="log-out" style={{ width: 200 }} />
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
