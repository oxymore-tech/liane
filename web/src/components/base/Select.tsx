import React, { ReactNode, useState } from "react";
import { getIndicationRingColor, Indication, IndicationMessage } from "./Indication";
import { Arrow } from "./Arrow";
import { Label } from "./Label";

interface SelectProps<T> {
  label?: string;
  mandatory?: boolean;
  options: T[];
  value?: T;
  keyField: string;
  render: string | ((o: T) => ReactNode);
  onChange?: (value: T) => any;
  indication?: IndicationMessage;
}

function renderOption<T>(o: T, render: string | ((o: T) => ReactNode)) {
  if (typeof render === "string") {
    return o[render];
  }
  return render(o);
}

export function Select<T>({label, options, value, keyField, onChange, indication, mandatory, render}: SelectProps<T>) {

  const indicationRingColor = getIndicationRingColor(indication);
  const [open, setOpen] = useState(false);

  const option = options.find(o => o[keyField] === value[keyField]);

  return <div className="flex flex-col my-3">
    <Label label={label} mandatory={mandatory}/>

    <div className="relative inline-block text-left" onFocus={() => setOpen(!open)} onBlur={() => setOpen(false)}>
      <div>
        <button type="button"
                className={`w-full focus:outline-none space-between inline-flex justify-center appearance-none rounded ring-1 ring-gray-300 focus:ring-blue-300 p-2 my-2 bg-white ${indicationRingColor}`}
                id="options-menu" aria-haspopup="true" aria-expanded="true">
          <span className="flex-1">{option && renderOption(option, render)}</span>
          <Arrow/>
        </button>
      </div>

      <div
        className={`z-10 origin-top-right absolute right-0 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 ${!open && "hidden"}`}>
        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
          {options.map((o, i) => <a key={i}
                                    href="#"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    onMouseDown={() => {
                                      if (onChange) {
                                        onChange(o);
                                      }
                                      setOpen(false);
                                    }}
                                    role="menuitem">{renderOption(o, render)}</a>)}
        </div>
      </div>
    </div>
    <Indication value={indication}/>
  </div>;
}
