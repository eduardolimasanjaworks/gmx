
-- Migration: 20251021183719
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  truck_plate TEXT,
  trailer_plate_1 TEXT,
  trailer_plate_2 TEXT,
  trailer_plate_3 TEXT,
  vehicle_type TEXT,
  city TEXT,
  state TEXT,
  current_location TEXT,
  status TEXT DEFAULT 'active',
  availability_status TEXT DEFAULT 'available',
  last_freight_date TIMESTAMP WITH TIME ZONE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_update TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_field_config table
CREATE TABLE IF NOT EXISTS public.driver_field_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  visible_in_card BOOLEAN DEFAULT false,
  visible_in_table BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create driver_documents table
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  image_url TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  issuing_agency TEXT,
  verified BOOLEAN DEFAULT false,
  ocr_raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create embarques table
CREATE TABLE IF NOT EXISTS public.embarques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  origin TEXT NOT NULL,
  destination TEXT,
  cargo_type TEXT,
  weight NUMERIC,
  total_value NUMERIC,
  driver_value NUMERIC,
  client_name TEXT,
  pickup_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  delivery_window_start TIMESTAMP WITH TIME ZONE,
  delivery_window_end TIMESTAMP WITH TIME ZONE,
  actual_arrival_time TIMESTAMP WITH TIME ZONE,
  driver_id UUID,
  rejected_drivers_count INTEGER DEFAULT 0,
  current_latitude NUMERIC,
  current_longitude NUMERIC,
  last_location_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create delivery_receipts table
CREATE TABLE IF NOT EXISTS public.delivery_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID,
  image_url TEXT NOT NULL,
  delivery_date DATE,
  delivery_time TIME,
  receiver_name TEXT,
  receiver_signature TEXT,
  observations TEXT,
  verified BOOLEAN DEFAULT false,
  ocr_raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ranking_rules table
CREATE TABLE IF NOT EXISTS public.ranking_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Only admins can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Only admins can update drivers" ON public.drivers;
DROP POLICY IF EXISTS "Only admins can delete drivers" ON public.drivers;

DROP POLICY IF EXISTS "Anyone can view field config" ON public.driver_field_config;
DROP POLICY IF EXISTS "Only admins can manage field config" ON public.driver_field_config;

DROP POLICY IF EXISTS "Todos podem visualizar documentos" ON public.driver_documents;
DROP POLICY IF EXISTS "Apenas admins podem criar documentos" ON public.driver_documents;
DROP POLICY IF EXISTS "Apenas admins podem atualizar documentos" ON public.driver_documents;
DROP POLICY IF EXISTS "Apenas admins podem deletar documentos" ON public.driver_documents;

DROP POLICY IF EXISTS "Todos podem visualizar embarques" ON public.embarques;
DROP POLICY IF EXISTS "Apenas admins podem criar embarques" ON public.embarques;
DROP POLICY IF EXISTS "Apenas admins podem atualizar embarques" ON public.embarques;
DROP POLICY IF EXISTS "Apenas admins podem deletar embarques" ON public.embarques;

DROP POLICY IF EXISTS "Todos podem visualizar canhotos" ON public.delivery_receipts;
DROP POLICY IF EXISTS "Apenas admins podem criar canhotos" ON public.delivery_receipts;
DROP POLICY IF EXISTS "Apenas admins podem atualizar canhotos" ON public.delivery_receipts;
DROP POLICY IF EXISTS "Apenas admins podem deletar canhotos" ON public.delivery_receipts;

DROP POLICY IF EXISTS "Todos podem visualizar templates" ON public.message_templates;
DROP POLICY IF EXISTS "Apenas admins podem criar templates" ON public.message_templates;
DROP POLICY IF EXISTS "Apenas admins podem atualizar templates" ON public.message_templates;
DROP POLICY IF EXISTS "Apenas admins podem deletar templates" ON public.message_templates;

DROP POLICY IF EXISTS "Anyone can view ranking rules" ON public.ranking_rules;
DROP POLICY IF EXISTS "Only admins can manage ranking rules" ON public.ranking_rules;

