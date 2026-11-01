// ============================================================================
//  CONFIGURAÇÃO DA CONGREGAÇÃO
//
//  Tudo que muda de uma congregação para outra fica neste arquivo.
//  Para montar o sistema de uma congregação nova, edite só aqui e troque a
//  imagem public/mapa-geral.jpg. O passo a passo completo está em
//  COMO_DUPLICAR.md.
// ============================================================================

import type { RegiaoMapa } from '@/lib/mapaTerritorios';

export const CONGREGACAO = {
  // Aparece no topo da tela inicial: "Territórios Boa Vista"
  nome: 'Boa Vista',

  // Usado quando o território não tem bairro cadastrado
  bairroPadrao: 'Boa Vista',

  // Nome que aparece na aba do navegador
  tituloAba: 'Mapa Boa Vista',

  // Imagem do mapa geral, dentro da pasta public/.
  // Ao trocar a imagem, aumente o número do "?v=" para o celular não
  // continuar mostrando a antiga guardada em cache.
  mapaImagem: '/mapa-geral.jpg?v=1',
};

// Posição de cada território sobre a imagem do mapa, em PORCENTAGEM (0 a 100)
// da largura/altura — não pixels. A chave é o número do território (o "01" de
// "TERRITÓRIO 01").
//
// Congregação nova: deixe vazio ({}). Os territórios aparecem em grade sobre
// o mapa e você arrasta cada um para o lugar certo no modo "Calibrar" do
// painel, que salva as posições no banco.
export const REGIOES_MAPA: Record<string, RegiaoMapa> = {};
