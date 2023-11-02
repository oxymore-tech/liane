"use client";

import React, { useState } from "react";
import { useQueryClient } from "react-query";
import { useAppServices } from "@/components/ContextProvider";
import { Datepicker, Pagination, Spinner, Table, TextInput } from "flowbite-react";
import { getIconComponent, Icon } from "@/components/base/Icon";
import { useRouter } from "next/navigation";
import { usePaginatedQuery } from "@/utils/hooks";

const DP = ({ date, setDate }: { date: Date | undefined; setDate: (d: Date | undefined) => void }) => {
  return <Datepicker defaultDate={date} onSelectedDateChanged={setDate} />;
};
export default function TripRecordsPage() {
  const services = useAppServices();
  const client = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState<undefined | Date>(undefined);
  const { data, loading, fetchNextPage } = usePaginatedQuery("records", cursor => services.record.list({ cursor, limit: 10, asc: false }));

  const [currentPage, setCurrentPage] = useState(1);
  const onPageChange = (page: number) => {
    if (page === currentPage + 1) fetchNextPage();
    setCurrentPage(page);
  };
  const hasNext = !!data?.pages[currentPage - 1]?.next;
  const page = data?.pages[currentPage - 1]?.data;
  const totalPages = data?.pages.length || 0;
  if (loading) {
    return <Spinner color="orange" aria-label="Extra large spinner example" size="xl" />;
  }
  return (
    <div className="overflow-x-auto p-1.5 grow">
      <div className="py-3 px-4 flex flex-row gap-2">
        <Icon name="filter" />
        <TextInput id="search" type="text" sizing="md" icon={getIconComponent("search")} />
        <DP date={date} setDate={setDate} />
      </div>
      <Table hoverable>
        <Table.Head>
          <Table.HeadCell>Date</Table.HeadCell>
          <Table.HeadCell>Membres</Table.HeadCell>
          <Table.HeadCell>Trajet</Table.HeadCell>
        </Table.Head>
        <Table.Body className="divide-y">
          {page?.map(liane => {
            return (
              <Table.Row
                onClick={() => {
                  client.setQueryData(["liane", liane.id], () => liane);
                  router.push("/dashboard/trip-records/" + liane.id!);
                }}
                key={liane.id!}
                className="bg-white dark:border-gray-700 dark:bg-gray-800 cursor-pointer">
                <Table.Cell> {new Date(liane.startedAt).toLocaleString()}</Table.Cell>
                <Table.Cell>{liane.members.map(m => m.user.pseudo).join(", ")}</Table.Cell>
                <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                  {liane.wayPoints[0].rallyingPoint.city + " → " + liane.wayPoints[liane.wayPoints.length - 1].rallyingPoint.city}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>

      <div className="flex overflow-x-auto sm:justify-center">
        <Pagination
          layout="navigation"
          currentPage={currentPage}
          totalPages={hasNext ? totalPages + 1 : totalPages}
          onPageChange={onPageChange}
          previousLabel="Précédent"
          nextLabel="Suivant"
          showIcons
        />
      </div>
    </div>
  );
}
