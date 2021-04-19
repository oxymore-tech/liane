import React, { Fragment, ReactNode } from "react";
import { Arrow } from "@components/base/Arrow";
import { Listbox, Transition } from "@headlessui/react";
import { getIndicationRingColor, IndicationMessage } from "./Indication";
import { Label } from "./Label";

interface SelectProps<T> {
  label?: string;
  inline?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
  options: T[];
  value?: string|number;
  keyField?: string;
  render?: string | ((o: T) => ReactNode);
  onChange?: (value: string|number) => any;
  indication?: IndicationMessage;
}

function renderOption<T>(o: T, render: string | ((o: T) => ReactNode)): ReactNode {
  if (typeof render === "string") {
    return o[render];
  }
  return render(o);
}

export function Select<T>({ className = "", inline, required, placeholder, label, options, value, keyField = "value", onChange, indication, render = "label" }: SelectProps<T>) {

  const indicationRingColor = getIndicationRingColor(indication);

  const selectedOption = options.find((o) => o[keyField] === value);

  const focusClass = "focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-yellow-300 focus-visible:ring-offset-2 focus-visible:border-blue-500";

  const effectivePlaceholder = <span className="text-gray-400">{placeholder || "vide"}</span>;

  return (
    <div className={`flex ${inline ? "items-center" : "flex-col"} my-3 ${className}`}>
      <Label className="mr-3" label={label} required={required} />
      <Listbox value={value} onChange={onChange}>
        {({ open }) => (
          <>
            <div className="relative mt-1">
              <Listbox.Button
                className={`cursor-pointer relative w-full py-2 pl-3 pr-10 text-left bg-white rounded-lg shadow-md focus:outline-none ${focusClass} sm:text-sm ${indicationRingColor}`}
              >
                <span className="block truncate">
                  {selectedOption
                    ? renderOption(selectedOption, render)
                    : effectivePlaceholder}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Arrow
                    className="w-5 h-5 text-gray-500"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                show={open}
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options
                  static
                  className="z-10 absolute w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
                >
                  {options.map((person, personIdx) => (
                    <Listbox.Option
                      key={personIdx}
                      className={({ active }) => `${
                        active
                          ? "text-yellow-900 bg-yellow-100"
                          : "text-gray-900"
                      }
                          cursor-default select-none relative py-2 pl-7`}
                      value={person[keyField]}
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`${
                              selected ? "font-bold" : "font-normal"
                            } block truncate`}
                          >
                            {renderOption(person, render)}
                          </span>
                          {selected ? (
                            <span
                              className={`${
                                active ? "text-yellow-600" : "text-yellow-600"
                              }
                                absolute font-bold inset-y-0 left-0 flex items-center pl-2`}
                            >
                              <i className="mdi mdi-check" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </>
        )}
      </Listbox>
    </div>
  );
}
