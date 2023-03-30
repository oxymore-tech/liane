import React, { useCallback, useContext, useState } from "react";
import { RallyingPoint } from "@/api";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";
import { AppContext } from "@/components/ContextProvider";
import { AppText } from "@/components/base/AppText";
import { StyleSheet } from "react-native";
import { Column } from "@/components/base/AppLayout";

const ResultView = ({ item }: { item: RallyingPoint }) => {
  return (
    <Column>
      <AppText style={styles.item}>{item.label}</AppText>
      <AppText>
        <AppText style={{ fontWeight: "bold" }}>{item.city}</AppText>, {item.zipCode}
      </AppText>
    </Column>
  );
};

export interface RallyingPointInputProps {
  placeholder?: string;
  value?: RallyingPoint;
  onChange?: (value?: RallyingPoint) => void;
  trailing?: JSX.Element;
}

export function RallyingPointInput({ placeholder, value, onChange, trailing }: RallyingPointInputProps) {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services, position } = useContext(AppContext);
  // TODO use position from service

  const onSearch = useCallback(
    async (text: string) => {
      const rallyingPoints = await services.rallyingPoint.search(text, position);

      setResults(rallyingPoints);
    },
    [position, services.rallyingPoint]
  );

  return (
    <AppAutocomplete
      trailing={trailing}
      value={value}
      placeholder={placeholder}
      onSearch={onSearch}
      onChange={onChange}
      items={results}
      renderItem={item => <ResultView item={item} />}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    fontSize: 16
  }
});
