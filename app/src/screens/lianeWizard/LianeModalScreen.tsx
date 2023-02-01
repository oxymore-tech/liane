import React, { useContext, useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActor, useInterpret, useSelector } from "@xstate/react";
import Animated, { SlideInDown } from "react-native-reanimated";
import { LianeHouseVector } from "@/components/vectors/LianeHouseVector";
import { WizardContext, WizardFormData } from "@/screens/lianeWizard/WizardContext";

import { AppDimensions } from "@/theme/dimensions";
import { AppColorPalettes, AppColors, HouseColor } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { OverviewForm } from "@/screens/lianeWizard/OverviewForm";
import { Column, Row } from "@/components/base/AppLayout";
import { AppButton } from "@/components/base/AppButton";
import { LianeWizardFormData, toLianeRequest } from "@/screens/lianeWizard/LianeWizardFormData";
import { FormProvider, useForm } from "react-hook-form";
import { CreateLianeContextMachine, WizardStateSequence, WizardStepsKeys } from "@/screens/lianeWizard/StateMachine";
import { AppIcon } from "@/components/base/AppIcon";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ParamListBase } from "@react-navigation/native";
import { LianePager } from "@/screens/lianeWizard/LianePager";
import { ModalSizeContext } from "@/components/CardButton";
import { AppContext } from "@/components/ContextProvider";
import { useKeyboardState } from "@/components/utils/KeyboardStateHook";

export interface LianeModalScreenParams extends ParamListBase {
  lianeRequest?: LianeWizardFormData;
  // Name of the route to return to and pass LianeModalScreenResponseParams
  origin?: string;
}

export interface LianeModalScreenResponseParams extends ParamListBase {
  lianeResponse?: LianeWizardFormData;
}

//TODO animated component
// const AnimatedLianeHouseVector = Animated.createAnimatedComponent(LianeHouseVector);
const DynamicHouseVector = ({ snapPoint }) => {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const machineContext = useContext(WizardContext);
  const stateValue = useSelector(machineContext, state => state.value);
  const frontColor = HouseColor[WizardStateSequence.indexOf(stateValue) % HouseColor.length];
  return <LianeHouseVector maxHeight={height * (1 - snapPoint) - insets.top} maxWidth={width * 0.65} frontColor={frontColor} />;
};

const maxSnapPoint = 0.8;
const defaultSnapPoint = 0.75;
const minHeight = 550;

export const LianeModalScreen = ({ navigation, route }: NativeStackScreenProps<LianeModalScreenParams, "LianeWizard">) => {
  // TODO read route param const liane = route.params?.liane;
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const height = dimensions.height - insets.top;
  const { services } = useContext(AppContext);
  const machine = useMemo(() => CreateLianeContextMachine(), []);
  const lianeWizardMachine = useInterpret(machine);

  // Listen to keyboard state to hide backdrop when keyboard is visible
  const keyboardIsOpen = useKeyboardState();

  useEffect(() => {
    const onDoneListener = async event => {
      // Post liane request
      const request = toLianeRequest(event.data);
      const lianeResponse = await services.liane.post(request);
      // Pass response
      if (route.params?.origin) {
        navigation.navigate({
          name: route.params?.origin,
          params: { lianeResponse },
          merge: true
        });
      } else {
        navigation.goBack();
      }
    };
    lianeWizardMachine.onDone(onDoneListener);
    return () => lianeWizardMachine.off(onDoneListener);
  }, [lianeWizardMachine]);

  const snapPoint = Math.min(Math.max(defaultSnapPoint, minHeight / height), maxSnapPoint);
  const modalMargin = 8;

  const closeWizard = () => {
    navigation.goBack();
  };

  const backdropDecoration = (
    <View
      style={{
        position: "absolute",
        right: 32,
        top: 0,
        height: height * (1 - snapPoint) + 1,
        justifyContent: "flex-end"
      }}>
      <DynamicHouseVector snapPoint={snapPoint} />
    </View>
  );

  const animDuration = 300;

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
          top: keyboardIsOpen ? 0 : height * (1 - snapPoint),
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: AppColorPalettes.blue[700],
          paddingTop: keyboardIsOpen ? insets.top : 0,
          borderTopRightRadius: keyboardIsOpen ? 0 : AppDimensions.borderRadius,
          borderTopLeftRadius: keyboardIsOpen ? 0 : AppDimensions.borderRadius
        }}>
        <ModalSizeContext.Provider
          value={{
            top: keyboardIsOpen ? 0 : height * (1 - snapPoint) + modalMargin,
            right: modalMargin,
            left: modalMargin,
            bottom: insets.bottom + modalMargin
          }}>
          <LianeWizard />
        </ModalSizeContext.Provider>
      </Animated.View>
    </WizardContext.Provider>
  );
};

const LianeWizard = () => {
  const insets = useSafeAreaInsets();
  const machineContext = useContext(WizardContext);
  const [state] = useActor(machineContext);
  const { send } = machineContext;

  const formContext = useForm<LianeWizardFormData>({
    defaultValues: state.context
  });

  const { handleSubmit } = formContext;
  const submit = useMemo(() => {
    const onSubmit = data => {
      send("NEXT", { data });
    };

    const onError = (errors, e) => {
      console.log("ERR", errors, e);
    };

    return handleSubmit(onSubmit, onError);
  }, [handleSubmit, send]);

  let title: string;
  let content;
  let action;
  let isWizardStep = false;

  if (state.matches("overview")) {
    title = "Lancer une Liane";
    content = (
      <View style={[styles.contentContainer, { marginBottom: insets.bottom + 36 }]}>
        <OverviewForm />
      </View>
    );
    action = (
      <View
        style={{
          alignSelf: "center",
          paddingTop: 8,
          paddingHorizontal: 8
        }}>
        <AppButton
          onPress={() => {
            // send liane request
            send("SUBMIT");
            // close modal
            // TODO
          }}
          icon="arrow-right"
          color={AppColors.white}
          kind="circular"
          foregroundColor={AppColorPalettes.orange[500]}
        />
      </View>
    );
  } else if (state.matches("submitted")) {
    console.log("render submitted");
    title = "Lancer une Liane";
    content = <ActivityIndicator style={{ alignSelf: "center" }} />;
  } else {
    // wizard step
    isWizardStep = true;
    const step = state.value as WizardStepsKeys;
    title = WizardFormData[step].title;

    // TODO fix exiting here as well
    content = (
      <View style={{ flex: 1, marginBottom: insets.bottom }}>
        <LianePager onNext={submit} onPrev={() => send("PREV")} step={state.value as WizardStepsKeys} />
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
          {action}
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
