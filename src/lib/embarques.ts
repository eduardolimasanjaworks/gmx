import { directus } from "@/lib/directus";
import { createItem, updateItem, deleteItem, readItems } from "@directus/sdk";
import { toast } from "sonner";
import { EmbarqueStatus } from "@/types/embarque";

const COLLECTION = 'embarques';

export async function createEmbarque(data: any) {
  try {
    const result = await directus.request(createItem(COLLECTION, data));
    toast.success('Embarque criado com sucesso!');
    return result;
  } catch (error) {
    console.error('Error creating embarque:', error);
    toast.error('Erro ao criar embarque');
    throw error;
  }
}

export async function updateEmbarqueStatus(id: string, status: EmbarqueStatus) {
  try {
    const result = await directus.request(updateItem(COLLECTION, id, { status }));
    toast.success('Status atualizado com sucesso!');
    return result;
  } catch (error) {
    console.error('Error updating status:', error);
    toast.error('Erro ao atualizar status');
    throw error;
  }
}

export async function updateEmbarque(id: string, data: any) {
  try {
    const result = await directus.request(updateItem(COLLECTION, id, data));
    toast.success('Embarque atualizado com sucesso!');
    return result;
  } catch (error) {
    console.error('Error updating embarque:', error);
    toast.error('Erro ao atualizar embarque');
    throw error;
  }
}

export async function deleteEmbarque(id: string) {
  try {
    await directus.request(deleteItem(COLLECTION, id));
    toast.success('Embarque removido com sucesso!');
  } catch (error) {
    console.error('Error deleting embarque:', error);
    toast.error('Erro ao remover embarque');
    throw error;
  }
}

export async function assignDriver(embarqueId: string, driverId: string) {
  try {
    const result = await directus.request(updateItem(COLLECTION, embarqueId, {
      driver_id: parseInt(driverId) // Ensure int for Directus FK
    }));
    toast.success('Motorista atribuído com sucesso!');
    return result;
  } catch (error) {
    console.error('Error assigning driver:', error);
    toast.error('Erro ao atribuir motorista');
    throw error;
  }
}

