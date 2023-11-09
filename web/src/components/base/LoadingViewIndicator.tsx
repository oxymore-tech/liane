import * as React from "react";
import { Spinner } from "flowbite-react";

export function LoadingViewIndicator() {
  return (
    <div className="h-full w-full items-center justify-center flex">
      <Spinner />
    </div>
  );
}