-- Create RLS policies for drivers
CREATE POLICY "Anyone can view drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Only admins can insert drivers" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update drivers" ON public.drivers FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete drivers" ON public.drivers FOR DELETE USING (true);

-- Create RLS policies for driver_field_config
CREATE POLICY "Anyone can view field config" ON public.driver_field_config FOR SELECT USING (true);
CREATE POLICY "Only admins can manage field config" ON public.driver_field_config FOR ALL USING (true);

-- Create RLS policies for driver_documents
CREATE POLICY "Todos podem visualizar documentos" ON public.driver_documents FOR SELECT USING (true);
CREATE POLICY "Apenas admins podem criar documentos" ON public.driver_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins podem atualizar documentos" ON public.driver_documents FOR UPDATE USING (true);
CREATE POLICY "Apenas admins podem deletar documentos" ON public.driver_documents FOR DELETE USING (true);

-- Create RLS policies for embarques
CREATE POLICY "Todos podem visualizar embarques" ON public.embarques FOR SELECT USING (true);
CREATE POLICY "Apenas admins podem criar embarques" ON public.embarques FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins podem atualizar embarques" ON public.embarques FOR UPDATE USING (true);
CREATE POLICY "Apenas admins podem deletar embarques" ON public.embarques FOR DELETE USING (true);

-- Create RLS policies for delivery_receipts
CREATE POLICY "Todos podem visualizar canhotos" ON public.delivery_receipts FOR SELECT USING (true);
CREATE POLICY "Apenas admins podem criar canhotos" ON public.delivery_receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins podem atualizar canhotos" ON public.delivery_receipts FOR UPDATE USING (true);
CREATE POLICY "Apenas admins podem deletar canhotos" ON public.delivery_receipts FOR DELETE USING (true);

-- Create RLS policies for message_templates
CREATE POLICY "Todos podem visualizar templates" ON public.message_templates FOR SELECT USING (true);
CREATE POLICY "Apenas admins podem criar templates" ON public.message_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admins podem atualizar templates" ON public.message_templates FOR UPDATE USING (true);
CREATE POLICY "Apenas admins podem deletar templates" ON public.message_templates FOR DELETE USING (true);

-- Create RLS policies for ranking_rules
CREATE POLICY "Anyone can view ranking rules" ON public.ranking_rules FOR SELECT USING (true);
CREATE POLICY "Only admins can manage ranking rules" ON public.ranking_rules FOR ALL USING (true);

-- Create triggers for updated_at
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

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_field_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.embarques;
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_rules;

