import { View } from "react-native";
import React, { useCallback, useState } from "react";
import { RallyingPoint } from "@/api";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";
import { getRallyingPoints } from "@/api/client";
import { getLastKnownLocation } from "@/api/location";

export interface RallyingPointInputProps {
  zIndex?: number;
  placeholder?: string;
  value?: RallyingPoint;
  onChange?: (value?: RallyingPoint) => void;
}

export function RallyingPointInput({ zIndex = 100, placeholder, value, onChange }: RallyingPointInputProps) {

  const [results, setResults] = useState<RallyingPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const onSearch = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const location = await getLastKnownLocation();
      const rallyingPoints = await getRallyingPoints(text, location);
      setResults(rallyingPoints);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View>
      <AppAutocomplete
        value={value}
        placeholder={placeholder}
        onSearch={onSearch}
        onChange={onChange}
        items={results}
        zIndex={zIndex}
        loading={loading}
      />
    </View>
  );
}
