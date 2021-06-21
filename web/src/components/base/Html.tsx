/* eslint-disable react/no-danger */
import React from "react";

interface HtmlProps {
  body: string;
  className?: string;
}

const Html = ({ body, className }: HtmlProps) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: body }}
  />
);

export default Html;
