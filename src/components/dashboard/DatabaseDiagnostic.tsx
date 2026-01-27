import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface TableStatus {
  name: string;
  count: number;
  exists: boolean;
}

export function DatabaseDiagnostic() {
  const { data: tableStatuses, isLoading } = useQuery({
    queryKey: ['database-diagnostic'],
    queryFn: async () => {
      const tables = [
        'embarques',
        'drivers',
        'delivery_receipts',
        'driver_documents',
        'driver_field_config',
        'message_templates',
        'ranking_rules'
      ];

      const statuses: TableStatus[] = [];

      for (const tableName of tables) {
        try {
          const { count, error } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });

          statuses.push({
            name: tableName,
            count: count || 0,
            exists: !error
          });
        } catch {
          statuses.push({
            name: tableName,
            count: 0,
            exists: false
          });
        }
      }

      return statuses;
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico do Banco de Dados</CardTitle>
        <CardDescription>
          Status em tempo real das tabelas principais
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verificando conexão...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {tableStatuses?.map((table) => (
              <div key={table.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {table.exists ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">{table.name}</span>
                </div>
                <Badge variant={table.count > 0 ? "default" : "secondary"}>
                  {table.count} registro{table.count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
