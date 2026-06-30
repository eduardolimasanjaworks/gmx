export const CITY_COORDS: Record<string, [number, number]> = {
  'GUARULHOS_SP': [-23.4543, -46.5337],
  'CAMPINAS_SP': [-22.9099, -47.0626],
  'JACAREI_SP': [-23.3053, -45.9658],
  'SAO PAULO_SP': [-23.5505, -46.6333],
  'SAO JOSE DOS CAMPOS_SP': [-23.1896, -45.8841],
  'RIO DE JANEIRO_RJ': [-22.9068, -43.1729],
  'BELO HORIZONTE_MG': [-19.9167, -43.9345],
  'CURITIBA_PR': [-25.4284, -49.2733],
  'PORTO ALEGRE_RS': [-30.0346, -51.2177],
  'GOIANIA_GO': [-16.6869, -49.2648],
  'BRASILIA_DF': [-15.7939, -47.8828],
  'SALVADOR_BA': [-12.9777, -38.5016],
  'RECIFE_PE': [-8.0578, -34.8829],
  'FORTALEZA_CE': [-3.7319, -38.5267],
};

export function getDistanceFromLatLonInKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizarLocalChave(local: string): string | null {
  const t = String(local || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const m = t.match(/^(.*?)[,/\- ]\s*([A-Z]{2})$/);
  if (!m) return null;
  const cidade = m[1].trim();
  const uf = m[2].trim();
  if (cidade === 'RIO' && uf === 'DE') return 'RIO DE JANEIRO_RJ';
  return `${cidade}_${uf}`;
}

export function coordenadasPorLocal(local?: string | null): [number, number] | null {
  const chave = local ? normalizarLocalChave(local) : null;
  return chave ? CITY_COORDS[chave] || null : null;
}

export function normalizarTexto(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizarOperacao(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

export function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const t = String(value).trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function localLiberacaoPrevista(driver: unknown): string {
  const d = driver as Record<string, unknown>;
  return String(d?.local_liberacao_prevista || d?.local_disponibilidade || '').trim();
}

export function usarPosicaoPrevista(driver: unknown, dataFiltroReferencia: Date): boolean {
  const d = driver as Record<string, unknown>;
  if (!d?.data_previsao_disponibilidade || !localLiberacaoPrevista(d)) return false;
  const previsao = new Date(String(d.data_previsao_disponibilidade));
  return !Number.isNaN(previsao.getTime()) && previsao <= dataFiltroReferencia;
}

export function coordenadasMotorista(
  driver: unknown,
  dataFiltroReferencia: Date,
): [number, number] | null {
  const d = driver as Record<string, unknown>;
  if (usarPosicaoPrevista(d, dataFiltroReferencia)) {
    const prevLat = parseCoord(d?.local_liberacao_prevista_latitude);
    const prevLng = parseCoord(d?.local_liberacao_prevista_longitude);
    if (prevLat != null && prevLng != null) return [prevLat, prevLng];
    const prev = coordenadasPorLocal(localLiberacaoPrevista(d));
    if (prev) return prev;
  }
  const motorista = d?.motorista_id as Record<string, unknown> | undefined;
  const lat =
    parseCoord(d?.latitude) ?? parseCoord(d?.lat) ??
    parseCoord(motorista?.latitude) ?? parseCoord(motorista?.lat);
  const lng =
    parseCoord(d?.longitude) ?? parseCoord(d?.lng) ??
    parseCoord(motorista?.longitude) ?? parseCoord(motorista?.lng);
  if (lat != null && lng != null) return [lat, lng];
  const atual = coordenadasPorLocal(String(d?.localizacao_atual || ''));
  if (atual) return atual;
  return coordenadasPorLocal(localLiberacaoPrevista(d));
}

export function corStatus(driver: unknown, dataFiltroReferencia: Date): string {
  const st = normalizarTexto((driver as Record<string, unknown>)?.status);
  if (st === 'carregado') return 'slate';
  if (st === 'retornando') return 'amber';
  return usarPosicaoPrevista(driver, dataFiltroReferencia) ? 'indigo' : 'green';
}

export function extrairOperacoesDriver(driver: unknown): string[] {
  const d = driver as Record<string, unknown>;
  const motorista = d?.motorista_id as Record<string, unknown> | undefined;
  const fontes = [
    d?.operacao, d?.tipo_operacao,
    motorista?.operacao, motorista?.tipo_operacao,
    motorista?.tipo_rota, motorista?.produto_predominante,
  ]
    .filter(Boolean)
    .flatMap((item) => String(item).split(/[;,/|]/g))
    .map(normalizarOperacao)
    .filter(Boolean);
  return Array.from(new Set(fontes));
}

export function getSynergyScore(
  driver: unknown,
  originPoint: [number, number] | null,
  timeTravelDate: Date | undefined,
): { label: string; bg: string; text: string; border: string; icon: string } | null {
  if (!originPoint || !timeTravelDate) return null;
  const d = driver as Record<string, unknown>;
  let score = 0;
  const dist = getDistanceFromLatLonInKm(
    originPoint[0], originPoint[1],
    Number(d.latitude), Number(d.longitude),
  );
  if (dist <= 50) score += 3;
  else if (dist <= 150) score += 2;
  else if (dist <= 300) score += 1;
  const loadDate = new Date(timeTravelDate);
  const driverDate = d.data_previsao_disponibilidade
    ? new Date(String(d.data_previsao_disponibilidade))
    : new Date(String(d.date_created));
  if (driverDate <= loadDate) {
    score += 3;
  } else {
    const diffDays = (driverDate.getTime() - loadDate.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 1) score += 1;
    else score -= 2;
  }
  if (score >= 5) return { label: 'Sinergia Alta', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', icon: '🟢' };
  if (score >= 3) return { label: 'Sinergia Média', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '🟡' };
  return { label: 'Sinergia Baixa', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '🔴' };
}
