-- Adicionar novos status à tabela 'disponivel' para suportar estados intermediários
-- Status atual: 'disponivel', 'indisponivel', 'em_viagem'
-- Novos status: 'retornando', 'pre_disponivel', 'bloqueado'

-- Adicionar campo de previsão de disponibilidade
ALTER TABLE disponivel 
ADD COLUMN IF NOT EXISTS disponivel_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS eta_destino TIMESTAMP,
ADD COLUMN IF NOT EXISTS distancia_destino_km INT,
ADD COLUMN IF NOT EXISTS motivo_bloqueio TEXT;

-- Comentários
COMMENT ON COLUMN disponivel.disponivel_em IS 'Timestamp previsto para o motorista ficar disponível (usado quando status = retornando)';
COMMENT ON COLUMN disponivel.eta_destino IS 'Estimated Time of Arrival no destino atual';
COMMENT ON COLUMN disponivel.distancia_destino_km IS 'Distância restante até o destino em KM';
COMMENT ON COLUMN disponivel.motivo_bloqueio IS 'Razão do bloqueio (ex: CNH vencida, manutenção)';

-- Criar tabela de alertas operacionais críticos
CREATE TABLE IF NOT EXISTS operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'documento_vencido', 'carga_sem_aceite', 'motorista_inativo', 'cte_pendente'
  severidade VARCHAR(20) DEFAULT 'media', -- 'baixa', 'media', 'alta', 'critica'
  titulo TEXT NOT NULL,
  descricao TEXT,
  motorista_id UUID,
  embarque_id UUID,
  resolvido BOOLEAN DEFAULT FALSE,
  resolvido_em TIMESTAMP,
  resolvido_por UUID,
  acao_sugerida TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_resolvido ON operational_alerts(resolvido, severidade, created_at DESC);
CREATE INDEX idx_alerts_motorista ON operational_alerts(motorista_id);

COMMENT ON TABLE operational_alerts IS 'Alertas críticos que exigem ação imediata da operação';
