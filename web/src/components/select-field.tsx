"use client";

import {
  Description,
  Field,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import type { ReactNode } from "react";
import {
  Chevron,
  fieldClass,
  floatingClass,
  labelClass,
  optionClass,
} from "./ui";
import { cn } from "./utils";

/** Liste déroulante : un choix parmi quelques-uns, au clavier comme au doigt. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: { value: string; content: ReactNode }[];
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Field>
      <Label className={labelClass}>{label}</Label>
      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          aria-invalid={error ? true : undefined}
          className={cn(
            fieldClass,
            "flex items-center justify-between gap-2 text-left",
          )}
        >
          <span className="min-w-0 flex-1">{selected?.content}</span>
          <Chevron />
        </ListboxButton>
        <ListboxOptions
          anchor={{ to: "bottom start", gap: 4 }}
          className={cn(floatingClass, "w-(--button-width)")}
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={optionClass}
            >
              <span className="min-w-0 flex-1">{option.content}</span>
              <span
                aria-hidden="true"
                className="invisible font-bold text-liane group-data-selected:visible"
              >
                ✓
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      {error && (
        <Description
          role="alert"
          className="mt-1 text-sm font-medium text-rouge"
        >
          {error}
        </Description>
      )}
    </Field>
  );
}
