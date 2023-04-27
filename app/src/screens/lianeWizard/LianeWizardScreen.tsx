import React, { useContext, useMemo } from "react";
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
import { LianePager } from "@/screens/lianeWizard/LianePager";
import { ModalSizeContext } from "@/components/CardButton";
import { AppContext } from "@/components/ContextProvider";
import { useKeyboardState } from "@/util/hooks/keyboardState";
import { BottomOptionBg } from "@/components/vectors/BottomOptionBg";
import { useQueryClient } from "react-query";
import { LianeQueryKey } from "@/screens/MyTripsScreen";
import { useAppNavigation } from "@/api/navigation";
import { useAppWindowsDimensions } from "@/components/base/AppWindowsSizeProvider";

//TODO animated component
// const AnimatedLianeHouseVector = Animated.createAnimatedComponent(LianeHouseVector);
const DynamicHouseVector = ({ snapPoint }: { snapPoint: number }) => {
  const { height, width } = useAppWindowsDimensions();
  const insets = useSafeAreaInsets();
  const machineContext = useContext(WizardContext);
  // Get inner wizard step
  // @ts-ignore
  const stateValue = useSelector(machineContext, state => state.value.wizard);
  const frontColor = HouseColor[WizardStateSequence.indexOf(stateValue) % HouseColor.length];
  return <LianeHouseVector maxHeight={height * (1 - snapPoint) - insets.top} maxWidth={width * 0.65} frontColor={frontColor} />;
};

// TODO put in theme file
const maxSnapPoint = 0.8;
const defaultSnapPoint = 0.75;
const minHeight = 550;
const modalMargin = 8;
const animDuration = 300;

export const LianeWizardScreen = () => {
  const { route, navigation } = useAppNavigation<"LianeWizard">();
  const formData: LianeWizardFormData | undefined = route.params?.formData;
  const { services } = useContext(AppContext);

  // Listen to keyboard state to hide backdrop when keyboard is visible
  const keyboardIsOpen = useKeyboardState();
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const height = dimensions.height - insets.top;
  const snapPoint = useMemo(() => Math.min(Math.max(defaultSnapPoint, minHeight / height), maxSnapPoint), [height]);

  const backdropDecoration = useMemo(
    () => (
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
    ),
    [snapPoint, height]
  );

  const queryClient = useQueryClient();

  const machine = useMemo(() => {
    const submitLianeForm = async (fd: LianeWizardFormData) => {
      const request = toLianeRequest(fd);
      const lianeResponse = await services.liane.post(request);
      if (lianeResponse) {
        await queryClient.invalidateQueries(LianeQueryKey);
        navigation.popToTop();
        /*  queryClient.setQueryData<Liane[]>(LianeQueryKey, oldData => {
          if (oldData) {
            return [lianeResponse, ...oldData];
          } else {
            return [lianeResponse];
          }
        });
      }*/
      }
      return lianeResponse;
    };

    return CreateLianeContextMachine(submitLianeForm, formData || undefined);
  }, [formData, services.liane, queryClient, navigation]);

  const lianeWizardMachine = useInterpret(machine);

  return (
    <WizardContext.Provider value={lianeWizardMachine}>
      <View style={{ backgroundColor: AppColors.white, flex: 1 }}>
        {keyboardIsOpen ? null : backdropDecoration}

        <Pressable
          style={{ position: "absolute", top: 16 + insets.top, left: 16 }}
          onPress={() => {
            navigation.goBack();
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
    const onSubmit = (data: LianeWizardFormData) => {
      send("NEXT", { data });
    };

    const onError = (errors: any, e: any) => {
      console.log("ERR", errors, e);
    };

    return handleSubmit(onSubmit, onError);
  }, [handleSubmit, send]);

  let title: string;
  let content;
  let bottom = null;
  const isWizardStep = state.matches("wizard");

  if (state.matches("overview")) {
    title = "Votre liane est prête !";
    content = (
      <View style={[styles.contentContainer, { marginBottom: insets.bottom + 36 }]}>
        <OverviewForm />
      </View>
    );
    bottom = (
      <BottomOptionBg color={AppColorPalettes.blue[300]}>
        <AppButton icon={"arrow-right"} title={"Publier"} onPress={() => send("SUBMIT")} />
      </BottomOptionBg>
    );
  } else if (isWizardStep) {
    console.log(state.toStrings());
    // @ts-ignore
    const step = state.toStrings()[1].split(".")[1] as WizardStepsKeys;

    title = WizardFormData[step].title;

    // TODO fix exiting here as well
    content = (
      <View style={{ flex: 1, marginBottom: insets.bottom }}>
        <LianePager onNext={submit} onPrev={() => send("PREV")} step={step} />
      </View>
    );
  } else {
    // Submitting
    title = "Publication en cours...";
    if (state.matches("submitting.failure")) {
      content = null;
      bottom = (
        <BottomOptionBg color={AppColorPalettes.blue[300]}>
          <AppButton color={AppColors.darkBlue} icon={"refresh-outline"} title={"Réessayer"} onPress={() => send("RETRY")} />
        </BottomOptionBg>
      );
    } else {
      content = (
        <View style={{ flex: 1 }}>
          <ActivityIndicator style={{ alignSelf: "center" }} />
        </View>
      );
      bottom = (
        <BottomOptionBg color={AppColorPalettes.blue[300]}>
          <AppButton color={AppColors.darkBlue} icon={"loader-outline"} title={"Annuler"} onPress={() => send("CANCEL")} />
        </BottomOptionBg>
      );
    }
  }

  return (
    <FormProvider {...formContext}>
      <Column style={{ flex: 1 }}>
        <Row style={styles.titleRow}>
          <AppText numberOfLines={1} style={[styles.title, { fontSize: isWizardStep ? 20 : AppDimensions.textSize.large }]}>
            {title}
          </AppText>
        </Row>
        {content}
        {bottom}
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
