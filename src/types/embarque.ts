import { Database } from "@/integrations/supabase/types";

export type EmbarqueStatus =
  | 'new'
  | 'needs_attention'
  | 'sent'
  | 'waiting_confirmation'
  | 'confirmed'
  | 'in_transit'
  | 'waiting_receipt'
  | 'delivered'
  | 'no_show'
  | 'cancelled';

export type Embarque = Database['public']['Tables']['embarques']['Row'];
export type EmbarqueInsert = Database['public']['Tables']['embarques']['Insert'];
export type EmbarqueUpdate = Database['public']['Tables']['embarques']['Update'];

export interface ShipmentCard {
  id: string;
  origin: string;
  destination: string;
  cargo: string;
  value: number;
  deadline: Date;
  driver?: {
    id: string;
    name: string;
  };
  payment_proof?: string;
  rejected_drivers_count: number;
  delivery_window?: string;
  actual_arrival?: Date;
  status: EmbarqueStatus;
  created_at: Date;
  email_content?: string;
  needs_manual_review?: boolean;
}

export const statusMapping: Record<EmbarqueStatus, { title: string; color: string; badgeColor: string }> = {
  new: {
    title: 'Novas Ofertas',
    color: 'bg-blue-50 dark:bg-blue-950/20',
    badgeColor: 'bg-blue-500'
  },
  needs_attention: {
    title: 'Verificação Necessária',
    color: 'bg-rose-50 dark:bg-rose-950/20',
    badgeColor: 'bg-rose-500'
  },
  sent: {
    title: 'Ofertas Enviadas',
    color: 'bg-purple-50 dark:bg-purple-950/20',
    badgeColor: 'bg-purple-500'
  },
  waiting_confirmation: {
    title: 'Aguardando Confirmação GMX',
    color: 'bg-amber-50 dark:bg-amber-950/20',
    badgeColor: 'bg-amber-500'
  },
  confirmed: {
    title: 'Confirmados - Aguardando Adiantamento',
    color: 'bg-orange-50 dark:bg-orange-950/20',
    badgeColor: 'bg-orange-500'
  },
  in_transit: {
    title: 'Corridas em Andamento',
    color: 'bg-green-50 dark:bg-green-950/20',
    badgeColor: 'bg-green-500'
  },
  waiting_receipt: {
    title: 'Aguardando Canhoto',
    color: 'bg-cyan-50 dark:bg-cyan-950/20',
    badgeColor: 'bg-cyan-500'
  },
  delivered: {
    title: 'Entregues',
    color: 'bg-gray-50 dark:bg-gray-950/20',
    badgeColor: 'bg-gray-500'
  },
  no_show: {
    title: 'No Show',
    color: 'bg-yellow-50 dark:bg-yellow-950/20',
    badgeColor: 'bg-yellow-500'
  },
  cancelled: {
    title: 'Canceladas',
    color: 'bg-red-50 dark:bg-red-950/20',
    badgeColor: 'bg-red-500'
  }
};

export function transformEmbarqueToCard(embarque: Embarque): ShipmentCard {
  return {
    id: embarque.id,
    origin: embarque.origin,
    destination: embarque.destination,
    cargo: embarque.cargo_type || 'Carga não especificada',
    value: Number(embarque.total_value) || 0,
    deadline: embarque.pickup_date ? new Date(embarque.pickup_date) : new Date(),
    driver: (embarque as any).driver ? (embarque as any).driver : (embarque.driver_id ? {
      id: String(embarque.driver_id),
      name: 'Motorista' // Fallback
    } : undefined),
    rejected_drivers_count: embarque.rejected_drivers_count || 0,
    delivery_window: embarque.delivery_window_start && embarque.delivery_window_end
      ? `${new Date(embarque.delivery_window_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(embarque.delivery_window_end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      : undefined,
    actual_arrival: embarque.actual_arrival_time ? new Date(embarque.actual_arrival_time) : undefined,
    status: embarque.status as EmbarqueStatus,
    created_at: new Date(embarque.created_at),
    email_content: embarque.email_content,
    needs_manual_review: embarque.needs_manual_review || false
  };
}