-- Migration: 20251021190229
-- Insert sample embarques data with realistic Brazilian freight scenarios
-- Using correct status values: new, sent, waiting_confirmation, confirmed, in_transit
INSERT INTO public.embarques (
  status, 
  origin, 
  destination, 
  cargo_type, 
  weight, 
  total_value, 
  driver_value,
  pickup_date,
  delivery_date,
  delivery_window_start,
  delivery_window_end,
  client_name,
  email_id,
  rejected_drivers_count,
  current_latitude,
  current_longitude
) VALUES
-- New offers
(
  'new',
  'São Paulo, SP',
  'Rio de Janeiro, RJ',
  'Eletrônicos',
  15000,
  85000,
  12000,
  now() + interval '2 days',
  now() + interval '4 days',
  now() + interval '4 days' + interval '6 hours',
  now() + interval '4 days' + interval '18 hours',
  'TechDistribuidora Ltda',
  'email_001',
  0,
  -23.5505,
  -46.6333
),
(
  'new',
  'Curitiba, PR',
  'Porto Alegre, RS',
  'Alimentos Refrigerados',
  22000,
  45000,
  8500,
  now() + interval '1 day',
  now() + interval '3 days',
  now() + interval '3 days' + interval '8 hours',
  now() + interval '3 days' + interval '20 hours',
  'FoodSupply S.A.',
  'email_002',
  1,
  -25.4284,
  -49.2733
),
-- Sent offers
(
  'sent',
  'Belo Horizonte, MG',
  'Salvador, BA',
  'Materiais de Construção',
  28000,
  62000,
  11000,
  now() + interval '3 days',
  now() + interval '6 days',
  now() + interval '6 days' + interval '7 hours',
  now() + interval '6 days' + interval '19 hours',
  'BuildMax Materiais',
  'email_003',
  0,
  -19.9167,
  -43.9345
),
(
  'sent',
  'Brasília, DF',
  'Fortaleza, CE',
  'Farmacêuticos',
  8500,
  120000,
  18000,
  now() + interval '2 days',
  now() + interval '5 days',
  now() + interval '5 days' + interval '6 hours',
  now() + interval '5 days' + interval '18 hours',
  'FarmaCentral Distribuidora',
  'email_004',
  2,
  -15.8267,
  -47.9218
),
-- Waiting confirmation
(
  'waiting_confirmation',
  'Campinas, SP',
  'Recife, PE',
  'Autopeças',
  18000,
  75000,
  13500,
  now() + interval '4 days',
  now() + interval '7 days',
  now() + interval '7 days' + interval '8 hours',
  now() + interval '7 days' + interval '20 hours',
  'AutoParts Brasil',
  'email_005',
  0,
  -22.9099,
  -47.0626
),
-- Confirmed waiting for payment
(
  'confirmed',
  'Goiânia, GO',
  'Manaus, AM',
  'Equipamentos Industriais',
  32000,
  95000,
  16000,
  now() + interval '5 days',
  now() + interval '10 days',
  now() + interval '10 days' + interval '9 hours',
  now() + interval '10 days' + interval '21 hours',
  'IndustrialTech Equipamentos',
  'email_006',
  1,
  -16.6869,
  -49.2648
),
-- In transit
(
  'in_transit',
  'Santos, SP',
  'Vitória, ES',
  'Contêineres Importados',
  45000,
  180000,
  25000,
  now() - interval '1 day',
  now() + interval '2 days',
  now() + interval '2 days' + interval '10 hours',
  now() + interval '2 days' + interval '22 hours',
  'Global Logistics LTDA',
  'email_007',
  0,
  -23.9608,
  -46.3344
),
(
  'in_transit',
  'Ribeirão Preto, SP',
  'Uberlândia, MG',
  'Produtos Agrícolas',
  26000,
  52000,
  9500,
  now() - interval '6 hours',
  now() + interval '1 day',
  now() + interval '1 day' + interval '6 hours',
  now() + interval '1 day' + interval '18 hours',
  'AgroNegócios Brasil',
  'email_008',
  0,
  -21.1704,
  -47.8103
);

-- Migration: 20251028204044
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'responsavel', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or responsavel
CREATE OR REPLACE FUNCTION public.is_admin_or_responsavel(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'responsavel')
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update drivers table RLS policies to use roles
DROP POLICY IF EXISTS "Only admins can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Only admins can update drivers" ON public.drivers;
DROP POLICY IF EXISTS "Only admins can delete drivers" ON public.drivers;

CREATE POLICY "Admin/Responsavel can insert drivers"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_responsavel(auth.uid()));

CREATE POLICY "Admin/Responsavel can update drivers"
ON public.drivers
FOR UPDATE
TO authenticated
USING (public.is_admin_or_responsavel(auth.uid()));

CREATE POLICY "Admin/Responsavel can delete drivers"
ON public.drivers
FOR DELETE
TO authenticated
USING (public.is_admin_or_responsavel(auth.uid()));

-- Add index for better performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_drivers_metadata ON public.drivers USING gin(metadata);

-- Add comments for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles for authorization';
COMMENT ON FUNCTION public.has_role IS 'Check if user has specific role';
COMMENT ON FUNCTION public.is_admin_or_responsavel IS 'Check if user is admin or responsavel';

-- Migration: 20251030124315
-- Remover a política restritiva de UPDATE e criar uma mais permissiva para testes
DROP POLICY IF EXISTS "Admin/Responsavel can update drivers" ON drivers;

-- Criar nova política que permite todos atualizarem (para ambiente de desenvolvimento)
CREATE POLICY "Anyone can update drivers"
ON drivers
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Migration: 20251030180705

