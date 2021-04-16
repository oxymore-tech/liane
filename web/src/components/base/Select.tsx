import React from "react";
import { Label } from "@components/base/Label";
import { Arrow } from "@components/base/Arrow";
import { getIndicationRingColor, Indication, IndicationMessage } from "./Indication";

interface SelectProps<T> {
  label?: string;
  required?: boolean;
  options: T[];
  value?: string|number;
  keyField?: string;
  render?: string | ((o: T) => string);
  onChange?: (value: string|number) => any;
  indication?: IndicationMessage;
}

function renderOption<T>(o: T, render: string | ((o: T) => string)) {
  if (typeof render === "string") {
    return o[render];
  }
  return render(o);
}

export function Select<T>({ label, options, value, keyField = "value", onChange, indication, required, render = "label" }: SelectProps<T>) {

  const indicationRingColor = getIndicationRingColor(indication);

  const inputClass = `appearance-none w-full outline-none rounded ring-2 ring-gray-300 focus:ring-blue-300 p-2 my-2 bg-white ${indicationRingColor}`;

  return (
    <div className="flex flex-col">
      <Label label={label} mandatory={required} />
      <div className="relative">
        <select className={inputClass} onChange={(v) => onChange(v.target.value)} required={required} value={value}>
          <option value=""> </option>
          {options.map((o) => (
            <option key={o[keyField]} value={o[keyField]}>
              {renderOption(o, render)}
            </option>
          ))}
        </select>
        <Arrow className="absolute inset-y-0 right-0 mt-4 mr-2 pointer-events-none" />
      </div>
    </div>
  );
}
