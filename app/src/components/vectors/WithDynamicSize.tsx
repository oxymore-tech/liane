import React, { ComponentType } from "react";

export type WithSizeProps = {
  width: number;
  height: number;
};

export type WithDynamicSizeProps = {
  maxWidth?: number;
  maxHeight?: number;
};
export const WithDynamicSize =
  <T extends unknown>(WrappedComponent: ComponentType<WithSizeProps & T>, maxSize: Required<WithDynamicSizeProps>) =>
  ({ maxWidth = maxSize.maxWidth, maxHeight = maxSize.maxHeight, ...props }: T & WithDynamicSizeProps) => {
    let width;
    let height;

    // Place the SVG in the given bounding box
    if (maxWidth - maxSize.maxWidth > maxHeight - maxSize.maxHeight) {
      // Height is the limiting dimension
      height = maxHeight;
      width = (maxSize.maxWidth / maxSize.maxHeight) * height;
    } else {
      // Height is the limiting dimension
      width = maxWidth;
      height = (maxSize.maxHeight / maxSize.maxWidth) * maxWidth;
    }

    return <WrappedComponent width={width} height={height} {...props} />;
  };
