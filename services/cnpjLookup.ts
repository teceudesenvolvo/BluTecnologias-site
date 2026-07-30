export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  address?: string;
  cep?: string;
  complement?: string;
  fantasyName?: string;
  porte?: string;
  naturezaJuridica?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
}

const cleanDocument = (value: string) => value.replace(/\D/g, '');

const buildAddress = (...parts: Array<string | undefined | null>) =>
  parts.filter(Boolean).join(', ');

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.error || 'Não foi possível consultar o CNPJ.';
    throw new Error(message);
  }
  return data;
};

const normalizeBrasilApi = (data: any, cnpj: string): CnpjLookupResult => ({
  cnpj,
  razaoSocial: data?.razao_social || data?.nome || '',
  fantasyName: data?.nome_fantasia || '',
  email: data?.email || '',
  phone: data?.ddd_telefone_1 || data?.telefone || '',
  city: data?.municipio || '',
  state: data?.uf || '',
  address: buildAddress(data?.logradouro, data?.numero, data?.bairro),
  cep: data?.cep || '',
  complement: data?.complemento || '',
  porte: data?.porte || data?.porte_empresa || '',
  naturezaJuridica: data?.natureza_juridica || '',
  street: data?.logradouro || '',
  number: data?.numero || '',
  neighborhood: data?.bairro || '',
});

const normalizeReceitaWs = (data: any, cnpj: string): CnpjLookupResult => ({
  cnpj,
  razaoSocial: data?.nome || '',
  fantasyName: data?.fantasia || '',
  email: data?.email || '',
  phone: data?.telefone || '',
  city: data?.municipio || '',
  state: data?.uf || '',
  address: buildAddress(data?.logradouro, data?.numero, data?.bairro),
  cep: data?.cep || '',
  complement: data?.complemento || '',
  porte: data?.porte || '',
  naturezaJuridica: data?.natureza_juridica || '',
  street: data?.logradouro || '',
  number: data?.numero || '',
  neighborhood: data?.bairro || '',
});

export const lookupCnpjData = async (cnpjInput: string): Promise<CnpjLookupResult> => {
  const cnpj = cleanDocument(cnpjInput);
  if (cnpj.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos.');
  }

  try {
    const brasilApi = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    return normalizeBrasilApi(brasilApi, cnpj);
  } catch (brasilApiError) {
    try {
      const receitaWs = await fetchJson(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
      return normalizeReceitaWs(receitaWs, cnpj);
    } catch {
      throw brasilApiError instanceof Error
        ? brasilApiError
        : new Error('Não foi possível buscar os dados do CNPJ.');
    }
  }
};
