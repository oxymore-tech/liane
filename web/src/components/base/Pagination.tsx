import React from "react";
import { Arrow } from "@/components/base/Arrow";

interface PaginationProps {
  message?: (page: number, total: number) => string | undefined;
  className?: string;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  withoutDetails?: boolean;
}

function getRange(start: number, end: number) {
  return Array(end - start + 1)
    .fill(0)
    .map((v, i) => i + start);
}

function pagination(current: number, length: number): (number | "...")[] {
  if (length <= 9) {
    return getRange(0, length - 1);
  }

  if (current <= 3) {
    return [0, 1, 2, 3, 4, 5, 6, "...", length - 1];
  }

  if (current >= length - 1 - 5) {
    return [0, "...", length - 7, length - 6, length - 5, length - 4, length - 3, length - 2, length - 1];
  }

  return [0, "...", ...getRange(current - 2, current + 2), "...", length - 1];
}

export function Pagination({ className, page, perPage, total, onPageChange, withoutDetails = false, message }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);

  const pages = pagination(page, totalPages);

  const clickableClasses =
    "text-gray-700 bg-white font-medium hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-pointer";
  const selectedClasses = "bg-gray-300 font-bold dark:bg-gray-800 dark:text-white cursor-default";
  const indicationClasses = "text-gray-700 bg-white font-medium dark:bg-gray-800 dark:text-gray-300 cursor-default";
  const disabledClasses = "text-gray-400 bg-white font-medium dark:bg-gray-700 dark:text-gray-400 cursor-default";
  return (
    <div className={`px-4 py-3 flex items-center justify-between sm:px-6 ${className}`}>
      <div className={`flex-1 flex justify-between sm:hidden items-center ${totalPages <= 1 && "invisible"}`}>
        <a
          className={
            "relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm border-gray-300 dark:border-gray-600 " +
            (page > 0 ? clickableClasses : disabledClasses)
          }
          onClick={() => page > 0 && onPageChange(page - 1)}>
          <span className="sr-only">Previous</span>
          <Arrow className="transform rotate-90" aria-hidden="true" />
        </a>
        <div className={indicationClasses + " px-2 py-2 border-y border-gray-300 dark:border-gray-600 text-sm"}>
          {message ? message(page + 1, total) : `${page + 1} / ${totalPages}`}
        </div>
        <a
          className={
            "relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm border-gray-300 dark:border-gray-600 " +
            (page < totalPages - 1 ? clickableClasses : disabledClasses)
          }
          onClick={() => page < totalPages - 1 && onPageChange(page + 1)}>
          <span className="sr-only">Next</span>
          <Arrow className="transform -rotate-90" aria-hidden="true" />
        </a>
      </div>
      <div className={`hidden sm:flex-1 sm:flex sm:items-center ${withoutDetails ? "sm:justify-end" : "sm:justify-between"}`}>
        {!withoutDetails && (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {!!message && message(page + 1, total)}
              {!message && (
                <span>
                  <b>{page * perPage + 1}</b> à <b>{Math.min(total, (page + 1) * perPage)}</b> sur <b>{total}</b>
                </span>
              )}
            </p>
          </div>
        )}
        <div>
          <nav className={`relative z-0 inline-flex rounded-md shadow-sm -space-x-px ${totalPages <= 1 && "invisible"}`} aria-label="Pagination">
            <a
              className={
                "relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm border-gray-300 dark:border-gray-600 " +
                (page > 0 ? clickableClasses : disabledClasses)
              }
              onClick={() => page > 0 && onPageChange(page - 1)}>
              <span className="sr-only">Previous</span>
              <Arrow className="transform rotate-90" aria-hidden="true" />
            </a>
            {pages.map((p, i) => (
              <a
                key={`page_${i}`}
                className={`relative min-w-pageButton inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm  ${
                  page === p ? selectedClasses : "..." === p ? indicationClasses : clickableClasses
                }`}
                onClick={() => p !== "..." && onPageChange(p)}>
                {p === "..." ? p : p + 1}
              </a>
            ))}
            <a
              className={
                "relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm border-gray-300 dark:border-gray-600 " +
                (page < totalPages - 1 ? clickableClasses : disabledClasses)
              }
              onClick={() => page < totalPages - 1 && onPageChange(page + 1)}>
              <span className="sr-only">Next</span>
              <Arrow className="transform -rotate-90" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
