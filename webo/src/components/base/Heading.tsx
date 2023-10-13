import React from "react";
import Html from "@/components/base/Html";

interface HeadingProps {
  className?: string;
  right?: boolean;
  body: string;
}

export default function Heading({ body, right, className }: HeadingProps) {
  return (
    <h3 className={`${className} ${right && "md:text-right"} block text-lg pb-6 md:text-3xl md:pb-14 text-gray-700 my-4`}>
      <Html body={body} />
    </h3>
  );
}
