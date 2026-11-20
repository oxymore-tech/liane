"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Field,
  Label,
} from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchRallyingPoints } from "@/api/lianes";
import type { RallyingPoint } from "@/api/types";
import { useDebounce } from "@/components/hooks";
import { DEFAULT_VIEW } from "@/components/map/map-style";
import {
  fieldClass,
  floatingClass,
  labelClass,
  mutedClass,
  optionClass,
} from "@/components/ui";
import { cn } from "@/components/utils";

const DEFAULT_NEAR = {
  lat: DEFAULT_VIEW.latitude,
  lng: DEFAULT_VIEW.longitude,
};

export const placeName = (place: RallyingPoint) =>
  place.city && place.city !== place.label
    ? `${place.city} – ${place.label}`
    : place.label;

/**
 * Un lieu choisi parmi les communes et points de ralliement, en tapant le début de son nom.
 * Les suggestions les plus proches de `near` viennent en premier.
 */
export function PlaceField({
  label,
  placeholder,
  value,
  onChange,
  near = DEFAULT_NEAR,
}: {
  label: string;
  placeholder: string;
  value: RallyingPoint | null;
  onChange: (place: RallyingPoint | null) => void;
  near?: { lat: number; lng: number };
}) {
  const [text, setText] = useState("");
  const search = useDebounce(text.trim(), 300);
  const { data: places } = useQuery({
    queryKey: ["rallying-points", search, near.lat, near.lng],
    queryFn: () => searchRallyingPoints(search, near),
    enabled: search.length >= 2,
  });
  const suggestions = search.length >= 2 ? places : undefined;

  return (
    <Field>
      <Label className={labelClass}>{label}</Label>
      <Combobox
        value={value}
        by="id"
        onChange={onChange}
        onClose={() => setText("")}
      >
        <ComboboxInput
          type="search"
          autoComplete="off"
          className={fieldClass}
          placeholder={placeholder}
          displayValue={(place: RallyingPoint | null) =>
            place ? placeName(place) : ""
          }
          onChange={(event) => setText(event.target.value)}
        />
        <ComboboxOptions
          anchor={{ to: "bottom start", gap: 4 }}
          className={cn(floatingClass, "w-(--input-width) empty:invisible")}
        >
          {suggestions?.length === 0 && (
            <p className={cn(mutedClass, "px-3 py-2")}>
              Aucun lieu trouvé. Essayez le nom de la commune.
            </p>
          )}
          {suggestions?.map((place) => (
            <ComboboxOption
              key={place.id}
              value={place}
              className={optionClass}
            >
              <span className="min-w-0 flex-1">
                {place.label}
                <span className="block text-sm text-gris">
                  {place.zip_code} {place.city}
                </span>
              </span>
            </ComboboxOption>
          ))}
        </ComboboxOptions>
      </Combobox>
    </Field>
  );
}
