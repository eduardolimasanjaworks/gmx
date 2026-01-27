-- Adicionar campos para suportar auto-matching
ALTER TABLE vehicle_matches 
ADD COLUMN IF NOT EXISTS oferecido_automaticamente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS score_compatibilidade DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS justificativa_match JSONB;

COMMENT ON COLUMN vehicle_matches.oferecido_automaticamente IS 'Indica se a oferta foi criada pelo sistema automático';
COMMENT ON COLUMN vehicle_matches.score_compatibilidade IS 'Score de matching (0-100) calculado pelo algoritmo';
COMMENT ON COLUMN vehicle_matches.justificativa_match IS 'Detalhes do cálculo de compatibilidade';
