import React, { ReactNode } from "react";
import { Arrow } from "@/components/base/Arrow";

export type SortOptions<T> = { [P in keyof T]?: number };

export interface Column<T> {
  label?: string;
  renderHeader?: () => string | ReactNode;
  render?: (data: T) => string | ReactNode;
  field?: string;
  sortable?: boolean;
  width?: string | number;
  className?: string;
}

interface TableProps<T> {
  className?: string;
  columns: Column<T>[]
  data: T[],
  sort?: SortOptions<T>;
  onSortChange?: (sort: SortOptions<T>) => void;
  keyExtractor: (T) => any;
}

function toggleSort(field: string, fieldSort?: number) {
  const s = {};
  if (!fieldSort) {
    s[field] = 1;
  } else if (fieldSort === 1) {
    s[field] = -1;
  } else {
    s[field] = undefined;
  }
  return s;
}

export function Table<T>({ className, data, columns, sort = {}, onSortChange, keyExtractor }: TableProps<T>) {
  return (
    <table className={`table-auto shadow rounded-md min-w-full ${className}`}>
      <thead>
        <tr>
          {
        columns.map((c, i) => (
          <th
            className={`bg-gray-700 text-center text-white text-sm ${c.sortable && "cursor-pointer"} ${c.className}`}
            onClick={() => c.sortable && c.field && onSortChange && onSortChange(toggleSort(c.field, sort[c.field]))}
            key={i}
          >
            <div className="flex items-center justify-center">
              {c.renderHeader ? c.renderHeader() : c.label || ""}
              <Arrow
                className={`ml-2 ${c.field && sort[c.field] === -1 && "transform rotate-180"} ${(!c.field || !sort[c.field]) && "opacity-0"}`}
              />
            </div>
          </th>
        ))
      }
        </tr>
      </thead>
      <tbody>
        {
      data.map((d) => (
        <tr key={keyExtractor(d)}>
          {
          columns.map((c, ci) => (
            <td className="bg-white px-2 py-2 whitespace-no-wrap border-b border-gray-200" key={ci}>
              {
                // eslint-disable-next-line no-nested-ternary
            c.render ? c.render(d) : (c.field ? d[c.field] : JSON.stringify(d))
          }
            </td>
          ))
        }
        </tr>
      ))
    }
      </tbody>
    </table>
  );
}
