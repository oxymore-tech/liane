import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import React, { useContext, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { CardButton } from "@/components/CardButton";
import { AppIcon } from "@/components/base/AppIcon";
import { AppDimensions } from "@/theme/dimensions";
import { WizardContext, WizardFormData, WizardFormDataKey } from "@/screens/lianeWizard/WizardContext";
import { formatShortMonthDay, formatTime } from "@/api/i18n";
import { LianeWizardFormData, LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { useSelector } from "@xstate/react";
import { Interpreter } from "xstate";
import { WizardStateMachine } from "@/screens/lianeWizard/StateMachine";

const horizontalCardSpacing = 12;
const verticalCardSpacing = 8;

const ReturnTrip = ({ actor, onSubmit, onReset }) => {
  const [showPopup, setShowPopup] = useState(false);

  const value = useSelector(actor, state => state.context.returnTime);

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

            if (isOk) {
              onSubmit();
            } else {
              onReset(value);
            }
          }}
          label="Départ à"
          value={value ? formatTime(new Date(value * 1000)) : "--:--"}
          color={AppColorPalettes.blue[500]}
          onCancel={() => {
            onReset(null);
            onSubmit();
          }}
        />
      ) : (
        <AppButton icon="plus-outline" color={AppColorPalettes.blue[500]} onPress={() => setShowPopup(true)} />
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
        <CardButton value={v} key={i} onCancel={() => removeItem(i)} color={AppColorPalettes.blue[500]} />
      ))}
      <AppButton icon="plus-outline" color={AppColorPalettes.blue[500]} onPress={addContact} />
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

type FormCardButtonProps<FieldName extends LianeWizardFormKey> = {
  fieldName: FieldName;
  wizardFormName: WizardFormDataKey;
  label: string;
  valueFormatter?: (value: LianeWizardFormData[FieldName]) => string;
  onReset: (oldValue: LianeWizardFormData[FieldName]) => void;
  onSubmit: () => void;
  actor: Interpreter<WizardStateMachine>;
};
const FormCardButton = <FieldName extends LianeWizardFormKey>({
  fieldName,
  wizardFormName,
  label,
  valueFormatter,
  onReset,
  onSubmit,
  actor
}: FormCardButtonProps<FieldName>) => {
  const form = WithForms(wizardFormName);
  const color = WizardFormData[wizardFormName].color;
  const value = useSelector(actor, state => state.context[fieldName]);
  const onClosePopup = (validate: boolean) => {
    if (validate) {
      onSubmit();
    } else {
      onReset(value);
    }
  };
  return (
    <CardButton
      label={label}
      value={valueFormatter ? valueFormatter(value) : value}
      color={color}
      extendedView={form}
      useOkButton={true}
      onCloseExtendedView={onClosePopup}
    />
  );
};
export const OverviewForm = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const machineContext = useContext(WizardContext);
  const { send } = machineContext;

  const { handleSubmit, resetField } = useFormContext<LianeWizardFormData>();

  const onSubmit = handleSubmit(
    data => {
      console.log("UPDATE", { data });
      send("UPDATE", { data });
    },
    (errors, e) => {
      return console.log(errors);
    }
  );
  return (
    <ScrollView ref={scrollViewRef} style={{ marginTop: 12, marginBottom: 16 }} overScrollMode="never" fadingEdgeLength={24}>
      <View style={styles.mainSectionContainer}>
        <Column spacing={verticalCardSpacing}>
          <Row spacing={horizontalCardSpacing}>
            <FormCardButton
              wizardFormName={"from"}
              fieldName={"from"}
              label={"Départ de"}
              actor={machineContext}
              valueFormatter={value => value.label}
              onSubmit={onSubmit}
              onReset={oldValue => resetField("from", { defaultValue: oldValue })}
            />
            <FormCardButton
              wizardFormName={"to"}
              fieldName={"to"}
              label={"Arrivée à"}
              actor={machineContext}
              valueFormatter={value => value.label}
              onSubmit={onSubmit}
              onReset={oldValue => resetField("to", { defaultValue: oldValue })}
            />
          </Row>
          <Row spacing={horizontalCardSpacing}>
            <FormCardButton
              wizardFormName={"date"}
              fieldName={"departureDate"}
              label={"Date"}
              actor={machineContext}
              valueFormatter={value => formatShortMonthDay(value)}
              onSubmit={onSubmit}
              onReset={oldValue => resetField("departureDate", { defaultValue: oldValue })}
            />
            <FormCardButton
              wizardFormName={"time"}
              fieldName={"departureTime"}
              label={"Départ à"}
              actor={machineContext}
              valueFormatter={value => formatTime(value * 1000)}
              onSubmit={onSubmit}
              onReset={oldValue => resetField("departureTime", { defaultValue: oldValue })}
            />
          </Row>
          <Row style={styles.singleCardRow}>
            <FormCardButton
              wizardFormName={"vehicle"}
              fieldName={"driverCapacity"}
              label={"Véhicule"}
              actor={machineContext}
              valueFormatter={value => (value > 0 ? "Oui" : "Non")}
              onSubmit={onSubmit}
              onReset={oldValue => resetField("driverCapacity", { defaultValue: oldValue })}
            />
          </Row>
        </Column>
      </View>

      <Row spacing={horizontalCardSpacing}>
        <AppIcon name="swap-outline" color={AppColors.white} />
        <AppText style={styles.sectionTitle}>Ajouter un retour</AppText>
      </Row>
      <View style={styles.smallSectionContainer}>
        <ReturnTrip actor={machineContext} onSubmit={onSubmit} onReset={oldValue => resetField("returnTime", { defaultValue: oldValue })} />
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
    backgroundColor: AppColorPalettes.blue[700]
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
