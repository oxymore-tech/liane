import React from "react";
import { format, parseJSON } from "date-fns";
import { getIndicationRingColor, Indication, IndicationMessage } from "./Indication";
import { Label } from "./Label";

type InputType = "textarea" | "text" | "password" | "date" | "email" | "number" | "file" | "checkbox";

type ValueOf<T extends InputType> = T extends "checkbox"
  ? boolean
  : T extends "date"
    ? Date | string
    : T extends "number"
      ? number | string
      : string;

interface TextInputProps<T extends InputType> {
  className?: string;
  label?: string;
  name?: string;
  title?: string;
  iconLeft?: string;
  placeholder?: string;
  mandatory?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  type: T;
  value?: ValueOf<T>;
  onChange?: (value: ValueOf<T>) => any;
  indication?: IndicationMessage;
  notifyIndication?: boolean;
  autoComplete?: "off" | "new-password";
}

export function TextInput<T extends InputType>({
  placeholder,
  className,
  name,
  label,
  title,
  type,
  value,
  onChange,
  indication,
  notifyIndication,
  mandatory,
  multiple,
  disabled,
  iconLeft,
  autoComplete
}: TextInputProps<T>) {
  const indicationRingColor = getIndicationRingColor(indication);

  // @ts-ignore
  const v = type === "date" ? format(parseJSON(value ?? new Date()), "yyyy-MM-dd") : value as string;

  const onChangeEvent = (e) => {
    if (onChange) {
      if (type === "checkbox") {
        onChange(e.target.checked);
      } else {
        onChange(e.target.value);
      }
    }
  };

  const inputClass = `outline-none rounded ${indicationRingColor} ring-1 focus:ring-blue-300 p-2 mt-2 mb-1 bg-white text-sm ${type !== "checkbox" && "w-full"}`;

  return (
    <div className={`flex ${type !== "checkbox" && "flex-col"} ${className}`}>
      <Label label={label} required={mandatory} error={!!indication} />
      <div className={`relative ${type === "checkbox" && "ml-4"}`}>
        {type === "textarea" ? (
          <textarea
            title={title}
            name={name}
            placeholder={placeholder}
            className={`w-full ${iconLeft && "pl-9"} ${inputClass}`}
            value={v}
            onChange={onChangeEvent}
            disabled={disabled}
          />
        )
          : (
            <input
              title={title}
              name={name}
              placeholder={placeholder}
              className={`${iconLeft && "pl-9"} ${inputClass}`}
              multiple={multiple}
              type={type}
              value={v}
              disabled={disabled}
              autoComplete={autoComplete}
              onChange={onChangeEvent}
            />
          )}
        {iconLeft && (
        <div
          className="overflow-hidden absolute text-2xl top-0 py-2.5 px-2 text-gray-400"
        >
          <i className={`mdi mdi-${iconLeft}`} />
        </div>
        )}
      </div>
      <Indication className="mt-1 mb-2" value={indication} notify={notifyIndication} />
    </div>
  );
}
