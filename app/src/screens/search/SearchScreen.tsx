import { Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColorPalettes, AppColors, defaultTextColor } from "@/theme/colors";
import { Column, Row } from "@/components/base/AppLayout";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { AppText } from "@/components/base/AppText";
import { AppDimensions } from "@/theme/dimensions";
import { AppIcon } from "@/components/base/AppIcon";
import { FormProvider, useForm } from "react-hook-form";
import { FormCardButton } from "@/components/forms/FormCardButton";
import { WithForms } from "@/screens/lianeWizard/Forms";
import { WizardFormData } from "@/screens/lianeWizard/WizardContext";
import { DatetimeForm } from "@/components/forms/DatetimeForm";
import { SwitchToggleForm } from "@/components/forms/SelectToggleForm";
import { fromSearchFilter, SearchData, toSearchFilter } from "@/screens/search/SearchFormData";
import { useAppNavigation } from "@/api/navigation";

const DateTimeForm = () => {
  return (
    <Column style={{ paddingBottom: 4, paddingTop: 8 }} spacing={16}>
      <DatetimeForm
        name={"tripDate"}
        backgroundStyle={{
          backgroundColor: AppColorPalettes.yellow[100],
          borderRadius: 16
        }}
        mode={"date"}
      />

      <Column>
        <SwitchToggleForm
          name={"timeIsDepartureTime"}
          color={AppColorPalettes.yellow[100]}
          unselectedColor={AppColorPalettes.yellow[700]}
          defaultValue={true}
          rules={{ required: false }}
          falseLabel={"Arriver avant"}
          trueLabel={"Partir à"}
        />
        <DatetimeForm
          name={"tripTime"}
          backgroundStyle={{
            backgroundColor: AppColorPalettes.yellow[100],
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            marginTop: 1
          }}
          mode={"time"}
        />
      </Column>
    </Column>
  );
};
export const SearchScreen = () => {
  const { route, navigation } = useAppNavigation<"Search">();
  const insets = useSafeAreaInsets();
  const formContext = useForm<SearchData>({
    mode: "onChange",
    defaultValues: route.params?.filter ? fromSearchFilter(route.params?.filter) : undefined
  });
  const { formState, handleSubmit, setValue, getValues } = formContext;
  const submitSearchForm = async (formData: SearchData) => {
    const filter = toSearchFilter(formData);
    navigation.pop();
    navigation.navigate({ name: "SearchResults", params: { filter }, key: "search" });
  };

  return (
    <View style={[styles.page, { backgroundColor: AppColors.darkBlue }]}>
      <Row style={{ paddingVertical: 4 }}>
        <Pressable onPress={navigation.goBack}>
          <AppIcon name="close-outline" size={32} color={AppColors.white} />
        </Pressable>
        <AppText style={[styles.title, { color: AppColors.white }]}>{"Trouver une Liane"} </AppText>
      </Row>
      <FormProvider {...formContext}>
        <Column style={{ flexGrow: 1, marginBottom: insets.bottom }}>
          <Column
            spacing={24}
            style={{
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 20
            }}>
            <Column spacing={8}>
              <FormCardButton
                color={WizardFormData.from.color}
                form={WithForms("from")}
                name={"from"}
                label={"Départ de"}
                valueFormatter={value => value?.label || "--"}
              />
              <FormCardButton
                color={WizardFormData.to.color}
                form={WithForms("to")}
                name={"to"}
                label={"Arrivée à"}
                valueFormatter={value => value?.label || "--"}
              />

              <View
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  right: -12,
                  width: 40
                }}>
                <AppRoundedButton
                  backgroundColor={AppColors.white}
                  text={"flip"}
                  component={<AppIcon name={"flip-outline"} />}
                  onPress={() => {
                    // Switch to & from
                    const from = getValues("from");
                    const to = getValues("to");
                    setValue("to", from);
                    setValue("from", to);
                  }}
                />
              </View>
            </Column>

            <View style={[styles.cardContainer, { backgroundColor: AppColors.yellow }]}>
              <AppText style={[{ color: defaultTextColor(AppColors.yellow) }, styles.label]}>{"Date et heure du trajet"}</AppText>
              <DateTimeForm />
            </View>

            <FormCardButton
              defaultValue={-1}
              color={WizardFormData.vehicle.color}
              form={WithForms("vehicle")}
              name={"availableSeats"}
              label={"Voyageurs"}
              valueFormatter={(value: number) => {
                console.log(value);
                const plural = Math.abs(value) > 1 ? "s" : "";
                return value > 0 ? `Conducteur (${Math.abs(value)} place${plural})` : Math.abs(value) + " passager" + plural;
              }}
            />
          </Column>

          <View style={{ flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 24 }}>
            <AppRoundedButton
              color={defaultTextColor(AppColors.orange)}
              enabled={formState.isValid}
              onPress={() => handleSubmit(submitSearchForm)()}
              backgroundColor={AppColors.orange}
              text={"Lancer la recherche"}
            />
          </View>
        </Column>
      </FormProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 16
  },
  container: {
    borderRadius: 16,
    padding: 16,

    overflow: "scroll",
    justifyContent: "flex-start",
    backgroundColor: AppColorPalettes.blue[100]
  },
  title: { fontSize: 22, fontWeight: "500", color: AppColorPalettes.gray[800], paddingHorizontal: 8, marginBottom: 16 },
  cardContainer: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  label: {
    fontSize: AppDimensions.textSize.default,
    fontWeight: "400",
    marginBottom: 8
  },
  value: {
    fontSize: 18,
    fontWeight: "600"
  }
});
