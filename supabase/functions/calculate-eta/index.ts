import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ETACalculationData {
  origin: string;
  destination: string;
  departure_time?: string;
  vehicle_type?: string;
  historical_data?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { origin, destination, departure_time, vehicle_type, historical_data = true }: ETACalculationData = await req.json();

    console.log('Calculating ETA for:', { origin, destination, departure_time, vehicle_type });

    // 1. Calcular distância base (simplificado - em produção usar Google Maps API)
    const baseDistanceKm = calculateBaseDistance(origin, destination);
    
    // 2. Buscar dados históricos de lead time para a rota
    let historicalLeadTime = null;
    if (historical_data) {
      const { data: routeData } = await supabase
        .from('route_analytics')
        .select('avg_lead_time')
        .eq('origin', origin)
        .eq('destination', destination)
        .single();

      historicalLeadTime = routeData?.avg_lead_time;
    }

    // 3. Calcular tempo estimado
    let estimatedHours: number;
    
    if (historicalLeadTime) {
      // Usar dados históricos se disponível
      estimatedHours = parseInterval(historicalLeadTime);
    } else {
      // Calcular com base em velocidade média
      const avgSpeedKmH = vehicle_type === 'carreta' ? 60 : 70;
      estimatedHours = baseDistanceKm / avgSpeedKmH;
      
      // Adicionar buffer para paradas (10% do tempo)
      estimatedHours *= 1.1;
    }

    // 4. Calcular ETA
    const departureDate = departure_time ? new Date(departure_time) : new Date();
    const estimatedArrival = new Date(departureDate.getTime() + estimatedHours * 60 * 60 * 1000);
    
    // 5. Calcular disponibilidade (2h após chegada para descarga)
    const availableAt = new Date(estimatedArrival.getTime() + 2 * 60 * 60 * 1000);

    const result = {
      origin,
      destination,
      distance_km: baseDistanceKm,
      estimated_hours: estimatedHours,
      departure_time: departureDate.toISOString(),
      estimated_arrival: estimatedArrival.toISOString(),
      available_at: availableAt.toISOString(),
      calculation_method: historicalLeadTime ? 'historical' : 'calculated',
      confidence_level: historicalLeadTime ? 'high' : 'medium',
    };

    console.log('ETA calculated:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error calculating ETA:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateBaseDistance(origin: string, destination: string): number {
  // Simplificado: tabela de distâncias aproximadas entre principais cidades BR
  const distances: Record<string, Record<string, number>> = {
    'São Paulo': { 'Rio de Janeiro': 430, 'Belo Horizonte': 580, 'Curitiba': 410, 'Porto Alegre': 1120 },
    'Rio de Janeiro': { 'São Paulo': 430, 'Belo Horizonte': 440, 'Salvador': 1650 },
    'Belo Horizonte': { 'São Paulo': 580, 'Rio de Janeiro': 440, 'Brasília': 720 },
  };

  const distance = distances[origin]?.[destination] || distances[destination]?.[origin];
  
  // Se não encontrar, estimar baseado em uma média
  return distance || 500;
}

function parseInterval(interval: string): number {
  // Parse PostgreSQL interval to hours
  // Ex: "1 day 05:30:00" -> 29.5 hours
  const match = interval.match(/(\d+)\s*day[s]?\s*(\d+):(\d+):(\d+)/);
  if (match) {
    const days = parseInt(match[1]);
    const hours = parseInt(match[2]);
    const minutes = parseInt(match[3]);
    return days * 24 + hours + minutes / 60;
  }
  return 24; // default
}