-- Remover a constraint antiga de status
ALTER TABLE embarques DROP CONSTRAINT IF EXISTS embarques_status_check;

-- Adicionar nova constraint com os status atualizados incluindo 'no_show'
ALTER TABLE embarques ADD CONSTRAINT embarques_status_check 
  CHECK (status IN ('new', 'sent', 'waiting_confirmation', 'confirmed', 'in_transit', 'waiting_receipt', 'delivered', 'no_show', 'cancelled'));


-- Migration: 20251030180729

-- Remover a constraint antiga de status
ALTER TABLE embarques DROP CONSTRAINT IF EXISTS embarques_status_check;

-- Adicionar nova constraint com os status atualizados incluindo 'no_show'
ALTER TABLE embarques ADD CONSTRAINT embarques_status_check 
  CHECK (status IN ('new', 'sent', 'waiting_confirmation', 'confirmed', 'in_transit', 'waiting_receipt', 'delivered', 'no_show', 'cancelled'));


-- Migration: 20251031134806
-- Add email_content field to store the original email
ALTER TABLE public.embarques 
ADD COLUMN IF NOT EXISTS email_content TEXT,
ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false;

-- Add comment to explain the fields
COMMENT ON COLUMN public.embarques.email_content IS 'Conteúdo original do email do WhatsApp para verificação';
COMMENT ON COLUMN public.embarques.needs_manual_review IS 'Indica se o embarque precisa de revisão manual da equipe GMX';

-- Migration: 20251031135019
-- Update the status check constraint to include 'needs_attention'
ALTER TABLE public.embarques 
DROP CONSTRAINT IF EXISTS embarques_status_check;

ALTER TABLE public.embarques
ADD CONSTRAINT embarques_status_check 
CHECK (status IN ('new', 'needs_attention', 'sent', 'waiting_confirmation', 'confirmed', 'in_transit', 'waiting_receipt', 'delivered', 'no_show', 'cancelled'));

-- Migration: 20251031145634
-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for permissions table
CREATE POLICY "Admins can view all permissions"
  ON public.user_permissions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create profiles table to store additional user info
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251031185446
-- Add manual_review_completed field to track reviewed shipments
ALTER TABLE public.embarques 
ADD COLUMN manual_review_completed BOOLEAN DEFAULT FALSE;

-- Migration: 20251031203350
-- Criar tabela para frota/veículos disponíveis
CREATE TABLE public.frota_mock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL,
  rota TEXT NOT NULL,
  disponiveis INTEGER NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para rotas mais utilizadas
CREATE TABLE public.rotas_mock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL,
  rota TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para disponibilidade x acionamento
CREATE TABLE public.acionamento_mock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('Disponibilidade', 'Acionamento')),
  valor INTEGER NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frota_mock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotas_mock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acionamento_mock ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (todos podem visualizar)
CREATE POLICY "Todos podem visualizar frota_mock" ON public.frota_mock FOR SELECT USING (true);
CREATE POLICY "Todos podem visualizar rotas_mock" ON public.rotas_mock FOR SELECT USING (true);
CREATE POLICY "Todos podem visualizar acionamento_mock" ON public.acionamento_mock FOR SELECT USING (true);

-- Inserir dados mockados para frota
INSERT INTO public.frota_mock (produto, rota, disponiveis, data) VALUES
  ('Arroz', 'São Paulo - BH', 12, CURRENT_DATE),
  ('Arroz', 'Campinas - RJ', 8, CURRENT_DATE),
  ('Açúcar', 'Campinas - RJ', 7, CURRENT_DATE - INTERVAL '1 day'),
  ('Açúcar', 'Pelotas - POA', 15, CURRENT_DATE - INTERVAL '1 day'),
  ('Feijão', 'São Paulo - SP', 20, CURRENT_DATE - INTERVAL '2 days'),
  ('Soja', 'Curitiba - SC', 10, CURRENT_DATE - INTERVAL '15 days'),
  ('Milho', 'Goiânia - DF', 18, CURRENT_DATE - INTERVAL '20 days'),
  ('Arroz', 'Salvador - SE', 9, CURRENT_DATE - INTERVAL '25 days');

