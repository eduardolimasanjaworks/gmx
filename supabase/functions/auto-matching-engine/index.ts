import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting automatic matching engine...');

    // 1. Buscar embarques pendentes (sem motorista atribuído)
    const { data: pendingShipments, error: shipmentsError } = await supabase
      .from('embarques')
      .select('*')
      .is('driver_id', null)
      .in('status', ['new', 'pending'])
      .order('created_at', { ascending: true });

    if (shipmentsError) throw shipmentsError;

    console.log(`Found ${pendingShipments?.length || 0} pending shipments`);

    // 2. Buscar motoristas disponíveis
    const { data: availableDrivers, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .eq('availability_status', 'available')
      .eq('status', 'active');

    if (driversError) throw driversError;

    console.log(`Found ${availableDrivers?.length || 0} available drivers`);

    // 3. Buscar forecast de disponibilidade futura
    const { data: forecasts, error: forecastsError } = await supabase
      .from('vehicle_availability_forecast')
      .select('*')
      .gte('estimated_available_at', new Date().toISOString());

    if (forecastsError) throw forecastsError;

    const matchesCreated: any[] = [];

    // 4. Para cada embarque, calcular compatibilidade com motoristas
    for (const shipment of pendingShipments || []) {
      // Verificar se já existe matching sugerido
      const { data: existingMatches } = await supabase
        .from('shipment_vehicle_matching')
        .select('id')
        .eq('embarque_id', shipment.id)
        .eq('status', 'suggested');

      if (existingMatches && existingMatches.length > 0) {
        console.log(`Shipment ${shipment.id} already has suggestions, skipping`);
        continue;
      }

      const matches: any[] = [];

      // Calcular score para motoristas disponíveis agora
      for (const driver of availableDrivers || []) {
        const score = calculateCompatibilityScore(shipment, driver, 'now');
        if (score.total_score >= 50) { // Mínimo de 50% de compatibilidade
          matches.push({
            driver,
            score: score.total_score,
            factors: score.factors,
            level: score.level,
            availability_type: 'now'
          });
        }
      }

      // Calcular score para motoristas que ficarão disponíveis em breve
      for (const forecast of forecasts || []) {
        // Buscar dados do motorista
        const { data: driver } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', forecast.driver_id)
          .single();

        if (!driver) continue;

        const score = calculateCompatibilityScore(shipment, driver, 'forecast', forecast);
        if (score.total_score >= 50) {
          matches.push({
            driver,
            score: score.total_score,
            factors: score.factors,
            level: score.level,
            availability_type: 'forecast',
            estimated_available_at: forecast.estimated_available_at
          });
        }
      }

      // Ordenar por score e pegar top 5
      matches.sort((a, b) => b.score - a.score);
      const topMatches = matches.slice(0, 5);

      // Criar registros de matching
      for (const match of topMatches) {
        const { error: insertError } = await supabase
          .from('shipment_vehicle_matching')
          .insert({
            embarque_id: shipment.id,
            driver_id: match.driver.id,
            compatibility_score: match.score,
            compatibility_level: match.level,
            factors: match.factors,
            status: 'suggested',
          });

        if (!insertError) {
          matchesCreated.push({
            shipment_id: shipment.id,
            driver_id: match.driver.id,
            score: match.score,
          });
        }
      }
    }

    console.log(`Created ${matchesCreated.length} new matches`);

    return new Response(
      JSON.stringify({
        success: true,
        pending_shipments: pendingShipments?.length || 0,
        available_drivers: availableDrivers?.length || 0,
        matches_created: matchesCreated.length,
        matches: matchesCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in matching engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateCompatibilityScore(
  shipment: any,
  driver: any,
  availabilityType: 'now' | 'forecast',
  forecast?: any
): { total_score: number; factors: any; level: string } {
  const factors: any = {};
  let totalScore = 0;

  // 1. Compatibilidade Geográfica (40 pontos)
  const geoScore = calculateGeoScore(shipment.origin, driver.current_location || driver.city);
  factors.geo_score = geoScore;
  totalScore += geoScore * 0.4;

  // 2. Compatibilidade de Tempo (30 pontos)
  const timeScore = calculateTimeScore(shipment, availabilityType, forecast);
  factors.time_score = timeScore;
  totalScore += timeScore * 0.3;

  // 3. Compatibilidade de Equipamento (20 pontos)
  const equipScore = calculateEquipmentScore(shipment.cargo_type, driver.vehicle_type);
  factors.equipment_score = equipScore;
  totalScore += equipScore * 0.2;

  // 4. Histórico de Performance (10 pontos)
  const historyScore = 80; // Simplificado - em produção buscar dados reais
  factors.history_score = historyScore;
  totalScore += historyScore * 0.1;

  const level = totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low';

  return {
    total_score: Math.round(totalScore),
    factors,
    level,
  };
}

function calculateGeoScore(origin: string, driverLocation: string): number {
  // Simplificado: mesmo estado = 100, estado vizinho = 70, longe = 40
  if (!driverLocation) return 50;
  
  if (origin.includes(driverLocation) || driverLocation.includes(origin)) {
    return 100;
  }
  
  // Verificar estados vizinhos (simplificado)
  const neighbors: Record<string, string[]> = {
    'SP': ['RJ', 'MG', 'PR'],
    'RJ': ['SP', 'MG', 'ES'],
    'MG': ['SP', 'RJ', 'ES', 'BA'],
  };
  
  const originState = extractState(origin);
  const driverState = extractState(driverLocation);
  
  if (neighbors[originState]?.includes(driverState)) {
    return 70;
  }
  
  return 40;
}

function calculateTimeScore(shipment: any, availabilityType: string, forecast?: any): number {
  if (availabilityType === 'now') return 100;
  
  if (!forecast?.estimated_available_at || !shipment.pickup_date) return 50;
  
  const availableAt = new Date(forecast.estimated_available_at);
  const pickupDate = new Date(shipment.pickup_date);
  
  const hoursDiff = (pickupDate.getTime() - availableAt.getTime()) / (1000 * 60 * 60);
  
  // Ideal: disponível 4-24h antes
  if (hoursDiff >= 4 && hoursDiff <= 24) return 100;
  if (hoursDiff >= 1 && hoursDiff <= 48) return 80;
  if (hoursDiff >= -6 && hoursDiff <= 72) return 60;
  
  return 40;
}

function calculateEquipmentScore(cargoType: string, vehicleType: string): number {
  // Simplificado - em produção ter tabela de compatibilidade
  if (!cargoType || !vehicleType) return 70;
  
  const compatibility: Record<string, string[]> = {
    'granel': ['carreta', 'bitrem', 'rodotrem'],
    'carga seca': ['carreta', 'truck', 'toco'],
    'refrigerada': ['carreta refrigerada', 'truck refrigerado'],
  };
  
  const compatibleVehicles = compatibility[cargoType.toLowerCase()] || [];
  
  if (compatibleVehicles.some(v => vehicleType?.toLowerCase().includes(v))) {
    return 100;
  }
  
  return 60;
}

function extractState(location: string): string {
  // Extrair sigla do estado (simplificado)
  const states = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'ES'];
  for (const state of states) {
    if (location.includes(state)) return state;
  }
  return '';
}
