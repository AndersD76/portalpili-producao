export const CATEGORIES = [
  'Almoço',
  'Janta',
  'Café',
  'Lanche',
  'Pernoite',
  'Combustível',
  'Estacionamento',
  'Pedágio',
  'Transporte',
  'Peças',
  'Material',
  'Outros',
] as const;

export const PAYMENT_METHODS = [
  'Com dinheiro',
  'Com cartão pessoal',
  'Com cartão corporativo',
  'PIX',
] as const;

export const SERVICE_TYPES = [
  'Assistência',
  'Montagem',
  'Outro',
] as const;

export const FUEL_TYPES = [
  'Gasolina',
  'Etanol',
  'Diesel',
  'Diesel S10',
  'GNV',
] as const;

// Apenas categorias com limite definido. Demais não têm limite.
export const EXPENSE_LIMITS: Record<string, number> = {
  'Almoço': 45,
  'Janta': 45,
  'Pernoite': 140,
};

export const MANAGERS_CONFIG: Record<string, string> = {
  'Giovani Pili': '5554999648368',
  'Márcia Pili': '5554991390923',
  'Clarice Picoli': '5554991648865',
  'Eder da Silva': '5554991410842',
};
