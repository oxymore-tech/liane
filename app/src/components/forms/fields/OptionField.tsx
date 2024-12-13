import { useController } from "react-hook-form";
import { AppToggle } from "@/components/base/AppOptionToggle";
import React from "react";
import { Dropdown } from "react-native-element-dropdown";
import { AppStyles } from "@/theme/styles";
import { AppColorPalettes, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { Column } from "@/components/base/AppLayout";

export const OptionField = ({ name, defaultIndex = 0, options }: { name: string; defaultIndex?: number; options: string[] | readonly string[] }) => {
  const defaultValue = options[defaultIndex];
  const { field } = useController({ name, rules: { required: true }, defaultValue });
  return <AppToggle options={options} defaultSelectedValue={defaultValue} onSelectValue={field.onChange} />;
};

export const OptionDropdownField = ({
  name,
  label,
  defaultIndex = 0,
  options
}: {
  name: string;
  label: string;
  defaultIndex?: number;
  options: { key: string; label: string }[];
}) => {
  const defaultValue = defaultIndex ? options[defaultIndex] : undefined;
  const { field } = useController({ name, rules: { required: true }, defaultValue });

  return (
    <Column>
      <AppText style={{ opacity: field.value ? 1 : 0, marginLeft: 16 }}>{label}</AppText>
      <Dropdown
        style={[AppStyles.inputContainer, { borderColor: !field.value ? ContextualColors.redAlert.bg : AppColorPalettes.gray[200] }]}
        containerStyle={{ marginHorizontal: 16, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}
        itemTextStyle={AppStyles.text}
        selectedTextStyle={AppStyles.text}
        value={defaultValue || field.value}
        placeholder={label}
        placeholderStyle={{ color: AppColorPalettes.gray[500] }}
        data={options}
        labelField={"label"}
        valueField={"key"}
        onChange={v => field.onChange(v.key)}
      />
    </Column>
  );
};
