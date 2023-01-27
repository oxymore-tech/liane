import React, { useCallback, useContext, useState } from "react";
import { RallyingPoint } from "@/api";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";
import { getLastKnownLocation } from "@/api/location";
import { AppContext } from "@/components/ContextProvider";

export interface RallyingPointInputProps {
  placeholder?: string;
  value?: RallyingPoint;
  onChange?: (value?: RallyingPoint) => void;
}

export function RallyingPointInput({ placeholder, value, onChange }: RallyingPointInputProps) {
  const [results, setResults] = useState<RallyingPoint[]>([]);
  const { services } = useContext(AppContext);

  const onSearch = useCallback(async (text: string) => {
    const location = await getLastKnownLocation();
    const rallyingPoints = await services.rallyingPoint.search(text, location);

    setResults(rallyingPoints);
  }, []);

  return <AppAutocomplete value={value} placeholder={placeholder} onSearch={onSearch} onChange={onChange} items={results} />;
}
