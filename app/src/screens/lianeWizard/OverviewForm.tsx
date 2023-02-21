import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { CardButton } from "@/components/CardButton";
import { AppIcon } from "@/components/base/AppIcon";
import { AppDimensions } from "@/theme/dimensions";
import { WizardContext, WizardFormData, WizardFormDataKey } from "@/screens/lianeWizard/WizardContext";
import { formatShortMonthDay, formatTime } from "@/api/i18n";
import { LianeWizardFormData, LianeWizardFormKey } from "@/screens/lianeWizard/LianeWizardFormData";
import { useSelector } from "@xstate/react";
import { WithForms } from "@/screens/lianeWizard/Forms";

const horizontalCardSpacing = 12;
const verticalCardSpacing = 8;

const ReturnTrip = ({ onSubmit, onReset }: FormComponentProps<"returnTime">) => {
  const state = useState(null);
  const [showPopup, setShowPopup] = state;
  const machine = useContext(WizardContext);
  const value: LianeWizardFormData["returnTime"] = useSelector(machine, state => state.context.returnTime);

  const ref = useRef(null);

  useEffect(() => {
    if (state[0]) {
      ref.current?.showModal(showPopup.pageX, showPopup.pageY);
      state[0] = null;
    }
  });

  return (
    <Row style={styles.singleCardRow}>
      {value || showPopup ? (
        <CardButton
          key="returnTrip"
          ref={ref}
          useOkButton
          extendedView={WithForms("returnTrip")}
          onCloseExtendedView={isOk => {
            if (isOk) {
              onSubmit();
            } else {
              // TODO : Fix no animation if we rerender component here + freeze on android if set to null to early ...
              setTimeout(() => setShowPopup(null), 800);
              onReset(value);
            }
          }}
          label="Départ à"
          value={value ? formatTime(new Date(value * 1000)) : "--:--"}
          color={AppColorPalettes.blue[500]}
          onCancel={() => {
            setShowPopup(null);
            onReset(null);
            onSubmit();
          }}
        />
      ) : (
        <AppButton
          icon="plus-outline"
          color={AppColorPalettes.blue[500]}
          onPress={event => {
            setShowPopup(event.nativeEvent);
          }}
        />
      )}
    </Row>
  );
};
/*
const ShareList = ({ onItemAdded }: { onItemAdded: Function }) => {
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
*/

export type FormComponentProps<FieldName extends LianeWizardFormKey> = {
  onReset: (oldValue: LianeWizardFormData[FieldName]) => void;
  onSubmit: () => void;
};

type FormCardButtonProps<FieldName extends LianeWizardFormKey> = {
  fieldName: FieldName;
  wizardFormName: WizardFormDataKey;
  label: string;
  valueFormatter: (value: LianeWizardFormData[FieldName]) => string;
} & FormComponentProps<FieldName>;
const FormCardButton = <FieldName extends LianeWizardFormKey>({
  fieldName,
  wizardFormName,
  label,
  valueFormatter,
  onReset,
  onSubmit
}: FormCardButtonProps<FieldName>) => {
  const form = WithForms(wizardFormName);
  const color = WizardFormData[wizardFormName].color;
  const machine = useContext(WizardContext);
  const value: LianeWizardFormData[FieldName] = useSelector(machine, state => state.context[fieldName]);
  const onClosePopup = (validate: boolean) => {
    if (validate) {
      onSubmit();
    } else {
      onReset(value);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <CardButton
        label={label}
        value={valueFormatter(value)}
        color={color}
        extendedView={form}
        useOkButton={true}
        onCloseExtendedView={onClosePopup}
      />
    </View>
  );
};
export const OverviewForm = () => {
  const scrollViewRef = useRef<ScrollView>(null);
  const { send } = useContext(WizardContext);

  const { handleSubmit, setValue } = useFormContext<LianeWizardFormData>();

  const onSubmit = handleSubmit(
    data => {
      send("UPDATE", { data });
    },
    (errors, _) => {
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
              valueFormatter={value => value.label}
              onSubmit={onSubmit}
              onReset={oldValue => setValue("from", oldValue)}
            />
            <FormCardButton
              wizardFormName={"to"}
              fieldName={"to"}
              label={"Arrivée à"}
              valueFormatter={value => value.label}
              onSubmit={onSubmit}
              onReset={oldValue => setValue("to", oldValue)}
            />
          </Row>
          <Row spacing={horizontalCardSpacing}>
            <FormCardButton
              wizardFormName={"date"}
              fieldName={"departureDate"}
              label={"Date"}
              valueFormatter={value => formatShortMonthDay(value)}
              onSubmit={onSubmit}
              onReset={oldValue => setValue("departureDate", oldValue)}
            />
            <FormCardButton
              wizardFormName={"time"}
              fieldName={"departureTime"}
              label={"Départ à"}
              valueFormatter={value => formatTime(value * 1000)}
              onSubmit={onSubmit}
              onReset={oldValue => setValue("departureTime", oldValue)}
            />
          </Row>
          <Row style={styles.singleCardRow}>
            <FormCardButton
              wizardFormName={"vehicle"}
              fieldName={"availableSeats"}
              label={"Véhicule"}
              valueFormatter={value => (value > 0 ? "Oui" : "Non")}
              onSubmit={onSubmit}
              onReset={oldValue => setValue("availableSeats", oldValue)}
            />
          </Row>
        </Column>
      </View>

      <Row spacing={horizontalCardSpacing}>
        <AppIcon name="swap-outline" color={AppColors.white} />
        <AppText style={styles.sectionTitle}>Ajouter un retour</AppText>
      </Row>
      <View style={styles.smallSectionContainer}>
        <ReturnTrip onSubmit={onSubmit} onReset={oldValue => setValue("returnTime", oldValue)} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  containerModal: {
    padding: 4,
    alignItems: "center",
    flex: 1
  },
  formContainer: {
    alignItems: "center",
    flex: 1,
    width: "100%",
    marginBottom: 60,
    justifyContent: "space-between"
  },
  titleModal: {
    fontSize: AppDimensions.textSize.medium,
    paddingTop: 8,
    paddingHorizontal: 16,
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
