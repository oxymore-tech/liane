import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import React, { useContext, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppColors } from "@/theme/colors";
import { CardButton } from "@/components/CardButton";
import { AppIcon } from "@/components/base/AppIcon";
import { AppDimensions } from "@/theme/dimensions";
import { WizardContext, WizardFormData, WizardFormDataKey } from "@/screens/lianeWizard/WizardContext";
import { formatShortMonthDay, formatTime } from "@/api/i18n";
import { LianeWizardFormData } from "@/screens/lianeWizard/LianeWizardFormData";
import { useActor } from "@xstate/react";

const horizontalCardSpacing = 12;
const verticalCardSpacing = 8;

const ReturnTrip = ({ value, setValue, onClosePopup }) => {
  const [showPopup, setShowPopup] = useState(false);
  return (
    <Row style={styles.singleCardRow}>
      {value || showPopup ? (
        <CardButton
          showPopup={showPopup}
          useOkButton
          extendedView={WithForms("returnTrip")}
          onCloseExtendedView={isOk => {
            if (showPopup) {
              setShowPopup(false);
            }
            if (isOk && !value) {
              // Prevent OK clicked but going back to undefined value state
              setValue(1);
            }
            onClosePopup();
          }}
          label="Départ à"
          value={formatTime(new Date(value * 1000))}
          color={AppColors.blue500}
          onCancel={() => setValue(undefined)}
        />
      ) : (
        <AppButton icon="plus-outline" color={AppColors.blue500} onPress={() => setShowPopup(true)} />
      )}
    </Row>
  );
};

const ShareList = ({ onItemAdded }) => {
  const [shareList, setShareList] = useState<string[]>([]);
  const removeItem = (index: number) => {
    shareList.splice(index, 1);
    setShareList([...shareList]);
  };

  const addContact = () => {
    setShareList([...shareList, `Contact ${shareList.length}`]);
    onItemAdded();
  };

  return (
    <Column spacing={8} style={{ alignItems: "flex-start" }}>
      {shareList.map((v, i) => (
        <CardButton value={v} key={i} onCancel={() => removeItem(i)} color={AppColors.blue500} />
      ))}
      <AppButton icon="plus-outline" color={AppColors.blue500} onPress={addContact} />
    </Column>
  );
};

const WithForms = (key: WizardFormDataKey) => {
  const { title, forms } = WizardFormData[key];

  return (
    <Column style={styles.containerModal} spacing={16}>
      <AppText style={styles.titleModal}>{title}</AppText>
      <Column style={styles.formContainer} spacing={16}>
        {forms.map((Form, index) => (
          <Form key={`${key}.field${index}`} />
        ))}
      </Column>
    </Column>
  );
};
export const OverviewForm = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const machineContext = useContext(WizardContext);
  const [state] = useActor(machineContext);
  const { send } = machineContext;

  const { handleSubmit, watch, reset, getValues, setValue } = useFormContext<LianeWizardFormData>();

  //TODO optimize ?
  const formData = watch();

  const onSubmit = data => {
    console.log("UPDATE", { data });
    send("UPDATE", { data: formData });
  };

  const onError = (errors, e) => {
    return console.log(errors);
  };

  const onClosePopup = (validate: boolean) => {
    console.log("dismiss popup", validate, getValues());
    if (validate) {
      handleSubmit(onSubmit, onError); // TODO use () ?
    } else {
      //TODO
      //reset(state.context);
    }
  };

  //TODO voir si renvoyer un composant ou une instance
  const TimeForm = useMemo(() => WithForms("time"), []);

  const DateForm = useMemo(() => WithForms("date"), []);

  const DestinationForm = useMemo(() => WithForms("to"), []);

  const DepartureForm = useMemo(() => WithForms("from"), []);

  const CarDataForm = useMemo(() => WithForms("vehicle"), []);

  return (
    <ScrollView ref={scrollViewRef} style={{ marginTop: 12, marginBottom: 2 }} overScrollMode="never" fadingEdgeLength={24}>
      <View style={styles.mainSectionContainer}>
        <Column spacing={verticalCardSpacing}>
          <Row spacing={horizontalCardSpacing}>
            <CardButton
              label="Départ de"
              value={formData.from.label}
              color={AppColors.orange500}
              extendedView={DepartureForm}
              useOkButton={true}
              onCloseExtendedView={onClosePopup}
            />
            <CardButton
              label="Arrivée à"
              value={formData.to.label}
              color={AppColors.pink500}
              extendedView={DestinationForm}
              useOkButton={true}
              onCloseExtendedView={onClosePopup}
            />
          </Row>
          <Row spacing={horizontalCardSpacing}>
            <CardButton
              label="Date"
              value={formatShortMonthDay(formData.departureDate)}
              color={AppColors.yellow500}
              extendedView={DateForm}
              useOkButton={true}
              onCloseExtendedView={onClosePopup}
            />
            <CardButton
              label="Départ à"
              value={formatTime(formData.departureTime * 1000)}
              color={AppColors.blue500}
              extendedView={TimeForm}
              useOkButton={true}
              onCloseExtendedView={onClosePopup}
            />
          </Row>
          <Row style={styles.singleCardRow}>
            <CardButton
              label="Véhicule"
              value={formData.driverCapacity > 0 ? "Oui" : "Non"}
              color={AppColors.white}
              useOkButton={true}
              extendedView={CarDataForm}
              onCloseExtendedView={onClosePopup}
            />
          </Row>
        </Column>
      </View>

      <Row spacing={horizontalCardSpacing}>
        <AppIcon name="swap-outline" color={AppColors.white} />
        <AppText style={styles.sectionTitle}>Ajouter un retour</AppText>
      </Row>
      <View style={styles.smallSectionContainer}>
        <ReturnTrip value={formData.returnTime} setValue={v => setValue("returnTime", v)} onClosePopup={onClosePopup} />
      </View>

      <Row spacing={horizontalCardSpacing} style={{ alignItems: "center" }}>
        <AppIcon name="share-outline" color={AppColors.white} />
        <AppText style={styles.sectionTitle}>Partager avec</AppText>
      </Row>
      <View style={styles.smallSectionContainer}>
        <ShareList onItemAdded={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }))} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  containerModal: {
    padding: 16,
    alignItems: "center",
    flex: 1
  },
  formContainer: {
    alignItems: "center",
    flex: 1,
    marginTop: 16,
    marginBottom: 40,
    justifyContent: "space-between"
  },
  titleModal: {
    fontSize: AppDimensions.textSize.medium,
    paddingTop: 8,
    paddingHorizontal: 8,
    alignSelf: "flex-start"
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flex: 1,
    height: "100%",
    paddingHorizontal: AppDimensions.bottomBar.itemSpacing
  },
  modalBackground: {
    backgroundColor: AppColors.blue700
  },
  title: {
    fontSize: AppDimensions.textSize.large,
    color: AppColors.white,
    paddingTop: 8,
    paddingHorizontal: 8
  },
  sectionTitle: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "500",
    color: AppColors.white
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  mainSectionContainer: {
    paddingVertical: 16
  },
  smallSectionContainer: {
    marginBottom: 12,
    paddingVertical: 12
  },
  singleCardRow: {
    width: "50%",
    paddingRight: horizontalCardSpacing / 2
  },

  modalBackGround: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 20,
    elevation: 20
  },
  header: {
    width: "100%",
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center"
  }
});
