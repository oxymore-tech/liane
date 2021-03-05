import React, { ReactNode } from "react";
import { Arrow } from "./Arrow";

export type SortOptions<T> = { [P in keyof T]?: number };

export interface Column<T> {
  label?: string;
  renderHeader?: () => string | ReactNode;
  render?: (data: T) => string | ReactNode;
  field?: string;
  sortable?: boolean;
  width?: string | number;
}

interface TableProps<T> {
  className?: string;
  columns: Column<T>[]
  data: T[],
  sort?: SortOptions<T>;
  onSortChange?: (sort: SortOptions<T>) => void;
}

function toggleSort(field: string, fieldSort?: number) {
  const s = {};
  if (!fieldSort) {
    s[field] = 1;
  } else {
    if (fieldSort == 1) {
      s[field] = -1
    } else {
      s[field] = undefined;
    }
  }
  return s;
}

export function Table<T>({className, data, columns, sort = {}, onSortChange}: TableProps<T>) {
  return <table className={`shadow rounded-md min-w-full ${className}`}>
    <thead>
    <tr>
      {
        columns.map((c, i) => <th
          className={`bg-gray-700 px-6 py-3 border-b-2 border-gray-200 text-left leading-4 text-white text-sm tracking-wider ${c.sortable && 'cursor-pointer'}`}
          onClick={() => c.sortable && onSortChange && onSortChange(toggleSort(c.field, sort[c.field]))}
          style={{width: c.width, maxWidth: c.width}}
          key={i}>
          <div className="flex items-center">
            {c.renderHeader ? c.renderHeader() : c.label || ""}
            <Arrow
              className={`ml-2 ${sort[c.field] == -1 && "transform rotate-180"} ${!sort[c.field] && "opacity-0"}`}/>
          </div>
        </th>)
      }
    </tr>
    </thead>
    <tbody>
    {
      data.map((d, i) => <tr key={i}>
        {
          columns.map((c, i) => <td className="bg-white px-6 py-2 whitespace-no-wrap border-b border-gray-200" key={i}>{
            c.render ? c.render(d) : d[c.field]
          }</td>)
        }
      </tr>)
    }
    </tbody>
  </table>;
}
