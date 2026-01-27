import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatchingSuggestions, useEmbarquesNeedingMatch } from "@/hooks/useMatching";
import { Truck, MapPin, Clock, TrendingUp, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const MatchingPanel = () => {
    const { data: embarques, isLoading: loadingEmbarques } = useEmbarquesNeedingMatch();
    const [selectedEmbarqueId, setSelectedEmbarqueId] = useState<string | null>(null);
    const { data: suggestions, isLoading: loadingSuggestions } = useMatchingSuggestions(selectedEmbarqueId);
    const { toast } = useToast();

    const handleOfferToDriver = (motoristaId: string, motoristaNome: string) => {
        toast({
            title: "Oferta Enviada",
            description: `Frete oferecido para ${motoristaNome}`,
        });
        // TODO: Implementar lógica de criação de oferta
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Matching Inteligente
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Sugestões automáticas de motoristas para cada carga
                    </p>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Coluna 1: Cargas Aguardando */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Cargas Aguardando Motorista</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loadingEmbarques ? (
                            <div className="space-y-2">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ) : !embarques || embarques.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhuma carga aguardando</p>
                            </div>
                        ) : (
                            embarques.map((embarque: any) => (
                                <div
                                    key={embarque.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedEmbarqueId === embarque.id
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "hover:bg-muted/50"
                                        }`}
                                    onClick={() => setSelectedEmbarqueId(embarque.id)}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-sm">
                                                Embarque #{embarque.id.substring(0, 8)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {embarque.produto_predominante || "Produto não especificado"}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {embarque.status === 'pending' ? 'Pendente' : 'Aguardando'}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">
                                            {embarque.origin?.split(',')[0]} → {embarque.destination?.split(',')[0]}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Coluna 2: Sugestões de Motoristas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {selectedEmbarqueId ? "Motoristas Sugeridos" : "Selecione uma carga"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedEmbarqueId ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Clique em uma carga para ver sugestões</p>
                            </div>
                        ) : loadingSuggestions ? (
                            <div className="space-y-2">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : !suggestions || suggestions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhum motorista compatível encontrado</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={suggestion.motorista_id}
                                        className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                    >
                                        {/* Header com Nome e Score */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{suggestion.motorista_nome}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">
                                                            Score: {suggestion.score_total}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={
                                                    suggestion.compatibilidade === 'alta'
                                                        ? 'default'
                                                        : suggestion.compatibilidade === 'media'
                                                            ? 'secondary'
                                                            : 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {suggestion.compatibilidade === 'alta' && '✅ Alta'}
                                                {suggestion.compatibilidade === 'media' && '⚠️ Média'}
                                                {suggestion.compatibilidade === 'baixa' && '❌ Baixa'}
                                            </Badge>
                                        </div>

                                        {/* Detalhes */}
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {suggestion.justificativa.disponibilidade}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {suggestion.justificativa.localizacao}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Scores Detalhados */}
                                        <div className="grid grid-cols-5 gap-1 mb-3">
                                            {[
                                                { label: 'Disp', value: suggestion.score_disponibilidade },
                                                { label: 'Equip', value: suggestion.score_equipamento },
                                                { label: 'Local', value: suggestion.score_localizacao },
                                                { label: 'Hist', value: suggestion.score_historico },
                                                { label: 'Com', value: suggestion.score_comercial },
                                            ].map((item) => (
                                                <div key={item.label} className="text-center">
                                                    <div
                                                        className={`h-1 rounded-full mb-1 ${item.value >= 80
                                                                ? 'bg-green-500'
                                                                : item.value >= 60
                                                                    ? 'bg-yellow-500'
                                                                    : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${item.value}%` }}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Ação */}
                                        <Button
                                            size="sm"
                                            className="w-full"
                                            variant={suggestion.compatibilidade === 'alta' ? 'default' : 'outline'}
                                            onClick={() => handleOfferToDriver(suggestion.motorista_id, suggestion.motorista_nome)}
                                        >
                                            <Truck className="h-3 w-3 mr-2" />
                                            Ofertar Frete
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
