import React from "react";
import { format, parseJSON } from "date-fns";
import { getIndicationRingColor, Indication, IndicationMessage } from "./Indication";
import { Label } from "./Label";

interface TextInputProps {
  className?: string;
  label?: string;
  title?: string;
  iconLeft?: string;
  placeholder?: string;
  mandatory?: boolean;
  type: "textarea" | "text" | "password" | "date";
  value?: string;
  onChange?: (value: string) => any;
  indication?: IndicationMessage;
  autoComplete?: "off" | "new-password";
}

export function TextInput({
  placeholder,
  className,
  label,
  title,
  type,
  value,
  onChange,
  indication,
  mandatory,
  iconLeft,
  autoComplete
}: TextInputProps) {

  const indicationRingColor = getIndicationRingColor(indication);

  const v = type === "date" ? format(parseJSON(value), "YYYY-MM-DD") : value;

  const onChangeEvent = (e) => {
    if (onChange) {
      if (type === "date") {
        onChange(parseJSON(e.target.value).toISOString());
      } else {
        onChange(e.target.value);
      }
    }
  };

  const inputClass = `outline-none rounded ring-1 ring-gray-300 focus:ring-blue-300 p-2 my-2 bg-white ${indicationRingColor}`;

  return (
    <div className={`flex flex-col my-3 ${className}`}>
      <Label label={label} mandatory={mandatory} />
      <div className="relative">
        {type === "textarea"
          ? (
            <textarea
              title={title}
              placeholder={placeholder}
              className={`w-full ${iconLeft && "pl-11"} ${inputClass}`}
              value={v}
              onChange={onChangeEvent}
            />
          )
          : (
            <input
              title={title}
              placeholder={placeholder}
              className={`w-full ${iconLeft && "pl-11"} ${inputClass}`}
              type={type}
              value={v}
              autoComplete={autoComplete}
              onChange={onChangeEvent}
            />
          )}
        {iconLeft && (
        <div
          className="overflow-hidden absolute text-2xl top-0 py-3 px-3 text-gray-400"
        >
          <i className={`mdi mdi-${iconLeft}`} />
        </div>
        )}
      </div>
      <Indication value={indication} />
    </div>
  );
}
