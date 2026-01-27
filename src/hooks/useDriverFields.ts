import { useState, useEffect } from "react";
import { directus } from "@/lib/directus";
import { readItems } from "@directus/sdk";

export interface FieldConfig {
  id: string;
  field_name: string;
  display_name: string;
  visible_in_card: boolean;
  visible_in_table: boolean;
  display_order: number;
  field_type: string;
}

export const useDriverFields = () => {
  const [cardFields, setCardFields] = useState<FieldConfig[]>([]);
  const [tableFields, setTableFields] = useState<FieldConfig[]>([]);
  const [allFields, setAllFields] = useState<FieldConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFieldConfig();
    // Realtime removed
  }, []);

  const fetchFieldConfig = async () => {
    try {
      setIsLoading(true);
      const data = await directus.request(readItems('driver_field_config', {
        sort: ['display_order' as any]
      }));

      // Map Directus fields if names differ, but my schema matches the interface exactly
      const fields = data as unknown as FieldConfig[];

      setAllFields(fields);
      setCardFields(fields.filter(f => f.visible_in_card));
      setTableFields(fields.filter(f => f.visible_in_table));

    } catch (error) {
      console.error("Error fetching field config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cardFields,
    tableFields,
    allFields,
    isLoading,
    refetch: fetchFieldConfig
  };
};
