import React from "react";

interface PaginationProps {
  className?: string;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({className, page, perPage, total, onPageChange}: PaginationProps) {

  const totalPages = Math.ceil(total / perPage);

  return <nav className={`px-4 flex items-center justify-between sm:px-0 ${className}`}>
    <div className="-mt-px w-0 flex-1 flex justify-center">
      <a onClick={() => page > 0 && onPageChange(page - 1)}
         className={`pt-4 pr-1 inline-flex items-center text-sm font-medium text-gray-300 ${page > 0 && "text-gray-500 cursor-pointer hover:text-gray-700"}`}>
        <svg className="mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
             fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd"
                d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
                clipRule="evenodd"/>
        </svg>
      </a>
      <div
        className="pt-4 pr-1 inline-flex items-center text-sm font-medium text-gray-700 ">
        Page {page + 1} / {totalPages}
      </div>
      <a onClick={() => page < (totalPages - 1) && onPageChange(page + 1)}
         className={`pt-4 pl-1 inline-flex items-center text-sm font-medium text-gray-300 ${page < (totalPages - 1) && "text-gray-500 cursor-pointer hover:text-gray-700"}`}>
        <svg className="ml-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
             fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd"
                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"/>
        </svg>
      </a>
    </div>
  </nav>;
}
