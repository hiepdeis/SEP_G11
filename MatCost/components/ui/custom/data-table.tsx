"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (item: T) => string | number;
  enableSelection?: boolean;
  renderBulkAction?: (
    selectedIds: (string | number)[],
    clearSelection: () => void,
  ) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  enableSelection = false,
  renderBulkAction,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [data]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map(getRowId));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (checked: boolean, id: string | number) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {enableSelection && selectedIds.length > 0 && renderBulkAction && (
        <div className="mb-4">
          {renderBulkAction(selectedIds, () => setSelectedIds([]))}
        </div>
      )}

      <div className="[&>div]:max-h-[500px] [&>div]:min-h-[500px] [&>div]:overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-sm outline outline-1 outline-slate-200">
            <TableRow className="bg-slate-50">
              {enableSelection && (
                <TableHead className="w-[40px] pl-6">
                  <Checkbox
                    checked={
                      data.length > 0 && selectedIds.length === data.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}

              {columns.map((col, index) => (
                <TableHead key={index} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="h-32 text-center text-slate-500"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const id = getRowId(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <TableRow
                    key={id}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors",
                      isSelected && "bg-indigo-50/50",
                    )}
                  >
                    {enableSelection && (
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectRow(checked as boolean, id)
                          }
                        />
                      </TableCell>
                    )}

                    {columns.map((col, index) => (
                      <TableCell key={index} className={col.className}>
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                            ? String(item[col.accessorKey] || "")
                            : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
