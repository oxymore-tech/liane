"use client";

import React, { useState } from "react";
import { useQueryClient } from "react-query";
import { useAppServices } from "@/components/ContextProvider";
import { Pagination, Table } from "flowbite-react";
import { Icon } from "@/components/base/Icon";
import { useRouter } from "next/navigation";
import { usePaginatedQuery } from "@/utils/hooks";
import { LoadingViewIndicator } from "@/components/base/LoadingViewIndicator";
import { toISOWithTimezoneString } from "@liane/common";
import { useLocalization } from "@/api/intl";
import { DatePicker } from "@/components/base/DatePicker";

export default function TripRecordsPage() {
  const services = useAppServices();
  const WebLocalization = useLocalization();
  const client = useQueryClient();
  const router = useRouter();
  const [date, setDate] = useState<undefined | Date>(undefined);
  const { data, loading, fetchNextPage } = usePaginatedQuery(["records", date ? toISOWithTimezoneString(date) : undefined], (cursor, queryKey) =>
    services.record.list({ cursor, limit: 10, asc: false, date: queryKey[1] as string | undefined })
  );

  const [currentPage, setCurrentPage] = useState(1);
  const onPageChange = (page: number) => {
    if (page === currentPage + 1) fetchNextPage();
    setCurrentPage(page);
  };
  const hasNext = !!data?.pages[currentPage - 1]?.next;
  const page = data?.pages[currentPage - 1]?.data;
  const totalPages = data?.pages.length || 0;

  return (
    <div className="overflow-x-auto p-1.5 grow">
      <div className="py-3 px-4 flex flex-row gap-2">
        <Icon name="filter" className="self-center" />
        <DatePicker date={date} setDate={setDate} />
      </div>
      {loading && <LoadingViewIndicator />}
      {!loading && (
        <>
          <Table hoverable>
            <Table.Head>
              <Table.HeadCell>Date</Table.HeadCell>
              <Table.HeadCell>Membres</Table.HeadCell>
              <Table.HeadCell>Trajet</Table.HeadCell>
            </Table.Head>
            <Table.Body className="divide-y">
              {page?.map(liane => {
                const date = new Date(liane.startedAt);
                return (
                  <Table.Row
                    onClick={() => {
                      client.setQueryData(["liane", liane.id], () => liane);
                      router.push("/dashboard/trip-records/" + liane.id!);
                    }}
                    key={liane.id!}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800 cursor-pointer">
                    <Table.Cell>
                      {WebLocalization.formatDate(date)}, {WebLocalization.formatTime24h(date)}
                    </Table.Cell>
                    <Table.Cell>{liane.members.map(m => m.user.pseudo).join(", ")}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {liane.wayPoints.map(w => w.rallyingPoint.city).join(" → ")}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>

          <div className="flex overflow-x-auto overflow-y-hidden sm:justify-center">
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
        </>
      )}
    </div>
  );
}
