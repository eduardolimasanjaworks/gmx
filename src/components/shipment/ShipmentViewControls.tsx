import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, Table, Maximize } from "lucide-react";

interface ShipmentViewControlsProps {
  viewMode: "card" | "table";
  onViewModeChange: (mode: "card" | "table") => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  focusColumn: string | null;
  onFocusColumnChange: (column: string | null) => void;
  columns: { status: string; title: string }[];
}

export const ShipmentViewControls = ({
  viewMode,
  onViewModeChange,
  itemsPerPage,
  onItemsPerPageChange,
  focusColumn,
  onFocusColumnChange,
  columns,
}: ShipmentViewControlsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Visualização:</span>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewModeChange("table")}
          >
            <Table className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Itens por página:</span>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Modo Foco:</span>
        <Select
          value={focusColumn || "all"}
          onValueChange={(value) => onFocusColumnChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Maximize className="h-4 w-4" />
                Todas as Colunas
              </div>
            </SelectItem>
            {columns.map((col) => (
              <SelectItem key={col.status} value={col.status}>
                {col.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
