import React, { useEffect, useState } from "react";
import { Indication, IndicationMessage } from "./Indication";
import { Loading } from "./Loading";
import { Button } from "./Button";
import { Label } from "./Label";

interface UploadProps {
  className?: string;
  label?: string;
  accept?: string;
  multiple?: boolean;
  loading?: boolean;
  mandatory?: boolean;
  value?: string | File;
  onDelete?: (value?: string | File) => any;
  onChange?: (value?: File) => any;
  indication?: IndicationMessage;
}

const toBase64 = file => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

async function getSrc(file: string | File): Promise<string> {
  if (file instanceof File) {
    return await toBase64(file);
  }
  return file;
}

export function Upload({loading = false, className, label, accept, multiple, value, onChange, onDelete, indication, mandatory}: UploadProps) {

  const [src, setSrc] = useState<string>(null);

  useEffect(() => {
    getSrc(value)
      .then(s => setSrc(s));
  });

  return <div className={`flex flex-col my-3 ${className}`}>
    <Label label={label} mandatory={mandatory}/>
    <Loading
      className="my-2 w-64"
      loading={loading}>
      {
        value ?
          <div className="relative">
            <img className="h-auto min-w-full max-w-full" src={src} alt="preview"/>
            <Button color="red" className="opacity-50 hover:opacity-100 absolute top-6 left-28"
                    title="Supprimer la photo" onClick={() => onDelete(value)}><i
              className="mdi mdi-trash-can"/></Button>
          </div>
          : <label
            className="w-full flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg tracking-wide border border-blue cursor-pointer hover:bg-blue-400 hover:text-white">
            <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path
                d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z"/>
            </svg>
            <span className="mt-2 text-sm">Select a file</span>
            <input type='file' className="hidden"
                   accept={accept}
                   multiple={multiple}
                   onChange={(e) => {
                     onChange && onChange(e.target.files[0])
                   }}/>
          </label>
      }
    </Loading>
    <Indication value={indication}/>
  </div>;
}
