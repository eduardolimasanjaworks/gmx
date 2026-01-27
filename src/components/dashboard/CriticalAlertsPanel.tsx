import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, Clock, UserX, CheckCircle, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicDirectus } from "@/lib/directus";
import { readItems, updateItem } from "@directus/sdk";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Alert {
    id: string;
    tipo: string;
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    titulo: string;
    descricao: string;
    motorista_id?: string;
    embarque_id?: string;
    resolvido: boolean;
    acao_sugerida?: string;
    created_at: string;
}

const severityConfig = {
    critica: { color: 'destructive', icon: AlertTriangle, label: 'Crítico' },
    alta: { color: 'destructive', icon: AlertTriangle, label: 'Alto' },
    media: { color: 'warning', icon: Clock, label: 'Médio' },
    baixa: { color: 'secondary', icon: FileText, label: 'Baixo' },
};

export const CriticalAlertsPanel = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: alerts, isLoading } = useQuery({
        queryKey: ['operational-alerts'],
        queryFn: async () => {
            const data = await publicDirectus.request(
                readItems('operational_alerts' as any, {
                    filter: { resolvido: { _eq: false } },
                    sort: ['-severidade', '-created_at'],
                    limit: 50,
                })
            );
            return data as Alert[];
        },
        refetchInterval: 1000 * 60, // Atualiza a cada minuto
    });

    const resolveAlertMutation = useMutation({
        mutationFn: async (alertId: string) => {
            await publicDirectus.request(
                updateItem('operational_alerts' as any, alertId, {
                    resolvido: true,
                    resolvido_em: new Date().toISOString(),
                })
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['operational-alerts'] });
            toast({ title: "Alerta resolvido com sucesso" });
        },
    });

    const alertsByType = alerts?.reduce((acc, alert) => {
        if (!acc[alert.tipo]) acc[alert.tipo] = [];
        acc[alert.tipo].push(alert);
        return acc;
    }, {} as Record<string, Alert[]>);

    const criticalCount = alerts?.filter(a => a.severidade === 'critica').length || 0;
    const highCount = alerts?.filter(a => a.severidade === 'alta').length || 0;

    return (
        <div className="space-y-6">
            {/* Header com Resumo */}
            <Card className="border-l-4 border-l-destructive">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Pendências Críticas
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Situações que exigem ação imediata
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {criticalCount > 0 && (
                                <Badge variant="destructive" className="text-lg px-3 py-1">
                                    {criticalCount} Crítico{criticalCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                            {highCount > 0 && (
                                <Badge variant="destructive" className="text-lg px-3 py-1 opacity-70">
                                    {highCount} Alto{highCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Lista de Alertas */}
            {isLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : !alerts || alerts.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
                            <p className="text-lg font-semibold">Tudo em ordem!</p>
                            <p className="text-sm">Nenhuma pendência crítica no momento</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {alerts.map((alert) => {
                        const config = severityConfig[alert.severidade];
                        const Icon = config.icon;

                        return (
                            <Card
                                key={alert.id}
                                className={`border-l-4 ${alert.severidade === 'critica'
                                        ? 'border-l-red-600 bg-red-50/50 dark:bg-red-950/20'
                                        : alert.severidade === 'alta'
                                            ? 'border-l-orange-600 bg-orange-50/50 dark:bg-orange-950/20'
                                            : alert.severidade === 'media'
                                                ? 'border-l-yellow-600'
                                                : 'border-l-blue-600'
                                    }`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex gap-3 flex-1">
                                            <div className="flex-shrink-0">
                                                <Icon
                                                    className={`h-5 w-5 ${alert.severidade === 'critica' || alert.severidade === 'alta'
                                                            ? 'text-destructive'
                                                            : 'text-warning'
                                                        }`}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-sm">{alert.titulo}</h4>
                                                    <Badge variant={config.color as any} className="text-xs">
                                                        {config.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{alert.descricao}</p>
                                                {alert.acao_sugerida && (
                                                    <div className="bg-muted/50 p-2 rounded text-xs">
                                                        <span className="font-semibold">Ação sugerida:</span> {alert.acao_sugerida}
                                                    </div>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Criado há {new Date(alert.created_at).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => resolveAlertMutation.mutate(alert.id)}
                                                disabled={resolveAlertMutation.isPending}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Resolver
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
