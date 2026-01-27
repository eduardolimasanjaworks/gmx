-- Tabela de Score de Matching (Compatibilidade Carga x Motorista)
-- Armazena o histórico de sugestões automáticas e seus resultados
CREATE TABLE IF NOT EXISTS matching_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID NOT NULL,
  motorista_id UUID NOT NULL,
  score_total DECIMAL(5,2) NOT NULL, -- 0 a 100
  score_disponibilidade DECIMAL(5,2),
  score_equipamento DECIMAL(5,2),
  score_localizacao DECIMAL(5,2),
  score_historico DECIMAL(5,2),
  score_comercial DECIMAL(5,2),
  justificativa JSONB, -- Detalhes do cálculo
  sugerido_em TIMESTAMP DEFAULT NOW(),
  aceito BOOLEAN,
  aceito_em TIMESTAMP,
  motivo_recusa TEXT
);

CREATE INDEX idx_matching_embarque ON matching_scores(embarque_id, score_total DESC);
CREATE INDEX idx_matching_motorista ON matching_scores(motorista_id);

COMMENT ON TABLE matching_scores IS 'Histórico de sugestões automáticas de matching entre cargas e motoristas';
COMMENT ON COLUMN matching_scores.justificativa IS 'JSON com detalhes: {distancia_km, tempo_disponibilidade, viagens_rota, etc}';
