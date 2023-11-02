"use client";

import React, { useState } from "react";
import { useQuery } from "react-query";
import { useAppServices } from "@/components/ContextProvider";
import { Checkbox, Datepicker, Pagination, Spinner, Table, TextInput } from "flowbite-react";
import { getIconComponent } from "@/components/base/Icon";

const DP = ({ date, setDate }: { date: Date | undefined; setDate: (d: Date | undefined) => void }) => {
  return <Datepicker defaultDate={date} onSelectedDateChanged={setDate} />;
};
export default function RallyingPointsPage() {
  const services = useAppServices();
  const pageSize = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading: loading } = useQuery(["rallying_points", pageSize, currentPage], () =>
    services.rallyingPoint.list({ offset: pageSize * (currentPage - 1), limit: pageSize })
  );

  const totalItems = data?.totalCount || 0;
  if (loading) {
    return <Spinner color="orange" aria-label="Extra large spinner example" size="xl" />;
  }
  return (
    <div className="overflow-x-auto p-1.5 grow flex flex-col mb-4">
      <div className="py-3 px-4 flex flex-row gap-2">
        <TextInput className="grow" id="search" type="text" sizing="md" icon={getIconComponent("search")} placeholder="Filtrer..." />
      </div>
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
      <div className="flex overflow-x-auto sm:justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalItems / pageSize}
          onPageChange={setCurrentPage}
          previousLabel="Précédent"
          nextLabel="Suivant"
          showIcons
        />
      </div>
    </div>
  );
}
