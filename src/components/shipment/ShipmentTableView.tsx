import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Maximize2, CheckCircle, X, Play } from "lucide-react";
import { ShipmentTimer } from "./ShipmentTimer";

interface ShipmentTableViewProps {
  shipments: any[];
  status: string;
  onViewDetails: (shipment: any) => void;
  onDriverClick: (driverName: string) => void;
}

export const ShipmentTableView = ({ shipments, status, onViewDetails, onDriverClick }: ShipmentTableViewProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Carga</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Tempo</TableHead>
          {status !== "new" && <TableHead>Motorista</TableHead>}
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shipments.map((shipment) => (
          <TableRow 
            key={shipment.id}
            className={status === "pending" ? "bg-success/5 border-l-4 border-l-success" : ""}
          >
            <TableCell className="font-medium">{shipment.cargo}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-success" />
                <span className="text-sm">{shipment.origin}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-danger" />
                <span className="text-sm">{shipment.destination}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="font-semibold text-success">
                R$ {shipment.value.toLocaleString()}
              </span>
            </TableCell>
            <TableCell>
              <ShipmentTimer 
                deadline={shipment.deadline} 
                highlight={status === "pending"}
                realtime={status === "pending"}
              />
            </TableCell>
            {status !== "new" && (
              <TableCell>
                {shipment.driver && (
                  <button
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDriverClick(shipment.driver);
                    }}
                  >
                    {shipment.driver}
                  </button>
                )}
              </TableCell>
            )}
            <TableCell className="text-right">
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(shipment)}
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                {status === "pending" && (
                  <>
                    <Button className="bg-gradient-success hover:opacity-90" size="sm">
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-destructive/10">
                      <X className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {status === "confirmed" && (
                  <Button className="bg-gradient-primary hover:opacity-90" size="sm">
                    <Play className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
