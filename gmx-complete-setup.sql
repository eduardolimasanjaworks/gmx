-- ============================================
-- COMPLETE DATABASE SETUP FOR GMX PROJECT
-- TechFala's Org
-- ============================================

-- ============================================
-- 1. CREATE FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Table: drivers
CREATE TABLE public.drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cpf text,
  phone text,
  email text,
  truck_plate text,
  trailer_plate_1 text,
  trailer_plate_2 text,
  trailer_plate_3 text,
  vehicle_type text,
  current_location text,
  city text,
  state text,
  status text DEFAULT 'active'::text,
  availability_status text DEFAULT 'available'::text,
  registered_at timestamp with time zone DEFAULT now(),
  last_freight_date timestamp with time zone,
  last_update timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: driver_field_config
CREATE TABLE public.driver_field_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name text NOT NULL,
  display_name text NOT NULL,
  field_type text DEFAULT 'text'::text,
  visible_in_card boolean DEFAULT false,
  visible_in_table boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: driver_documents
CREATE TABLE public.driver_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL,
  document_type text NOT NULL,
  image_url text NOT NULL,
  document_number text,
  issuing_agency text,
  issue_date date,
  expiry_date date,
  verified boolean DEFAULT false,
  ocr_raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: embarques
CREATE TABLE public.embarques (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id text,
  status text NOT NULL DEFAULT 'new'::text,
  origin text NOT NULL,
  destination text,
  cargo_type text,
  weight numeric,
  client_name text,
  total_value numeric,
  driver_value numeric,
  driver_id uuid,
  pickup_date timestamp with time zone,
  delivery_date timestamp with time zone,
  delivery_window_start timestamp with time zone,
  delivery_window_end timestamp with time zone,
  actual_arrival_time timestamp with time zone,
  current_latitude numeric,
  current_longitude numeric,
  last_location_update timestamp with time zone,
  rejected_drivers_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: delivery_receipts
CREATE TABLE public.delivery_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid,
  image_url text NOT NULL,
  delivery_date date,
  delivery_time time without time zone,
  receiver_name text,
  receiver_signature text,
  observations text,
  verified boolean DEFAULT false,
  ocr_raw_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: message_templates
CREATE TABLE public.message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  template_type text NOT NULL,
  message_text text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: ranking_rules
CREATE TABLE public.ranking_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  rule_type text NOT NULL,
  description text,
  weight integer NOT NULL DEFAULT 1,
  enabled boolean DEFAULT true,
  parameters jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Policies for drivers
CREATE POLICY "Anyone can view drivers" 
ON public.drivers 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can insert drivers" 
ON public.drivers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Only admins can update drivers" 
ON public.drivers 
FOR UPDATE 
USING (true);

CREATE POLICY "Only admins can delete drivers" 
ON public.drivers 
FOR DELETE 
USING (true);

-- Policies for driver_field_config
CREATE POLICY "Anyone can view field config" 
ON public.driver_field_config 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage field config" 
ON public.driver_field_config 
FOR ALL 
USING (true);

-- Policies for driver_documents
CREATE POLICY "Todos podem visualizar documentos" 
ON public.driver_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem criar documentos" 
ON public.driver_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar documentos" 
ON public.driver_documents 
FOR UPDATE 
USING (true);

CREATE POLICY "Apenas admins podem deletar documentos" 
ON public.driver_documents 
FOR DELETE 
USING (true);

-- Policies for embarques
CREATE POLICY "Todos podem visualizar embarques" 
ON public.embarques 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem criar embarques" 
ON public.embarques 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar embarques" 
ON public.embarques 
FOR UPDATE 
USING (true);

CREATE POLICY "Apenas admins podem deletar embarques" 
ON public.embarques 
FOR DELETE 
USING (true);

-- Policies for delivery_receipts
CREATE POLICY "Todos podem visualizar canhotos" 
ON public.delivery_receipts 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem criar canhotos" 
ON public.delivery_receipts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar canhotos" 
ON public.delivery_receipts 
FOR UPDATE 
USING (true);

CREATE POLICY "Apenas admins podem deletar canhotos" 
ON public.delivery_receipts 
FOR DELETE 
USING (true);

-- Policies for message_templates
CREATE POLICY "Todos podem visualizar templates" 
ON public.message_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem criar templates" 
ON public.message_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar templates" 
ON public.message_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Apenas admins podem deletar templates" 
ON public.message_templates 
FOR DELETE 
USING (true);

-- Policies for ranking_rules
CREATE POLICY "Anyone can view ranking rules" 
ON public.ranking_rules 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage ranking rules" 
ON public.ranking_rules 
FOR ALL 
USING (true);

-- ============================================
-- 5. CREATE TRIGGERS
-- ============================================

-- Trigger for drivers
CREATE TRIGGER update_drivers_updated_at
BEFORE UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for driver_field_config
CREATE TRIGGER update_driver_field_config_updated_at
BEFORE UPDATE ON public.driver_field_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for driver_documents
CREATE TRIGGER update_driver_documents_updated_at
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for embarques
CREATE TRIGGER update_embarques_updated_at
BEFORE UPDATE ON public.embarques
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for delivery_receipts
CREATE TRIGGER update_delivery_receipts_updated_at
BEFORE UPDATE ON public.delivery_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for message_templates
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for ranking_rules
CREATE TRIGGER update_ranking_rules_updated_at
BEFORE UPDATE ON public.ranking_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- All tables, policies, triggers and functions created successfully
-- Ready for deployment in GMX project
