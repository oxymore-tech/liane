"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchRallyingPoints } from "@/api/lianes";
import type { RallyingPoint } from "@/api/types";
import { useDebounce } from "@/components/hooks";
import { DEFAULT_VIEW } from "@/components/map/map-style";
import { fieldClass } from "@/components/ui";

const NEAR = { lat: DEFAULT_VIEW.latitude, lng: DEFAULT_VIEW.longitude };

export const placeName = (place: RallyingPoint) =>
  place.city && place.city !== place.label
    ? `${place.city} – ${place.label}`
    : place.label;

/** Un lieu choisi parmi les communes et points de ralliement, en tapant le début de son nom. */
export function PlaceField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: RallyingPoint | null;
  onChange: (place: RallyingPoint | null) => void;
}) {
  const [text, setText] = useState("");
  const search = useDebounce(text.trim(), 300);
  const { data: places } = useQuery({
    queryKey: ["rallying-points", search, NEAR.lat, NEAR.lng],
    queryFn: () => searchRallyingPoints(search, NEAR),
    enabled: !value && search.length >= 2,
  });

  return (
    <div>
      <label className="text-base font-semibold">
        {label}
        <input
          type="search"
          autoComplete="off"
          className={fieldClass}
          placeholder={placeholder}
          value={value ? placeName(value) : text}
          onChange={(event) => {
            onChange(null);
            setText(event.target.value);
          }}
        />
      </label>
      {!value && search.length >= 2 && places && (
        <ul className="mt-1 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {places.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">
              Aucun lieu trouvé. Essayez le nom de la commune.
            </li>
          )}
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="min-h-11 w-full px-3 py-2 text-left"
                onClick={() => {
                  onChange(place);
                  setText("");
                }}
              >
                {place.label}
                <span className="block text-xs text-gray-500">
                  {place.zip_code} {place.city}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
