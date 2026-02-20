import React, { useState } from "react";
import { AdvancedMap, AdvancedMapProps } from "@/components/ui/interactive-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";

interface MapTestPageProps {
    styleName: string;
    initialLayer: AdvancedMapProps['initialLayer'];
    description: string;
}

const MapTestPage = ({ styleName, initialLayer, description }: MapTestPageProps) => {
    // Fetch real data to make the test realistic
    const { data: drivers = [], isLoading } = useQuery({
        queryKey: ['tracking-map-drivers-test'],
        queryFn: async () => {
            try {
                const response = await directus.request(readItems('disponivel', {
                    filter: {
                        disponivel: { _eq: true },
                        status: { _eq: 'published' }
                    },
                    fields: ['*', 'motorista_id.*'],
                }));
                return response.filter((d: any) =>
                    d.latitude && d.longitude &&
                    !isNaN(Number(d.latitude)) && !isNaN(Number(d.longitude))
                );
            } catch (error) {
                console.error("Error fetching tracking data:", error);
                return [];
            }
        },
        refetchInterval: 30000
    });

    const markers = drivers.map((d: any) => ({
        id: d.id,
        position: [Number(d.latitude), Number(d.longitude)] as [number, number],
        color: 'blue',
        size: 'medium',
        popup: {
            title: `${d.motorista_id?.nome || 'Motorista'} ${d.motorista_id?.sobrenome || ''}`,
            content: `${d.localizacao_atual || 'Localização não informada'}`,
            image: d.motorista_id?.foto ? `http://91.99.137.101:8057/assets/${d.motorista_id.foto}` : undefined
        }
    }));

    // Add a sample polygon and circle to test those features too
    const samplePolygon = {
        id: "test-zone",
        positions: [
            [-15.75, -47.95],
            [-15.80, -47.95],
            [-15.80, -47.90],
            [-15.75, -47.90]
        ] as [number, number][],
        style: { color: 'purple', weight: 2, fillOpacity: 0.2 },
        popup: "Zona de Teste (Área Controlada)"
    };

    return (
        <div className="p-6 h-screen flex flex-col gap-4">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                Teste de Visualização: <span className="text-primary">{styleName}</span>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline">Zoom: 4</Badge>
                            <Badge variant="outline">Drivers: {drivers.length}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 relative">
                    <AdvancedMap
                        center={[-15.7801, -47.9292]}
                        zoom={4}
                        markers={markers}
                        polygons={[samplePolygon]}
                        enableClustering={true}
                        enableSearch={true}
                        enableControls={true}
                        initialLayer={initialLayer}
                        style={{ height: '100%', width: '100%' }}
                        className="rounded-none h-full"
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <a href="/teste3" className="p-4 bg-blue-900 text-white rounded-lg text-center hover:opacity-90 transition">
                    Google Hybrid (teste3)
                </a>
                <a href="/teste4" className="p-4 bg-green-600 text-white rounded-lg text-center hover:opacity-90 transition">
                    Google Maps (teste4)
                </a>
            </div>
        </div>
    );
};

export default MapTestPage;
