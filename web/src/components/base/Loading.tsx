import React, { ReactNode } from "react";
import { Spinner } from "./Spinner";

interface LoadingProps {
  className?: string;
  loading?: boolean;
  children?: ReactNode;
}

export function Loading({className, loading, children}: LoadingProps) {
  return <div className={`relative ${className}`}>
    <Spinner className="absolute top-1/2 -mt-2 left-1/2 -ml-2" loading={loading}/>
    <div className={`${loading && "invisible"}`}>{children}</div>
  </div>;
}
