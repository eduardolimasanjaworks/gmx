-- Sprint 1: Tabelas para inteligência operacional

-- 1. Jornada dos Veículos (Timeline + ETA)
CREATE TABLE IF NOT EXISTS public.vehicle_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  embarque_id uuid REFERENCES public.embarques(id) ON DELETE CASCADE,
  departure_time timestamp with time zone,
  estimated_arrival timestamp with time zone,
  actual_arrival timestamp with time zone,
  route_lead_time interval,
  actual_lead_time interval,
  current_status text DEFAULT 'loading' CHECK (current_status IN ('loading', 'in_transit', 'unloading', 'completed')),
  delay_reason text,
  delay_justification text,
  justification_added_by uuid REFERENCES public.profiles(id),
  justification_added_at timestamp with time zone,
  is_on_time boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Previsão de Disponibilidade de Veículos
CREATE TABLE IF NOT EXISTS public.vehicle_availability_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  current_embarque_id uuid REFERENCES public.embarques(id),
  estimated_available_at timestamp with time zone,
  estimated_location text,
  next_suggested_embarque_id uuid REFERENCES public.embarques(id),
  match_score numeric,
  forecast_updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Matching Automático (Veículos x Cargas)
CREATE TABLE IF NOT EXISTS public.shipment_vehicle_matching (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id uuid REFERENCES public.embarques(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  compatibility_score numeric DEFAULT 0 CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  compatibility_level text DEFAULT 'medium' CHECK (compatibility_level IN ('high', 'medium', 'low')),
  factors jsonb DEFAULT '{}',
  status text DEFAULT 'suggested' CHECK (status IN ('suggested', 'offered', 'accepted', 'rejected')),
  offered_at timestamp with time zone,
  response_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Alertas Operacionais Inteligentes
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'driver_inactive', 'shipment_no_response', 'document_pending', 
    'delay_risk', 'maintenance', 'accident', 'stuck_unloading',
    'loading_not_done', 'damage_detected', 'gr_blocked'
  )),
  severity text DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  entity_type text CHECK (entity_type IN ('driver', 'shipment', 'document')),
  entity_id uuid,
  title text NOT NULL,
  description text,
  action_required text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Atividades dos Operadores (rastreamento interno)
CREATE TABLE IF NOT EXISTS public.operator_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text CHECK (activity_type IN (
    'shipment_created', 'shipment_updated', 'document_reviewed', 
    'status_changed', 'driver_contacted', 'alert_resolved'
  )),
  entity_id uuid,
  entity_type text CHECK (entity_type IN ('shipment', 'driver', 'document', 'alert')),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Performance dos Operadores (agregado diário)
CREATE TABLE IF NOT EXISTS public.operator_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  session_start timestamp with time zone,
  session_end timestamp with time zone,
  last_heartbeat timestamp with time zone,
  total_online_minutes integer DEFAULT 0,
  shipments_created integer DEFAULT 0,
  shipments_updated integer DEFAULT 0,
  documents_reviewed integer DEFAULT 0,
  status_changes integer DEFAULT 0,
  alerts_resolved integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(operator_id, date)
);

-- 7. Análise de Rotas (métricas agregadas)
CREATE TABLE IF NOT EXISTS public.route_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  product_type text,
  avg_lead_time interval,
  successful_trips integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  avg_value numeric,
  fleet_reuse_percentage numeric DEFAULT 0,
  profitability_score numeric,
  last_calculated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(origin, destination, product_type)
);

-- 8. Propostas Diárias de Veículos
CREATE TABLE IF NOT EXISTS public.daily_vehicle_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  current_location text,
  available_at timestamp with time zone,
  vehicle_type text,
  compatible_products text[],
  suggested_clients jsonb DEFAULT '[]',
  offer_status text DEFAULT 'pending' CHECK (offer_status IN ('pending', 'sent', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicle_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_availability_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_vehicle_matching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_vehicle_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can view, authenticated users can manage
CREATE POLICY "Anyone can view vehicle journeys" ON public.vehicle_journeys FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage vehicle journeys" ON public.vehicle_journeys FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view availability forecasts" ON public.vehicle_availability_forecast FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage forecasts" ON public.vehicle_availability_forecast FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view matching" ON public.shipment_vehicle_matching FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage matching" ON public.shipment_vehicle_matching FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view alerts" ON public.operational_alerts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage alerts" ON public.operational_alerts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Operators can view own activity" ON public.operator_activity FOR SELECT USING (operator_id = auth.uid() OR is_admin_or_responsavel(auth.uid()));
CREATE POLICY "Authenticated users can insert activity" ON public.operator_activity FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Operators can view own performance" ON public.operator_performance FOR SELECT USING (operator_id = auth.uid() OR is_admin_or_responsavel(auth.uid()));
CREATE POLICY "Authenticated users can manage performance" ON public.operator_performance FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view route analytics" ON public.route_analytics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage route analytics" ON public.route_analytics FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view daily offers" ON public.daily_vehicle_offers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage daily offers" ON public.daily_vehicle_offers FOR ALL USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_vehicle_journeys_updated_at
  BEFORE UPDATE ON public.vehicle_journeys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipment_vehicle_matching_updated_at
  BEFORE UPDATE ON public.shipment_vehicle_matching
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operator_performance_updated_at
  BEFORE UPDATE ON public.operator_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_vehicle_offers_updated_at
  BEFORE UPDATE ON public.daily_vehicle_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_journeys_driver ON public.vehicle_journeys(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_journeys_embarque ON public.vehicle_journeys(embarque_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_journeys_status ON public.vehicle_journeys(current_status);

CREATE INDEX IF NOT EXISTS idx_availability_forecast_driver ON public.vehicle_availability_forecast(driver_id);
CREATE INDEX IF NOT EXISTS idx_availability_forecast_available_at ON public.vehicle_availability_forecast(estimated_available_at);

CREATE INDEX IF NOT EXISTS idx_matching_embarque ON public.shipment_vehicle_matching(embarque_id);
CREATE INDEX IF NOT EXISTS idx_matching_driver ON public.shipment_vehicle_matching(driver_id);
CREATE INDEX IF NOT EXISTS idx_matching_status ON public.shipment_vehicle_matching(status);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON public.operational_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.operational_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.operational_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_operator_activity_operator ON public.operator_activity(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_activity_created ON public.operator_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_operator_performance_operator ON public.operator_performance(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_performance_date ON public.operator_performance(date);

CREATE INDEX IF NOT EXISTS idx_route_analytics_origin_dest ON public.route_analytics(origin, destination);

CREATE INDEX IF NOT EXISTS idx_daily_offers_date ON public.daily_vehicle_offers(date);
CREATE INDEX IF NOT EXISTS idx_daily_offers_driver ON public.daily_vehicle_offers(driver_id);