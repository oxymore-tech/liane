import React, { useContext, useMemo, useState } from "react";

import { Pressable, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppLogger } from "@/api/logger";
import { useAppNavigation } from "@/components/context/routing.ts";
import { SimpleModal } from "@/components/modal/SimpleModal.tsx";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { TextField } from "@/components/forms/fields/TextField";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";

type ModalLianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  myModalVisible: boolean;
  setMyModalVisible: (arg0: boolean) => void;
};
type FormValues = { name: string };

export const ModalLianeRequestItem = ({ item, onRefresh, myModalVisible, setMyModalVisible }: ModalLianeRequestItemProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const [showLianeNameInput, setLianeNameInputVisible] = useState<boolean>(false);

  const [hasError, setError] = useState<any>();
  const methods = useForm<FormValues>({
    //   mode: "onChange",
    defaultValues: { name: item.lianeRequest.name }
  });
  const { setValue, watch, reset, formState, handleSubmit } = methods;

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
            <AppText style={{ marginLeft: 5, fontSize: 16, fontWeight: "bold", lineHeight: 24, color: AppColors.darkGray }}>Quitter la liane</AppText>
          </Pressable>
        </Column>
      ) : (
        <Column>
          <FormProvider {...methods}>
            <View>
              <TextField name="name" label={"Nom de la liane"} />
            </View>

            <View style={{ paddingTop: 20, flexDirection: "row", justifyContent: "center", gap: 10 }}>
              <AppRoundedButton
                enabled={formState.isValid}
                color={defaultTextColor(AppColors.primaryColor)}
                onPress={() => setLianeNameInputVisible(false)}
                backgroundColor={AppColors.grayBackground}
                text={"Cancel"}
              />
              <View />
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
  );
};
