/**
 * Aplica máscara de formatação para chaves PIX com base no tipo selecionado.
 */
export function applyPixMask(value: string, tipo: string): string {
  const digits = value.replace(/\D/g, '');

  switch (tipo) {
    case 'CPF':
      // 000.000.000-00
      return digits
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    case 'CNPJ':
      // 00.000.000/0000-00
      return digits
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');

    case 'Telefone':
      // (00) 00000-0000 or (00) 0000-0000
      if (digits.length <= 10) {
        return digits
          .slice(0, 10)
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
      }
      return digits
        .slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');

    default:
      // Email, Aleatória — sem máscara
      return value;
  }
}

/** Placeholder dinâmico baseado no tipo */
export function pixPlaceholder(tipo: string): string {
  switch (tipo) {
    case 'CPF': return '000.000.000-00';
    case 'CNPJ': return '00.000.000/0000-00';
    case 'Telefone': return '(00) 00000-0000';
    case 'Email': return 'email@exemplo.com';
    case 'Aleatória': return 'Chave aleatória';
    default: return 'Selecione o tipo primeiro';
  }
}
