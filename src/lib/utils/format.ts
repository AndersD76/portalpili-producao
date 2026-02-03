/**
 * Funções de formatação utilitárias para uso em componentes cliente
 * Este arquivo não deve importar nenhuma biblioteca que dependa de Node.js
 */

/**
 * Remove caracteres não numéricos do CNPJ
 */
export function limparCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

/**
 * Formata CNPJ com pontuação
 * @param cnpj CNPJ limpo ou formatado
 * @returns CNPJ formatado como XX.XXX.XXX/XXXX-XX
 */
export function formatarCNPJ(cnpj: string): string {
  const cleaned = limparCNPJ(cnpj);
  if (cleaned.length !== 14) return cnpj; // Retorna original se inválido

  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata CPF com pontuação
 * @param cpf CPF limpo ou formatado
 * @returns CPF formatado como XXX.XXX.XXX-XX
 */
export function formatarCPF(cpf: string): string {
  const cleaned = cpf.replace(/[^\d]/g, '');
  if (cleaned.length !== 11) return cpf;

  return cleaned.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}

/**
 * Formata telefone brasileiro
 * @param telefone Telefone limpo ou formatado
 * @returns Telefone formatado como (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function formatarTelefone(telefone: string): string {
  const cleaned = telefone.replace(/[^\d]/g, '');

  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }

  return telefone;
}

/**
 * Formata valor monetário brasileiro
 * @param valor Valor numérico
 * @param decimals Casas decimais (default: 2)
 * @returns Valor formatado como R$ X.XXX,XX
 */
export function formatarMoeda(valor: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valor);
}

/**
 * Formata data brasileira
 * @param data Data como string ISO ou objeto Date
 * @returns Data formatada como DD/MM/YYYY
 */
export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora brasileira
 * @param data Data como string ISO ou objeto Date
 * @returns Data/hora formatada como DD/MM/YYYY HH:MM
 */
export function formatarDataHora(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Valida formato de CNPJ (apenas formato, não dígitos verificadores)
 */
export function validarFormatoCNPJ(cnpj: string): boolean {
  const cleaned = limparCNPJ(cnpj);
  return cleaned.length === 14;
}

/**
 * Valida formato de CPF (apenas formato, não dígitos verificadores)
 */
export function validarFormatoCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/[^\d]/g, '');
  return cleaned.length === 11;
}

/**
 * Valida formato de email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Trunca texto adicionando reticências
 */
export function truncarTexto(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) return texto;
  return texto.slice(0, maxLength - 3) + '...';
}

/**
 * Valida CNPJ completo incluindo dígitos verificadores
 * @param cnpj CNPJ limpo (apenas números)
 * @returns true se o CNPJ é válido
 */
export function validarCNPJCompleto(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, '');

  if (cleaned.length !== 14) return false;

  // Elimina CNPJs conhecidos como inválidos
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  // Validação do primeiro dígito verificador
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  // Validação do segundo dígito verificador
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}