-- Inserir dados mockados para rotas (Top 10 por produto)
INSERT INTO public.rotas_mock (produto, rota, quantidade, data) VALUES
  -- Arroz
  ('Arroz', 'Pelotas - Nova Rio', 45, CURRENT_DATE),
  ('Arroz', 'São Paulo - BH', 38, CURRENT_DATE),
  ('Arroz', 'Campinas - RJ', 32, CURRENT_DATE),
  ('Arroz', 'Porto Alegre - SP', 28, CURRENT_DATE - INTERVAL '1 day'),
  ('Arroz', 'Curitiba - SC', 25, CURRENT_DATE - INTERVAL '2 days'),
  ('Arroz', 'Salvador - BA', 20, CURRENT_DATE - INTERVAL '5 days'),
  ('Arroz', 'Recife - PE', 18, CURRENT_DATE - INTERVAL '10 days'),
  ('Arroz', 'Fortaleza - CE', 15, CURRENT_DATE - INTERVAL '15 days'),
  ('Arroz', 'Brasília - DF', 12, CURRENT_DATE - INTERVAL '20 days'),
  ('Arroz', 'Manaus - AM', 8, CURRENT_DATE - INTERVAL '25 days'),
  -- Açúcar
  ('Açúcar', 'Campinas - RJ', 52, CURRENT_DATE),
  ('Açúcar', 'Ribeirão Preto - SP', 41, CURRENT_DATE),
  ('Açúcar', 'Piracicaba - Santos', 35, CURRENT_DATE - INTERVAL '1 day'),
  ('Açúcar', 'Araraquara - SP', 30, CURRENT_DATE - INTERVAL '2 days'),
  ('Açúcar', 'São Paulo - RJ', 27, CURRENT_DATE - INTERVAL '5 days'),
  ('Açúcar', 'Goiânia - DF', 22, CURRENT_DATE - INTERVAL '10 days'),
  ('Açúcar', 'Uberaba - BH', 19, CURRENT_DATE - INTERVAL '15 days'),
  ('Açúcar', 'Londrina - PR', 16, CURRENT_DATE - INTERVAL '20 days'),
  ('Açúcar', 'Maringá - SP', 13, CURRENT_DATE - INTERVAL '25 days'),
  ('Açúcar', 'Campo Grande - MS', 10, CURRENT_DATE - INTERVAL '30 days'),
  -- Soja
  ('Soja', 'Rondonópolis - Santos', 60, CURRENT_DATE),
  ('Soja', 'Rio Verde - Paranaguá', 55, CURRENT_DATE),
  ('Soja', 'Dourados - SP', 48, CURRENT_DATE - INTERVAL '1 day'),
  ('Soja', 'Sorriso - MT', 42, CURRENT_DATE - INTERVAL '3 days'),
  ('Soja', 'Primavera do Leste - PR', 38, CURRENT_DATE - INTERVAL '5 days'),
  ('Soja', 'Cascavel - Santos', 33, CURRENT_DATE - INTERVAL '10 days'),
  ('Soja', 'Campo Novo - RS', 29, CURRENT_DATE - INTERVAL '15 days'),
  ('Soja', 'Passo Fundo - POA', 24, CURRENT_DATE - INTERVAL '20 days'),
  ('Soja', 'Lucas do Rio Verde - SP', 20, CURRENT_DATE - INTERVAL '25 days'),
  ('Soja', 'Sapezal - Paranaguá', 17, CURRENT_DATE - INTERVAL '30 days');

-- Inserir dados mockados para acionamento
INSERT INTO public.acionamento_mock (tipo, valor, data) VALUES
  ('Disponibilidade', 25, CURRENT_DATE),
  ('Acionamento', 19, CURRENT_DATE),
  ('Disponibilidade', 30, CURRENT_DATE - INTERVAL '1 day'),
  ('Acionamento', 22, CURRENT_DATE - INTERVAL '1 day'),
  ('Disponibilidade', 28, CURRENT_DATE - INTERVAL '2 days'),
  ('Acionamento', 20, CURRENT_DATE - INTERVAL '2 days'),
  ('Disponibilidade', 180, CURRENT_DATE - INTERVAL '15 days'),
  ('Acionamento', 145, CURRENT_DATE - INTERVAL '15 days'),
  ('Disponibilidade', 220, CURRENT_DATE - INTERVAL '30 days'),
  ('Acionamento', 189, CURRENT_DATE - INTERVAL '30 days');

