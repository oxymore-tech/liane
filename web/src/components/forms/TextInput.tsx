import * as React from "react";

export type TextInputProps = {
  id: string;
  error?: string | undefined;
  isValid?: boolean | undefined;
  required?: boolean;
  label?: string;
  onTextChange?: (value: string) => void;
} & React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function TextInput({ id, isValid, required, error, label, onTextChange, value, ...props }: TextInputProps) {
  let borderColor;
  switch (isValid) {
    case true:
      borderColor = "border-green-500 dark:border-green-400";
      break;
    case false:
      borderColor = "border-red-500 dark:border-red-400";
      break;
    default:
      borderColor = "border-gray-200 dark:border-gray-400";
      break;
  }
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2 dark:text-white">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          onChange={e => onTextChange?.(e.target.value)}
          type="text"
          id={id}
          name={id}
          value={value || ""}
          className={"py-3 px-4 block w-full rounded-md text-sm dark:bg-gray-800 dark:text-gray-200 border-2 " + borderColor}
          required={required}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none pr-3">
          {isValid && (
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" />
            </svg>
          )}
          {isValid === false && (
            <svg className="h-5 w-5 text-red-500" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
            </svg>
          )}
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2" id="hs-validation-name-error-helper">
          {error}
        </p>
      )}
    </div>
  );
}
