-- Tabela de Histórico de Localização (GPS Tracking)
-- Armazena TODOS os pontos de GPS do motorista ao longo do tempo
CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL,
  embarque_id UUID, -- Opcional: vincula ao embarque ativo
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  velocidade INT, -- km/h
  endereco_aproximado TEXT, -- Ex: "BR-116, KM 234, Curitiba-PR"
  status VARCHAR(50) DEFAULT 'em_transito', -- 'em_transito', 'parado', 'carregando', 'descarregando'
  precisao_gps INT, -- Precisão em metros
  bateria_nivel INT, -- % de bateria do dispositivo
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_location_motorista ON location_history(motorista_id, timestamp DESC);
CREATE INDEX idx_location_embarque ON location_history(embarque_id);
CREATE INDEX idx_location_timestamp ON location_history(timestamp DESC);

-- Comentários
COMMENT ON TABLE location_history IS 'Histórico completo de rastreamento GPS dos motoristas';
COMMENT ON COLUMN location_history.endereco_aproximado IS 'Endereço reverso geocodificado (opcional)';
COMMENT ON COLUMN location_history.precisao_gps IS 'Precisão do GPS em metros (quanto menor, melhor)';
