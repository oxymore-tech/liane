import React, { useCallback, useContext, useState } from "react";
import { RallyingPoint } from "@/api";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";
import { AppContext } from "@/components/ContextProvider";

export interface RallyingPointInputProps {
  placeholder?: string;
  value?: RallyingPoint;
  onChange?: (value?: RallyingPoint) => void;
}

export function RallyingPointInput({ placeholder, value, onChange }: RallyingPointInputProps) {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services, position } = useContext(AppContext);

  const onSearch = useCallback(
    async (text: string) => {
      const rallyingPoints = await services.rallyingPoint.search(text, position);

      setResults(rallyingPoints);
    },
    [position, services.rallyingPoint]
  );

  return <AppAutocomplete value={value} placeholder={placeholder} onSearch={onSearch} onChange={onChange} items={results} />;
}
