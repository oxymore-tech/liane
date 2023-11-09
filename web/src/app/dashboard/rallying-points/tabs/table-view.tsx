import { useAppServices } from "@/components/ContextProvider";
import React, { useEffect, useState } from "react";
import { useDebounceValue } from "@liane/common";
import { useQuery } from "react-query";
import { Checkbox, Table, TextInput } from "flowbite-react";
import { getIconComponent } from "@/components/base/Icon";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { Pagination } from "@/components/base/Pagination";

export function RallyingPointsTablePage() {
  const services = useAppServices();
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(0);
  const [search, setSearch] = useState("");
  const delayedSearch = useDebounceValue(search, 400);
  const { data, isLoading: loading } = useQuery(["rallying_points", pageSize, currentPage, delayedSearch || ""], ({ queryKey }) => {
    const search = queryKey[3] as string;
    const pageSize = queryKey[1] as number;
    const currentPage = queryKey[2] as number;
    return services.rallyingPoint.list({ offset: pageSize * currentPage, limit: pageSize, search: search.length > 0 ? search : undefined });
  });

  const totalItems = data?.totalCount || 0;

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  return (
    <div className="grow flex flex-col">
      <div className=" p-1.5 grow flex flex-col">
        <div className="py-3 px-4 flex flex-row gap-2">
          <TextInput
            key="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="grow"
            id="search"
            type="text"
            sizing="md"
            icon={getIconComponent("search")}
            placeholder="Filtrer..."
          />
        </div>
        {loading && <LoadingViewIndicator />}
        {!loading && (
          <>
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell></Table.HeadCell>
                <Table.HeadCell>Id</Table.HeadCell>
                <Table.HeadCell>Label</Table.HeadCell>
                <Table.HeadCell>Ville</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {data?.data.map(rp => {
                  return (
                    <Table.Row key={rp.id!} className="bg-white dark:border-gray-700 dark:bg-gray-800 cursor-pointer">
                      <Table.Cell className="pointer-events-none">
                        <Checkbox className="pointer-events-auto hover:cursor-pointer" onClick={e => e.stopPropagation()} />
                      </Table.Cell>
                      <Table.Cell> {rp.id}</Table.Cell>
                      <Table.Cell>{rp.label}</Table.Cell>
                      <Table.Cell>{rp.city}</Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>

            <div className="grow shrink"></div>
            <div className="flex overflow-y-hidden sm:justify-center mb-4">
              <Pagination page={currentPage} perPage={pageSize} total={totalItems} onPageChange={setCurrentPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
