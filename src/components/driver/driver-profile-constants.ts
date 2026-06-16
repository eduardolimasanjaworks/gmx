export const DEFAULT_TIPO_CARROCERIA_OPTIONS = [
  'Caçamba Graneleira',
  'Baú',
  'Baú Roletado',
  'Baú Lata',
  'Tanque',
  'Cegonha',
  'Tanque Bobineira',
  'Gaiola',
  'Sider',
  'Graneleiro',
] as const;

/** @deprecated use DEFAULT_TIPO_CARROCERIA_OPTIONS */
export const TIPO_CARROCERIA_OPTIONS = DEFAULT_TIPO_CARROCERIA_OPTIONS;

export type TipoCarroceria = (typeof DEFAULT_TIPO_CARROCERIA_OPTIONS)[number] | string;
