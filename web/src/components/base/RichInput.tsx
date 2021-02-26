import React from "react";
import { getIndicationRingColor, Indication, IndicationMessage } from "./Indication";
import "react-quill/dist/quill.snow.css";
import dynamic from "next/dynamic";
import { Label } from "./Label";

export const onServerSide = () => typeof window === "undefined";
export const onClientSide = () => !onServerSide();

const ReactQuill = dynamic(() => import("react-quill"), {ssr: false});

interface RichInputProps {
  className?: string;
  label?: string;
  mandatory?: boolean;
  value?: string;
  onChange?: (value: string) => any;
  indication?: IndicationMessage;
}

export function RichInput({className, label, value, onChange, indication, mandatory}: RichInputProps) {

  const indicationRingColor = getIndicationRingColor(indication);

  const modules = {
    toolbar: {
      container: [
        ["bold", "italic", "underline", "strike"],
        ['blockquote', 'code-block'],
        [{'header': [1, 2, 3, 4, 5, 6, false]}],

        [{'color': []}, {'background': []}],          // dropdown with defaults from theme

        [{'align': []}],
        [
          {list: "ordered"},
          {list: "bullet"},
          {indent: "-1"},
          {indent: "+1"},
        ],
        [{'script': 'sub'}, {'script': 'super'}],
        ["link", "image", "video"],
        ["clean"]
      ]
    },
    clipboard: {matchVisual: false}
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "blockquote",
    "code-block",
    "size",
    "color",
    "background",
    "list",
    "script",
    "bullet",
    "indent",
    "link",
    "image",
    "video",
    "align"
  ];

  return <div className={`flex flex-col my-3 ${className}`}>
    <div className="flex items-center">
      <Label label={label} mandatory={mandatory}/>
      <Indication className="ml-2" value={indication}/>
    </div>
    {onClientSide() ?
      <ReactQuill
        className={`unreset ${indicationRingColor}`}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
      />
      : <textarea className={`unreset outline-none my-2 mb-3 bg-white ${indicationRingColor}`}
                  value={value}/>
    }
  </div>;
}
