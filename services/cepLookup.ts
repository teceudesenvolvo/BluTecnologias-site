export interface CepLookupResult {
  cep: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
  ibge?: string;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.erro || 'Não foi possível consultar o CEP.';
    throw new Error(message);
  }
  return data;
};

export const lookupCepData = async (cepInput: string): Promise<CepLookupResult> => {
  const cep = onlyDigits(cepInput);
  if (cep.length !== 8) {
    throw new Error('Informe um CEP válido com 8 dígitos.');
  }

  const data = await fetchJson(`https://viacep.com.br/ws/${cep}/json/`);
  if (data?.erro) {
    throw new Error('CEP não encontrado.');
  }

  return {
    cep,
    street: data?.logradouro || '',
    neighborhood: data?.bairro || '',
    city: data?.localidade || '',
    state: data?.uf || '',
    complement: data?.complemento || '',
    ibge: data?.ibge || '',
  };
};
