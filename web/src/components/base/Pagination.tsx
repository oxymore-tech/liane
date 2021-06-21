/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import { Arrow } from "@/components/base/Arrow";

interface PaginationProps {
  message?: (page:number, total:number) => string | undefined,
  className?: string;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  withoutDetails?: boolean;
}

function getRange(start, end) {
  return Array(end - start + 1).fill(0).map((v, i) => i + start);
}

function pagination(current, length): (number | "...")[] {
  if (length <= 9) {
    return getRange(0, length - 1);
  }

  if (current <= 3) {
    return [0, 1, 2, 3, 4, 5, 6, "...", length - 1];
  }

  if (current >= (length - 1 - 5)) {
    return [0, "...", length - 7, length - 6, length - 5, length - 4, length - 3, length - 2, length - 1];
  }

  return [0, "...", ...getRange(current - 2, current + 2), "...", length - 1];
}

export function Pagination({ className, page, perPage, total, onPageChange, withoutDetails = false, message }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);

  const pages = pagination(page, totalPages);
  return (
    <div className={`bg-white px-4 py-3 flex items-center justify-between sm:px-6 ${className}`}>
      <div className={`flex-1 flex justify-between sm:hidden items-center ${totalPages <= 1 && "invisible"}`}>
        <a
          className="cursor-pointer relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-500"
          onClick={() => page > 0 && onPageChange(page - 1)}
        >
          Previous
        </a>
        <div>
          { message ? message(page + 1, total) : `${page + 1} / ${totalPages}` }
        </div>
        <a
          className="cursor-pointer ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:text-gray-500"
          onClick={() => page < (totalPages - 1) && onPageChange(page + 1)}
        >
          Next
        </a>
      </div>
      <div className={`hidden sm:flex-1 sm:flex sm:items-center ${withoutDetails ? "sm:justify-end" : "sm:justify-between"}`}>
        {!withoutDetails && (
        <div>
          <p className="text-sm text-gray-700">
            { message ? message(page + 1, total) : `${(page * perPage) + 1} à ${Math.min(total, (page + 1) * perPage)} sur ${total}` }
          </p>
        </div>
        )}
        <div>
          <nav className={`relative z-0 inline-flex rounded-md shadow-sm -space-x-px ${totalPages <= 1 && "invisible"}`} aria-label="Pagination">
            <a
              className="cursor-pointer relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              onClick={() => page > 0 && onPageChange(page - 1)}
            >
              <span className="sr-only">Previous</span>
              <Arrow className="transform rotate-90" aria-hidden="true" />
            </a>
            {pages.map((p, i) => (
              <a
                key={`page_${i}`}
                className={`cursor-pointer relative min-w-pageButton inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 ${page === p ? "bg-gray-500 text-gray-200 font-bold" : "text-gray-700"}`}
                onClick={() => p !== "..." && onPageChange(p)}
              >
                {p === "..." ? p : p + 1}
              </a>
            ))}
            <a
              className="cursor-pointer relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              onClick={() => page < (totalPages - 1) && onPageChange(page + 1)}
            >
              <span className="sr-only">Next</span>
              <Arrow className="transform -rotate-90" aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
