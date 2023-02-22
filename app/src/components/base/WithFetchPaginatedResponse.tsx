import React from "react";
import { WithFetchResource, WithFetchResourceErrorComponentProps, WithFetchResourceParams } from "@/components/base/WithFetchResource";
import { AppServices } from "@/api/service";
import { PaginatedResponse } from "@/api";

export interface WithFetchPaginatedResponseProps<T> {
  data: T[];
}
export const WithFetchPaginatedResponse = <T,>(
  WrappedComponent: React.ComponentType<WithFetchPaginatedResponseProps<T> & WithFetchResourceParams>,
  loadData: (repository: AppServices, params: any) => Promise<PaginatedResponse<T>>,
  queryKey: string,
  EmptyResponseComponent: React.ComponentType,
  ErrorComponent?: React.ComponentType<WithFetchResourceErrorComponentProps>
) =>
  WithFetchResource(
    ({ data, ...props }) => {
      const dataList = data.data;
      if (dataList.length === 0) {
        return <EmptyResponseComponent />;
      } else {
        console.log(JSON.stringify(data));
        return <WrappedComponent data={dataList} {...props} />;
      }
    },
    loadData,
    queryKey,
    ErrorComponent
  );
