import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFollow, type FollowItem } from "@/hooks/useFollow";
import {
  Search,
  Package,
  Truck,
  MapPin,
  Download,
  Upload,
  Calendar,
  Route,
} from "lucide-react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvImportDialog } from "./CsvImportDialog";
import {
  FollowTableSection,
  formatDateInput,
  getStatusBadge,
} from "./follow-table-helpers";

export function ShipmentFollow() {
  const { followItems, isLoading, updateFollow } = useFollow();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const navigate = useNavigate();

  const filteredItems = followItems.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.origem?.toLowerCase().includes(q) ||
      item.destino?.toLowerCase().includes(q) ||
      item.cliente?.toLowerCase().includes(q) ||
      item.pedido?.toLowerCase().includes(q) ||
      item.tp?.toLowerCase().includes(q) ||
      item.produto?.toLowerCase().includes(q)
    );
  });

  const handleUpdateField = async (
    id: number | string,
    field: keyof FollowItem,
    value: string,
  ) => {
    try {
      await updateFollow(id, { [field]: value || null });
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  const openMap = (item: FollowItem) => {
    const ext = item as FollowItem & { origem_lat?: string; origem_lng?: string; data_coleta?: string };
    navigate(
      `/?tab=tracking&load_origin=${encodeURIComponent(item.origem || "")}&load_lat=${ext.origem_lat || ""}&load_lng=${ext.origem_lng || ""}&load_date=${ext.data_coleta || ""}`,
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  const empty = filteredItems.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Follow — Acompanhamento de Cargas
          </CardTitle>
          <Badge variant="outline">Total: {filteredItems.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, origem, destino, TP, produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsCsvImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        {empty ? (
          <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-10 w-10 opacity-40" />
            <p className="font-medium">Nenhum registro encontrado</p>
            <p className="mt-1 text-sm">Importe um CSV para começar</p>
          </div>
        ) : (
          <>
            <FollowTableSection
              title="Tabela 1 — Carga"
              icon={<Package className="h-4 w-4 text-emerald-600" />}
              colSpan={4}
              empty={false}
              header={
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900">
                    <TableHead className="min-w-[120px] font-bold">Pedido</TableHead>
                    <TableHead className="min-w-[180px] font-bold">Produto</TableHead>
                    <TableHead className="min-w-[100px] font-bold">Paletes</TableHead>
                    <TableHead className="min-w-[120px] font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
              }
              body={
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={`carga-${item.id}`}>
                      <TableCell className="font-semibold">{item.pedido || "-"}</TableCell>
                      <TableCell>{item.produto || "-"}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          defaultValue={String(item.paletes ?? "")}
                          placeholder="Ex: 12"
                          className="h-8 min-w-[80px] text-sm"
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== String(item.paletes ?? "")) {
                              handleUpdateField(item.id, "paletes", v);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              }
            />

            <FollowTableSection
              title="Tabela 2 — Rota"
              icon={<Route className="h-4 w-4 text-blue-600" />}
              colSpan={4}
              empty={false}
              header={
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900">
                    <TableHead className="min-w-[120px] font-bold">Pedido</TableHead>
                    <TableHead className="min-w-[200px] font-bold">Origem</TableHead>
                    <TableHead className="min-w-[200px] font-bold">Destino</TableHead>
                    <TableHead className="min-w-[60px] font-bold">UF</TableHead>
                  </TableRow>
                </TableHeader>
              }
              body={
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={`rota-${item.id}`}>
                      <TableCell className="font-semibold">{item.pedido || "-"}</TableCell>
                      <TableCell>{item.origem || "-"}</TableCell>
                      <TableCell>{item.destino || "-"}</TableCell>
                      <TableCell className="font-medium">{item.uf || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              }
            />

            <FollowTableSection
              title="Tabela 3 — Logística e datas"
              icon={<Truck className="h-4 w-4 text-amber-600" />}
              colSpan={6}
              empty={false}
              header={
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900">
                    <TableHead className="min-w-[100px] font-bold">Pedido</TableHead>
                    <TableHead className="min-w-[160px] font-bold">Cliente</TableHead>
                    <TableHead className="min-w-[160px] font-bold">Transportadora</TableHead>
                    <TableHead className="min-w-[140px] font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Data pedido
                      </span>
                    </TableHead>
                    <TableHead className="min-w-[140px] font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Data carregado
                      </span>
                    </TableHead>
                    <TableHead className="min-w-[120px] font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              }
              body={
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={`log-${item.id}`}>
                      <TableCell className="font-semibold">{item.pedido || "-"}</TableCell>
                      <TableCell>{item.cliente || "-"}</TableCell>
                      <TableCell>{item.tp || "-"}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          defaultValue={formatDateInput(item.data_pedido)}
                          className="h-8 min-w-[130px] text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== formatDateInput(item.data_pedido)) {
                              handleUpdateField(item.id, "data_pedido", e.target.value);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          defaultValue={formatDateInput(item.data_carregado)}
                          className="h-8 min-w-[130px] text-sm"
                          onBlur={(e) => {
                            if (e.target.value !== formatDateInput(item.data_carregado)) {
                              handleUpdateField(item.id, "data_carregado", e.target.value);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openMap(item)}
                        >
                          <MapPin className="mr-1 h-3.5 w-3.5" />
                          Mapa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              }
            />
          </>
        )}

        <CsvImportDialog open={isCsvImportOpen} onOpenChange={setIsCsvImportOpen} />
      </CardContent>
    </Card>
  );
}
