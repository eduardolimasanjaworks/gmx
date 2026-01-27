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

    console.log('Starting intelligent alerts monitor...');

    const alertsCreated: any[] = [];
    const now = new Date();

    // 1. Detectar motoristas inativos (sem atualização há > 2h)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const { data: inactiveDrivers } = await supabase
      .from('drivers')
      .select('*')
      .eq('availability_status', 'in_transit')
      .lt('last_update', twoHoursAgo.toISOString());

    for (const driver of inactiveDrivers || []) {
      // Verificar se já existe alerta ativo
      const { data: existingAlert } = await supabase
        .from('operational_alerts')
        .select('id')
        .eq('entity_id', driver.id)
        .eq('alert_type', 'driver_inactive')
        .eq('is_resolved', false)
        .single();

      if (!existingAlert) {
        const hoursSinceUpdate = Math.floor((now.getTime() - new Date(driver.last_update).getTime()) / (1000 * 60 * 60));
        
        const { error } = await supabase
          .from('operational_alerts')
          .insert({
            alert_type: 'driver_inactive',
            severity: hoursSinceUpdate > 4 ? 'high' : 'medium',
            entity_type: 'driver',
            entity_id: driver.id,
            title: `Motorista sem atualização há ${hoursSinceUpdate}h`,
            description: `${driver.name} (${driver.truck_plate}) não atualiza status desde ${new Date(driver.last_update).toLocaleString('pt-BR')}`,
            action_required: 'Verificar status do motorista e solicitar atualização de localização',
          });

        if (!error) {
          alertsCreated.push({ type: 'driver_inactive', driver_id: driver.id });
        }
      }
    }

    // 2. Detectar cargas sem aceite há > 5h
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    const { data: unacceptedShipments } = await supabase
      .from('embarques')
      .select('*')
      .in('status', ['new', 'pending'])
      .is('driver_id', null)
      .lt('created_at', fiveHoursAgo.toISOString());

    for (const shipment of unacceptedShipments || []) {
      const { data: existingAlert } = await supabase
        .from('operational_alerts')
        .select('id')
        .eq('entity_id', shipment.id)
        .eq('alert_type', 'shipment_no_response')
        .eq('is_resolved', false)
        .single();

      if (!existingAlert) {
        const hoursSinceCreated = Math.floor((now.getTime() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60));
        
        const { error } = await supabase
          .from('operational_alerts')
          .insert({
            alert_type: 'shipment_no_response',
            severity: hoursSinceCreated > 12 ? 'critical' : 'high',
            entity_type: 'shipment',
            entity_id: shipment.id,
            title: `Carga sem aceite há ${hoursSinceCreated}h`,
            description: `${shipment.origin} → ${shipment.destination} aguarda motorista há ${hoursSinceCreated}h. Risco de NoShow!`,
            action_required: 'Acionar matching manual ou buscar motorista alternativo',
          });

        if (!error) {
          alertsCreated.push({ type: 'shipment_no_response', shipment_id: shipment.id });
        }
      }
    }

    // 3. Detectar embarques com documentos pendentes
    const { data: shipmentsInTransit } = await supabase
      .from('embarques')
      .select('id, origin, destination, status')
      .eq('status', 'in_transit');

    for (const shipment of shipmentsInTransit || []) {
      const { data: documents } = await supabase
        .from('shipment_documents')
        .select('id')
        .eq('shipment_id', shipment.id);

      if (!documents || documents.length === 0) {
        const { data: existingAlert } = await supabase
          .from('operational_alerts')
          .select('id')
          .eq('entity_id', shipment.id)
          .eq('alert_type', 'missing_documents')
          .eq('is_resolved', false)
          .single();

        if (!existingAlert) {
          const { error } = await supabase
            .from('operational_alerts')
            .insert({
              alert_type: 'missing_documents',
              severity: 'medium',
              entity_type: 'shipment',
              entity_id: shipment.id,
              title: 'Documentos pendentes',
              description: `Embarque ${shipment.origin} → ${shipment.destination} em trânsito sem documentos cadastrados`,
              action_required: 'Solicitar upload de CT-e, canhoto ou outros documentos obrigatórios',
            });

          if (!error) {
            alertsCreated.push({ type: 'missing_documents', shipment_id: shipment.id });
          }
        }
      }
    }

    // 4. Detectar atrasos significativos (> 2h)
    const { data: journeys } = await supabase
      .from('vehicle_journeys')
      .select('*')
      .eq('is_on_time', false)
      .is('delay_justification', null)
      .in('current_status', ['in_transit', 'unloading']);

    for (const journey of journeys || []) {
      if (!journey.estimated_arrival) continue;

      const delayMinutes = Math.floor((now.getTime() - new Date(journey.estimated_arrival).getTime()) / (1000 * 60));
      
      if (delayMinutes > 120) { // Mais de 2h de atraso
        const { data: existingAlert } = await supabase
          .from('operational_alerts')
          .select('id')
          .eq('entity_id', journey.id)
          .eq('alert_type', 'significant_delay')
          .eq('is_resolved', false)
          .single();

        if (!existingAlert) {
          const { error } = await supabase
            .from('operational_alerts')
            .insert({
              alert_type: 'significant_delay',
              severity: delayMinutes > 240 ? 'critical' : 'high',
              entity_type: 'journey',
              entity_id: journey.id,
              title: `Atraso significativo: ${Math.floor(delayMinutes / 60)}h`,
              description: `Veículo em viagem com atraso de ${Math.floor(delayMinutes / 60)}h sem justificativa`,
              action_required: 'Solicitar justificativa ao motorista e informar cliente',
            });

          if (!error) {
            alertsCreated.push({ type: 'significant_delay', journey_id: journey.id });
          }
        }
      }
    }

    console.log(`Created ${alertsCreated.length} new alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alertsCreated.length,
        alerts: alertsCreated,
        checks: {
          inactive_drivers: inactiveDrivers?.length || 0,
          unaccepted_shipments: unacceptedShipments?.length || 0,
          shipments_in_transit: shipmentsInTransit?.length || 0,
          delayed_journeys: journeys?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in alerts monitor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
