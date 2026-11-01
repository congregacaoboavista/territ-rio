// Posição de cada território sobre a imagem do mapa geral.
//
// Os valores são PORCENTAGEM da imagem (0 a 100), não pixels — assim a área
// clicável acompanha o mapa em qualquer tamanho de tela.
//
// Os valores de fábrica ficam em src/config/congregacao.ts (REGIOES_MAPA).
// Dentro do painel existe o modo "Calibrar", que salva os ajustes na tabela
// territorio_mapa e passa a ter preferência sobre os de fábrica.

import { REGIOES_MAPA } from '@/config/congregacao';

export type RegiaoMapa = { x: number; y: number; w: number; h: number };

// "TERRITÓRIO 05" -> "05".  Aceita variações tipo "Território 5" ou "T 05".
export function numeroDoTerritorio(nome: string): string | null {
  const m = String(nome ?? '').match(/(\d+)\s*$/);
  if (!m) return null;
  return m[1].padStart(2, '0');
}

// Território sem posição de fábrica (congregação nova, ou território criado
// depois) cai numa grade de 6 colunas sobre o mapa, na ordem do número.
// Assim ele aparece no modo "Calibrar" e dá para arrastar até o lugar certo.
function regiaoEmGrade(num: string): RegiaoMapa {
  const i = Math.max(0, parseInt(num, 10) - 1);
  return {
    x: 2 + (i % 6) * 16,
    y: 2 + Math.floor(i / 6) * 10,
    w: 14,
    h: 8,
  };
}

export function regiaoPadrao(nome: string): RegiaoMapa | null {
  const num = numeroDoTerritorio(nome);
  if (!num) return null;
  return REGIOES_MAPA[num] ?? regiaoEmGrade(num);
}
