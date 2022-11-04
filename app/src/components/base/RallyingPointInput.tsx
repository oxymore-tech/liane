import { TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { RallyingPoint } from "@/api";
import { AppText } from "@/components/base/AppText";
import { AppAutocomplete } from "@/components/base/AppAutocomplete";
import { getRallyingPoints } from "@/api/client";
import useDebounce from "@/api/hook";
import { getLastKnownLocation } from "@/api/location";

export interface RallyingPointInputProps {
  zIndex?: number;
  placeholder?: string;
  value?: RallyingPoint;
  onChange?: (value: RallyingPoint) => void;
}

async function executeSearch(text?: string) {
  if (text) {
    const location = await getLastKnownLocation();
    return getRallyingPoints(text, location);
  }
  return [];

}

export function RallyingPointInput({ zIndex = 10, placeholder, value, onChange }: RallyingPointInputProps) {

  const [results, setResuls] = useState<RallyingPoint[]>([]);
  const [search, setSearch] = useState(value?.label ?? "");
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    executeSearch(debouncedSearch)
      .then((r) => {
        if (r.length === 1 && r[0].id === value?.id) {
          setResuls([]);
        } else {
          setResuls(r);
        }
      });
  }, [debouncedSearch, value]);

  return (
    <View
      className={`h-10 m-2 z-${zIndex}`}
    >
      <AppAutocomplete
        className="border-0"
        data={results}
        value={search}
        placeholder={placeholder}
        onChangeText={setSearch}
        collapsable
        clearTextOnFocus
        onFocus={() => setSearch("")}
        flatListProps={{
          renderItem: ({ item }) => (
            <TouchableOpacity
              className="bg-gray-100"
              onPress={() => {
                setSearch("");
                if (onChange) {
                  onChange(item);
                }
              }}
            >
              <AppText>{item.label}</AppText>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  );
}