-- Migration: 20251031214625
-- Criar tabela para FAQ da IA
CREATE TABLE IF NOT EXISTS public.ai_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_faq ENABLE ROW LEVEL SECURITY;

-- Todos podem visualizar FAQs ativos
CREATE POLICY "Todos podem visualizar FAQs"
ON public.ai_faq
FOR SELECT
USING (true);

-- Apenas admins podem criar FAQs
CREATE POLICY "Apenas admins podem criar FAQs"
ON public.ai_faq
FOR INSERT
WITH CHECK (true);

-- Apenas admins podem atualizar FAQs
CREATE POLICY "Apenas admins podem atualizar FAQs"
ON public.ai_faq
FOR UPDATE
USING (true);

-- Apenas admins podem deletar FAQs
CREATE POLICY "Apenas admins podem deletar FAQs"
ON public.ai_faq
FOR DELETE
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_faq_updated_at
BEFORE UPDATE ON public.ai_faq
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir FAQs de exemplo
INSERT INTO public.ai_faq (question, answer, category, usage_count) VALUES
('Quanto tempo demora o pagamento?', 'O pagamento é feito em até 48h após confirmação da entrega com canhoto.', 'Financeiro', 45),
('Como aceitar uma oferta de frete?', 'Basta responder "SIM" ou "ACEITO" quando receber a oferta via WhatsApp.', 'Processo', 32),
('Preciso renovar minha CNH?', 'Sim, sua CNH está próxima do vencimento. Por favor, envie a nova via WhatsApp.', 'Documentação', 18);

-- Migration: 20251031215138
-- Adicionar foreign key entre embarques e drivers
ALTER TABLE public.embarques
ADD CONSTRAINT embarques_driver_id_fkey
FOREIGN KEY (driver_id)
REFERENCES public.drivers(id)
ON DELETE SET NULL;

-- Migration: 20251031215927
-- Create storage buckets for shipment documents
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('shipment-documents', 'shipment-documents', false),
  ('delivery-receipts', 'delivery-receipts', false),
  ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shipment documents
CREATE POLICY "Authenticated users can view shipment documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'shipment-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload shipment documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shipment-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shipment documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shipment-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete shipment documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'shipment-documents' AND auth.role() = 'authenticated');

-- Create storage policies for delivery receipts
CREATE POLICY "Authenticated users can view delivery receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload delivery receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update delivery receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'delivery-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete delivery receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'delivery-receipts' AND auth.role() = 'authenticated');

-- Create storage policies for payment receipts
CREATE POLICY "Authenticated users can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payment receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payment receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

-- Create table for payment receipts
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.embarques(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  receipt_type TEXT DEFAULT 'advance_payment',
  amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_receipts
CREATE POLICY "Anyone can view payment receipts"
ON public.payment_receipts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert payment receipts"
ON public.payment_receipts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update payment receipts"
ON public.payment_receipts FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete payment receipts"
ON public.payment_receipts FOR DELETE
USING (auth.role() = 'authenticated');

-- Create table for generic shipment documents
CREATE TABLE IF NOT EXISTS public.shipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.embarques(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  document_title TEXT NOT NULL,
  document_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on shipment_documents
ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shipment_documents
CREATE POLICY "Anyone can view shipment documents"
ON public.shipment_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert shipment documents"
ON public.shipment_documents FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shipment documents"
ON public.shipment_documents FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete shipment documents"
ON public.shipment_documents FOR DELETE
USING (auth.role() = 'authenticated');

-- Add route_states column to embarques table to store comma-separated states
ALTER TABLE public.embarques 
ADD COLUMN IF NOT EXISTS route_states TEXT;
