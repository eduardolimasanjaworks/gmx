import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export interface FieldConfig {
  id: string;
  field_name: string;
  display_name: string;
  field_type: string;
  visible_in_card: boolean;
  visible_in_table: boolean;
  display_order: number;
}

const DEFAULT_ALL_FIELDS: FieldConfig[] = [
  { id: 'nome', field_name: 'nome', display_name: 'Nome', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 1 },
  { id: 'sobrenome', field_name: 'sobrenome', display_name: 'Sobrenome', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 2 },
  { id: 'telefone', field_name: 'telefone', display_name: 'Telefone', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 3 },
  { id: 'status_logistica', field_name: 'status_logistica', display_name: 'Status (Logística)', field_type: 'status', visible_in_card: true, visible_in_table: true, display_order: 4 },
  { id: 'cpf', field_name: 'cpf', display_name: 'CPF', field_type: 'string', visible_in_card: false, visible_in_table: true, display_order: 5 },
  { id: 'cidade', field_name: 'cidade', display_name: 'Cidade', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 6 },
  { id: 'estado', field_name: 'estado', display_name: 'Estado (UF)', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 7 },
  { id: 'forma_pagamento', field_name: 'forma_pagamento', display_name: 'Forma Pgto', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 8 },
  { id: 'rastreador', field_name: 'rastreador', display_name: 'Rastreador', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 9 },
  { id: 'tipo_rota', field_name: 'tipo_rota', display_name: 'Tipo de Rota', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 10 },
  { id: 'data_nascimento', field_name: 'data_nascimento', display_name: 'Data Nasc.', field_type: 'date', visible_in_card: false, visible_in_table: false, display_order: 11 },
  { id: 'nome_mae', field_name: 'nome_mae', display_name: 'Nome da Mãe', field_type: 'text', visible_in_card: false, visible_in_table: false, display_order: 12 },
  { id: 'cep_residencia', field_name: 'cep_residencia', display_name: 'CEP', field_type: 'text', visible_in_card: false, visible_in_table: false, display_order: 13 },
  { id: 'proprietario_rastreador', field_name: 'proprietario_rastreador', display_name: 'Prop. Rastreador', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 14 },
  { id: 'quinta_roda', field_name: 'quinta_roda', display_name: '5ª Roda', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 15 },
  { id: 'status_cadastro', field_name: 'status_cadastro', display_name: 'Status Cadastro', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 16 },
  { id: 'date_created', field_name: 'date_created', display_name: 'Data de Cadastro', field_type: 'timestamp', visible_in_card: false, visible_in_table: false, display_order: 17 },
  { id: 'current_location', field_name: 'current_location', display_name: 'Localização GPS', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 18 },
  { id: 'truck_plate', field_name: 'truck_plate', display_name: 'Placa Principal', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 19 },
  { id: 'vehicle_type', field_name: 'vehicle_type', display_name: 'Resumo Veículo', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 20 },
];

export const useDriverFields = () => {
  const { user } = useAuth();
  const [allFields, setAllFields] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user?.id ? `gmx_driver_fields_config_${user.id}` : 'gmx_driver_fields_config';

  const fetchFieldConfig = () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setAllFields(JSON.parse(stored));
      } else {
        setAllFields(DEFAULT_ALL_FIELDS);
      }
    } catch (error) {
      console.error("Error fetching field config from LocalStorage:", error);
      setAllFields(DEFAULT_ALL_FIELDS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFieldConfig();
  }, [user?.id]);

  const saveConfig = (newConfig: FieldConfig[]) => {
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
    setAllFields(newConfig);
  };

  return {
    cardFields: allFields.filter(f => f.visible_in_card).sort((a, b) => a.display_order - b.display_order),
    tableFields: allFields.filter(f => f.visible_in_table).sort((a, b) => a.display_order - b.display_order),
    allFields,
    isLoading,
    refetch: fetchFieldConfig,
    saveConfig
  };
};
