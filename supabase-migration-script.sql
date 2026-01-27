-- =====================================================
-- GMX Complete Setup - Migration Script
-- Execute este script no SQL Editor do seu Supabase
-- =====================================================

-- =====================================================
-- 1. FUNCTION: Update updated_at column
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Table: drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  vehicle_type TEXT,
  truck_plate TEXT,
  trailer_plate_1 TEXT,
  trailer_plate_2 TEXT,
  trailer_plate_3 TEXT,
  current_location TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'active',
  availability_status TEXT DEFAULT 'available',
  last_freight_date TIMESTAMPTZ,
  last_update TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: driver_field_config
CREATE TABLE IF NOT EXISTS public.driver_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  visible_in_card BOOLEAN DEFAULT false,
  visible_in_table BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: driver_documents
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  image_url TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  issuing_agency TEXT,
  verified BOOLEAN DEFAULT false,
  ocr_raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: embarques
CREATE TABLE IF NOT EXISTS public.embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id TEXT,
  client_name TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type TEXT,
  weight NUMERIC,
  total_value NUMERIC,
  driver_value NUMERIC,
  pickup_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  delivery_window_start TIMESTAMPTZ,
  delivery_window_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new',
  driver_id UUID,
  actual_arrival_time TIMESTAMPTZ,
  rejected_drivers_count INTEGER DEFAULT 0,
  current_latitude NUMERIC,
  current_longitude NUMERIC,
  last_location_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: delivery_receipts
CREATE TABLE IF NOT EXISTS public.delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID,
  image_url TEXT NOT NULL,
  delivery_date DATE,
  delivery_time TIME,
  receiver_name TEXT,
  receiver_signature TEXT,
  observations TEXT,
  verified BOOLEAN DEFAULT false,
  ocr_raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: ranking_rules
CREATE TABLE IF NOT EXISTS public.ranking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_rules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Policies for drivers
DROP POLICY IF EXISTS "Anyone can view drivers" ON public.drivers;
CREATE POLICY "Anyone can view drivers" ON public.drivers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert drivers" ON public.drivers;
CREATE POLICY "Only admins can insert drivers" ON public.drivers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update drivers" ON public.drivers;
CREATE POLICY "Only admins can update drivers" ON public.drivers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Only admins can delete drivers" ON public.drivers;
CREATE POLICY "Only admins can delete drivers" ON public.drivers FOR DELETE USING (true);

-- Policies for driver_field_config
DROP POLICY IF EXISTS "Anyone can view field config" ON public.driver_field_config;
CREATE POLICY "Anyone can view field config" ON public.driver_field_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage field config" ON public.driver_field_config;
CREATE POLICY "Only admins can manage field config" ON public.driver_field_config FOR ALL USING (true);

-- Policies for driver_documents
DROP POLICY IF EXISTS "Todos podem visualizar documentos" ON public.driver_documents;
CREATE POLICY "Todos podem visualizar documentos" ON public.driver_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas admins podem criar documentos" ON public.driver_documents;
CREATE POLICY "Apenas admins podem criar documentos" ON public.driver_documents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas admins podem atualizar documentos" ON public.driver_documents;
CREATE POLICY "Apenas admins podem atualizar documentos" ON public.driver_documents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar documentos" ON public.driver_documents;
CREATE POLICY "Apenas admins podem deletar documentos" ON public.driver_documents FOR DELETE USING (true);

-- Policies for embarques
DROP POLICY IF EXISTS "Todos podem visualizar embarques" ON public.embarques;
CREATE POLICY "Todos podem visualizar embarques" ON public.embarques FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas admins podem criar embarques" ON public.embarques;
CREATE POLICY "Apenas admins podem criar embarques" ON public.embarques FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas admins podem atualizar embarques" ON public.embarques;
CREATE POLICY "Apenas admins podem atualizar embarques" ON public.embarques FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar embarques" ON public.embarques;
CREATE POLICY "Apenas admins podem deletar embarques" ON public.embarques FOR DELETE USING (true);

-- Policies for delivery_receipts
DROP POLICY IF EXISTS "Todos podem visualizar canhotos" ON public.delivery_receipts;
CREATE POLICY "Todos podem visualizar canhotos" ON public.delivery_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas admins podem criar canhotos" ON public.delivery_receipts;
CREATE POLICY "Apenas admins podem criar canhotos" ON public.delivery_receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas admins podem atualizar canhotos" ON public.delivery_receipts;
CREATE POLICY "Apenas admins podem atualizar canhotos" ON public.delivery_receipts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar canhotos" ON public.delivery_receipts;
CREATE POLICY "Apenas admins podem deletar canhotos" ON public.delivery_receipts FOR DELETE USING (true);

-- Policies for message_templates
DROP POLICY IF EXISTS "Todos podem visualizar templates" ON public.message_templates;
CREATE POLICY "Todos podem visualizar templates" ON public.message_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas admins podem criar templates" ON public.message_templates;
CREATE POLICY "Apenas admins podem criar templates" ON public.message_templates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Apenas admins podem atualizar templates" ON public.message_templates;
CREATE POLICY "Apenas admins podem atualizar templates" ON public.message_templates FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Apenas admins podem deletar templates" ON public.message_templates;
CREATE POLICY "Apenas admins podem deletar templates" ON public.message_templates FOR DELETE USING (true);

-- Policies for ranking_rules
DROP POLICY IF EXISTS "Anyone can view ranking rules" ON public.ranking_rules;
CREATE POLICY "Anyone can view ranking rules" ON public.ranking_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage ranking rules" ON public.ranking_rules;
CREATE POLICY "Only admins can manage ranking rules" ON public.ranking_rules FOR ALL USING (true);

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_drivers_updated_at ON public.drivers;
CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_field_config_updated_at ON public.driver_field_config;
CREATE TRIGGER update_driver_field_config_updated_at
  BEFORE UPDATE ON public.driver_field_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_documents_updated_at ON public.driver_documents;
CREATE TRIGGER update_driver_documents_updated_at
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_embarques_updated_at ON public.embarques;
CREATE TRIGGER update_embarques_updated_at
  BEFORE UPDATE ON public.embarques
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_receipts_updated_at ON public.delivery_receipts;
CREATE TRIGGER update_delivery_receipts_updated_at
  BEFORE UPDATE ON public.delivery_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ranking_rules_updated_at ON public.ranking_rules;
CREATE TRIGGER update_ranking_rules_updated_at
  BEFORE UPDATE ON public.ranking_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ENABLE REALTIME (Opcional, execute se necessário)
-- =====================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.embarques;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_field_config;

-- =====================================================
-- 7. DADOS INICIAIS (Opcional)
-- =====================================================

-- Configuração inicial de campos do motorista
INSERT INTO public.driver_field_config (field_name, display_name, field_type, visible_in_card, visible_in_table, display_order)
VALUES 
  ('name', 'Nome', 'text', true, true, 1),
  ('cpf', 'CPF', 'text', true, true, 2),
  ('phone', 'Telefone', 'text', true, true, 3),
  ('email', 'Email', 'email', false, true, 4),
  ('vehicle_type', 'Tipo de Veículo', 'text', true, false, 5),
  ('truck_plate', 'Placa do Caminhão', 'text', true, true, 6),
  ('city', 'Cidade', 'text', true, true, 7),
  ('state', 'Estado', 'text', false, true, 8),
  ('status', 'Status', 'text', true, true, 9),
  ('availability_status', 'Disponibilidade', 'text', true, true, 10)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
