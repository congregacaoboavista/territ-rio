// Converte o que o administrador digitou em uma lista de números de casa.
//
//   "10, 12, 14"    -> 10, 12, 14
//   "10 12 14"      -> 10, 12, 14
//   "10-20"         -> 10, 11, 12 ... 20      (também "10 a 20")
//   "10-20 pares"   -> 10, 12, 14 ... 20      (também "ímpares")
//   "15A, s/n"      -> 15A, s/n               (o que não é número entra como está)
//
// "pares"/"ímpares" valem para todas as sequências digitadas na mesma vez.

export const LIMITE_POR_VEZ = 300;

export type ResultadoNumeros = { numeros: string[]; erro?: string };

const PARIDADE = /(^|[\s,;])(ímpares?|impares?|pares?)(?=[\s,;]|$)/gi;
const SEQUENCIA = /^(\d+)\s*(?:-|a|até|ate)\s*(\d+)$/i;

export function interpretarNumeros(texto: string): ResultadoNumeros {
  let paridade: 0 | 1 | null = null;
  const semParidade = String(texto ?? '').replace(PARIDADE, (_m, antes: string, palavra: string) => {
    paridade = /^[ií]/i.test(palavra) ? 1 : 0;
    return antes;
  });

  const partes = semParidade
    .split(/[,;\n]+/)
    .map(p => p.trim())
    .filter(Boolean)
    // "10 12 14" vira três partes; "Casa 2" ou "15 A" continuam inteiros
    .flatMap(p => (/^\d+(\s+\d+)+$/.test(p) ? p.split(/\s+/) : [p]));

  const numeros: string[] = [];
  for (const parte of partes) {
    const seq = parte.match(SEQUENCIA);
    if (!seq) {
      numeros.push(parte);
      continue;
    }
    let ini = parseInt(seq[1], 10);
    let fim = parseInt(seq[2], 10);
    if (ini > fim) [ini, fim] = [fim, ini];
    if (fim - ini + 1 > LIMITE_POR_VEZ) {
      return { numeros: [], erro: `A sequência ${parte} tem casas demais. Coloque no máximo ${LIMITE_POR_VEZ} por vez.` };
    }
    for (let n = ini; n <= fim; n++) {
      if (paridade === null || n % 2 === paridade) numeros.push(String(n));
    }
  }

  const unicos = [...new Set(numeros)];
  if (unicos.length > LIMITE_POR_VEZ) {
    return { numeros: [], erro: `São ${unicos.length} casas. Coloque no máximo ${LIMITE_POR_VEZ} por vez.` };
  }
  return { numeros: unicos };
}
