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

const DEFAULT_AVAILABLE_FIELDS: FieldConfig[] = [
    { id: 'nome_completo', field_name: 'nome_completo', display_name: 'Nome', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 1 },
    { id: 'truck_plate', field_name: 'truck_plate', display_name: 'Placa', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 2 },
    { id: 'vehicle_type', field_name: 'vehicle_type', display_name: 'Tipo Veículo', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 3 },
    { id: 'current_location', field_name: 'current_location', display_name: 'Localização', field_type: 'string', visible_in_card: true, visible_in_table: true, display_order: 4 },
    { id: 'last_update_date', field_name: 'last_update_date', display_name: 'Disponível desde', field_type: 'date', visible_in_card: false, visible_in_table: true, display_order: 5 },
    { id: 'last_update_time', field_name: 'last_update_time', display_name: 'Hora', field_type: 'time', visible_in_card: true, visible_in_table: true, display_order: 6 },
    { id: 'status_logistica', field_name: 'status_logistica', display_name: 'Status', field_type: 'status', visible_in_card: true, visible_in_table: true, display_order: 7 },
    { id: 'telefone', field_name: 'telefone', display_name: 'Telefone', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 8 },
    { id: 'cpf', field_name: 'cpf', display_name: 'CPF', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 9 },
    { id: 'local_disponibilidade', field_name: 'local_disponibilidade', display_name: 'Local Disponibilidade', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 10 },
    { id: 'latitude', field_name: 'latitude', display_name: 'Latitude', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 11 },
    { id: 'longitude', field_name: 'longitude', display_name: 'Longitude', field_type: 'string', visible_in_card: false, visible_in_table: false, display_order: 12 },
    { id: 'data_previsao_disponibilidade', field_name: 'data_previsao_disponibilidade', display_name: 'Previsão Disponibilidade', field_type: 'date', visible_in_card: false, visible_in_table: false, display_order: 13 },
];

export const useAvailableDriverFields = () => {
    const { user } = useAuth();
    const [allFields, setAllFields] = useState<FieldConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const storageKey = user?.id ? `gmx_available_driver_fields_config_${user.id}` : 'gmx_available_driver_fields_config';

    const fetchFieldConfig = () => {
        setIsLoading(true);
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                setAllFields(JSON.parse(stored));
            } else {
                setAllFields(DEFAULT_AVAILABLE_FIELDS);
            }
        } catch (error) {
            console.error("Error fetching field config from LocalStorage:", error);
            setAllFields(DEFAULT_AVAILABLE_FIELDS);
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
