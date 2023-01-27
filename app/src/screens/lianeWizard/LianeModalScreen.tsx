import React, { useContext, useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActor, useInterpret } from "@xstate/react";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { LianeHouseVector } from "@/components/LianeHouseVector";
import { WizardContext, WizardFormData } from "@/screens/lianeWizard/WizardContext";

import { AppDimensions } from "@/theme/dimensions";
import { AppColors, HouseColor } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { OverviewForm } from "@/screens/lianeWizard/OverviewForm";
import { Column, Row } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";
import { FormProvider, useForm } from "react-hook-form";
import { CreateLianeContextMachine, WizardStateSequence, WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { AppIcon } from "@/components/base/AppIcon";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ParamListBase } from "@react-navigation/native";
import { LianePager } from "@/screens/lianeWizard/LianePager";

export interface LianeModalScreenParams extends ParamListBase {
  lianeRequest?: LianeWizardFormData;
}

//TODO animated component
const DynamicHouseVector = () => {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const machineContext = useContext(WizardContext);
  const [state] = useActor(machineContext);
  const index = WizardStateSequence.indexOf(state.value);
  return <LianeHouseVector maxHeight={height * 0.25 - insets.top} maxWidth={width * 0.65} frontColor={HouseColor[index % HouseColor.length]} />;
};

export const LianeModalScreen = ({ navigation, route }: NativeStackScreenProps<LianeModalScreenParams, "LianeWizard">) => {
  const lianeRequest = route.params?.lianeRequest;
  const insets = useSafeAreaInsets();
  const machine = CreateLianeContextMachine(lianeRequest);
  const lianeWizardMachine = useInterpret(machine);

  const closeWizard = () => {
    navigation.goBack();
  };

  const backdropDecoration = (
    <View
      style={{
        paddingTop: insets.top + 1,
        paddingRight: 24,
        alignItems: "flex-end"
      }}>
      <DynamicHouseVector />
    </View>
  );

  const snapPoint = 0.75;
  const animDuration = 300;
  const { height } = useWindowDimensions();
  //  <LianeWizard />
  return (
    <WizardContext.Provider value={lianeWizardMachine}>
      <View style={{ backgroundColor: AppColors.white, flex: 1 }}>
        {backdropDecoration}

        <Pressable
          style={{ position: "absolute", top: 16 + insets.top, left: 16 }}
          onPress={() => {
            closeWizard();
          }}>
          <AppIcon name="close-outline" size={32} />
        </Pressable>
      </View>
      <Animated.View
        entering={SlideInDown.duration(animDuration)}
        style={{
          top: height * (1 - snapPoint),
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: AppColors.blue700,
          borderTopRightRadius: AppDimensions.borderRadius,
          borderTopLeftRadius: AppDimensions.borderRadius
        }}>
        <LianeWizard closeModal={closeWizard} />
      </Animated.View>
    </WizardContext.Provider>
  );
};

const LianeWizard = ({ closeModal }) => {
  const insets = useSafeAreaInsets();
  const machineContext = useContext(WizardContext);
  const [state] = useActor(machineContext);
  const { send } = machineContext;

  const isWizardStep = !state.matches("final");

  const formContext = useForm<LianeWizardFormData>({
    defaultValues: state.context
  });

  const { getValues, handleSubmit, formState } = formContext;
  const submit = useMemo(() => {
    const onSubmit = data => {
      send("NEXT", { data: getValues() });
    };

    const onError = (errors, e) => {
      console.log("ERR", errors, e);
    };

    return handleSubmit(onSubmit, onError);
  }, [handleSubmit]);

  let title: string;
  let content;

  if (isWizardStep) {
    const step = state.value as WizardStepsKeys;
    title = WizardFormData[step].title;

    // TODO fix exiting here as well
    content = (
      <View style={{ flex: 1, marginBottom: insets.bottom }}>
        <LianePager onNext={submit} onPrev={() => send("PREV")} step={state.value as WizardStepsKeys} />
      </View>
    );
  } else {
    title = "Lancer une Liane";
    content = (
      <View style={[styles.contentContainer, { marginBottom: insets.bottom + 36 }]}>
        <OverviewForm />
      </View>
    );
  }

  return (
    <FormProvider {...formContext}>
      <Column style={{ flex: 1 }}>
        <Row style={styles.titleRow}>
          <AppText numberOfLines={1} style={[styles.title, { fontSize: isWizardStep ? 20 : AppDimensions.textSize.large }]}>
            {title}
          </AppText>

          {!isWizardStep && (
            <View
              style={{
                alignSelf: "center",
                paddingTop: 8,
                paddingHorizontal: 8
              }}>
              <AppButton
                onPress={() => {
                  // send liane request

                  // close modal
                  closeModal();
                }}
                icon="arrow-right"
                color={AppColors.white}
                kind="circular"
                foregroundColor={AppColors.orange500}
              />
            </View>
          )}
        </Row>
        {content}
      </Column>
    </FormProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flex: 1,
    height: "100%",
    paddingHorizontal: AppDimensions.bottomBar.itemSpacing
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: AppDimensions.textSize.large,
    color: AppColors.white,
    paddingVertical: 8,
    paddingHorizontal: 8
  },
  sectionTitle: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "500",
    color: AppColors.white
  },
  contentContainer: {
    paddingHorizontal: 16
  }
});
