export interface CepAddress {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export function normalizeCep(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function formatCep(value: string) {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) throw new Error('Não foi possível consultar o CEP.');

  const data = await response.json();
  if (data.erro) return null;

  return {
    cep: formatCep(digits),
    endereco: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    estado: data.uf || '',
  };
}
