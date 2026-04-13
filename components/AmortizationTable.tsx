"use client";

import { useState } from "react";

export type TableColumn = { key: string; label: string; numeric?: boolean };
export type TableRow = Record<string, string | number>;

export function AmortizationTable({
  columns,
  rows,
  initiallyOpen = false,
  pageSize = 60,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  initiallyOpen?: boolean;
  pageSize?: number;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [limit, setLimit] = useState(pageSize);

  return (
    <div className="rounded border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium"
      >
        <span>
          {open ? "▾" : "▸"} Amortization schedule ({rows.length.toLocaleString()} rows)
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50">
              <tr className="border-y border-gray-200 text-left">
                {columns.map((c) => (
                  <th key={c.key} className={`px-3 py-1 ${c.numeric ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-1 font-mono ${c.numeric ? "text-right" : ""}`}>
                      {r[c.key] as string}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((l) => l + pageSize)}
              className="w-full border-t border-gray-200 py-2 text-sm hover:bg-gray-50"
            >
              Show {Math.min(pageSize, rows.length - limit)} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
