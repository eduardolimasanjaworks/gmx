import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

export function formatDateInput(value?: string | null): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.slice(0, 10);
}

export function getStatusBadge(status: string) {
  const variants: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    novo: { variant: "secondary", label: "Novo" },
    em_transito: { variant: "default", label: "Em Trânsito" },
    entregue: { variant: "outline", label: "Entregue" },
    problema: { variant: "destructive", label: "Com Problema" },
  };
  const config = variants[status] || { variant: "secondary" as const, label: status || "Novo" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface FollowTableSectionProps {
  title: string;
  icon: ReactNode;
  colSpan: number;
  header: ReactNode;
  body: ReactNode;
  empty: boolean;
}

export function FollowTableSection({
  title,
  icon,
  colSpan,
  header,
  body,
  empty,
}: FollowTableSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto rounded-lg border-2 border-slate-300 dark:border-slate-700">
        <Table>
          {header}
          {empty ? (
            <TableBody>
              <TableRow>
                <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                  Nenhum registro
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            body
          )}
        </Table>
      </div>
    </section>
  );
}
