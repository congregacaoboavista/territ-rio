"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Map as MapIcon, Settings, LogOut, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import MapModal from '@/components/MapModal';
import { CONGREGACAO } from '@/config/congregacao';
import { BotaoEditar, FaixaEdicao, JanelaEdicao, BotaoSalvar, BotaoPerigo, campoEdicao, rotuloEdicao } from '@/components/ModoEdicao';

// Janelas do modo edição
type Janela =
  | { tipo: 'territorio' }
  | { tipo: 'quadra'; q: any }
  | { tipo: 'novaQuadra' };

// "Quadra 06" -> 6
const numeroNoNome = (nome: string) => {
  const m = String(nome ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export default function TerritorioPage() {
  const params = useParams();
  const router = useRouter();
  const [territorio, setTerritorio] = useState<any>(null);
  const [quadras, setQuadras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  // Modo edição
  const [editando, setEditando] = useState(false);
  const [janela, setJanela] = useState<Janela | null>(null);
  const [txtNome, setTxtNome] = useState("");
  const [txtBairro, setTxtBairro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    const role = localStorage.getItem('userRole');
    const expiry = localStorage.getItem('loginExpiry');

    if (isAdmin === 'true' && expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('userRole');
      localStorage.removeItem('loginExpiry');
      setIsLogged(false);
      setIsAdminUser(false);
      return;
    }

    if (isAdmin === 'true') {
      setIsLogged(true);
      if (role === 'admin') {
        setIsAdminUser(true);
        // Vindo de "novo território": já abre editando
        if (new URLSearchParams(window.location.search).get('editar') === '1') setEditando(true);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginExpiry');
    setIsLogged(false);
    setIsAdminUser(false);
    setEditando(false);
  };

  async function fetchQuadras() {
    if (!params?.id) return;

    try {
      const { data, error } = await supabase
        .from('territorios')
        .select('id, nome, bairro, quadras(id, nome, enderecos(status, is_bloqueado))')
        .eq('id', params.id as string)
        .single();

      if (error) {
        console.error("Erro ao buscar as quadras do território:", error);
        return;
      }

      if (data) {
        setTerritorio({ id: data.id, nome: data.nome, bairro: data.bairro });

        const quadrasCalculadas = data.quadras?.map((q: any) => {
          let totalEnderecos = 0;
          let completos = 0;
          let marcadas = 0;

          q.enderecos?.forEach((e: any) => {
            totalEnderecos++;
            const status = String(e.status).toLowerCase();
            const isBloqueado = status === 'bloqueado' || e.is_bloqueado === true || String(e.is_bloqueado).toLowerCase() === 'true';
            if (status === 'true' || status === 'falado' || status === 'cartas') marcadas++;
            if (status === 'true' || status === 'falado' || status === 'cartas' || isBloqueado) {
              completos++;
            }
          });

          const progresso = totalEnderecos > 0
            ? Math.round((completos / totalEnderecos) * 100)
            : 0;

          return {
            id: q.id,
            nome: q.nome,
            progresso,
            totalEnderecos,
            completos,
            marcadas
          };
        });

        quadrasCalculadas?.sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));

        setQuadras(quadrasCalculadas || []);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuadras();
  }, [params?.id]);

  const getCircleColor = (prog: number) => {
    if (prog < 20) return "#f97316"; // orange
    if (prog < 75) return "#3b82f6"; // blue
    return "#22c55e"; // green
  };

  // ------------------------------------------------------------ modo edição
  const abrirJanela = async (j: Janela) => {
    setJanela(j);
    setTxtBairro("");
    if (j.tipo === 'territorio') {
      setTxtNome(territorio?.nome ?? "");
      setTxtBairro(territorio?.bairro ?? "");
    } else if (j.tipo === 'quadra') {
      setTxtNome(j.q.nome);
    } else {
      // Sugere o próximo número: as quadras são numeradas na congregação toda
      setTxtNome("");
      const { data } = await supabase.from('quadras').select('nome');
      const maior = Math.max(0, ...(data ?? []).map((q: any) => numeroNoNome(q.nome)));
      setTxtNome(`Quadra ${String(maior + 1).padStart(2, '0')}`);
    }
  };

  const fecharJanela = () => { setJanela(null); setSalvando(false); };

  const gravar = async (acao: () => PromiseLike<{ error: any }>, erro: string) => {
    setSalvando(true);
    const { error } = await acao();
    setSalvando(false);
    if (error) {
      alert(`${erro}\n\n${error.message}`);
      return false;
    }
    fecharJanela();
    fetchQuadras();
    return true;
  };

  const salvarTerritorio = () => {
    const nome = txtNome.trim();
    if (!nome) return;
    gravar(
      () => supabase.from('territorios').update({ nome, bairro: txtBairro.trim() || null }).eq('id', territorio.id),
      'Não foi possível salvar o território.'
    );
  };

  const renomearQuadra = (q: any) => {
    const nome = txtNome.trim();
    if (!nome || nome === q.nome) return fecharJanela();
    gravar(() => supabase.from('quadras').update({ nome }).eq('id', q.id), 'Não foi possível renomear a quadra.');
  };

  const excluirQuadra = (q: any) => {
    const partes = [`Excluir a ${q.nome}?`];
    if (q.totalEnderecos === 1) partes.push('A casa dela também será apagada.');
    if (q.totalEnderecos > 1) partes.push(`As ${q.totalEnderecos} casas dela também serão apagadas.`);
    if (q.marcadas === 1) partes.push('1 casa está marcada; a marcação será perdida.');
    if (q.marcadas > 1) partes.push(`${q.marcadas} casas estão marcadas; as marcações serão perdidas.`);
    partes.push('O histórico de trabalho desta quadra também será apagado.');
    if (!window.confirm(partes.join('\n\n'))) return;
    gravar(() => supabase.from('quadras').delete().eq('id', q.id), 'Não foi possível excluir a quadra.');
  };

  const criarQuadra = async () => {
    const nome = txtNome.trim();
    if (!nome) return;
    if (quadras.some(q => q.nome.trim().toLowerCase() === nome.toLowerCase()) &&
        !window.confirm(`Já existe a ${nome} neste território. Criar outra com o mesmo nome?`)) return;
    setSalvando(true);
    const { data, error } = await supabase.from('quadras').insert([{ nome, territorio_id: territorio.id }]).select('id').single();
    setSalvando(false);
    if (error || !data) {
      alert(`Não foi possível criar a quadra.\n\n${error?.message ?? ''}`);
      return;
    }
    // Abre a quadra nova já editando, para cadastrar as ruas e casas
    router.push(`/quadra/${data.id}?editar=1`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500 font-medium">Carregando quadras...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 sm:p-4 relative">
      <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2 z-20">
        {isLogged ? (
          <>
             <Link href="/admin" className="text-[#0A4D3C] bg-[#0A4D3C]/10 hover:bg-[#0A4D3C]/20 px-3 py-1.5 rounded-full text-sm font-bold transition-all" title="Painel de Administração">
                Admin
             </Link>
             <button onClick={handleLogout} className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-all" title="Sair">
                <LogOut size={16} />
             </button>
          </>
        ) : (
          <Link href="/login" className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors" title="Acesso Admin">
            <Settings size={20} />
          </Link>
        )}
      </div>

      {editando && (
        <div className="max-w-4xl mx-auto sticky top-0 z-40 sm:top-4">
          <FaixaEdicao dica="Toque numa quadra ou no nome do território para alterar." onConcluir={() => setEditando(false)} />
        </div>
      )}

      <div className="bg-white min-h-screen sm:min-h-[calc(100vh-2rem)] max-w-4xl mx-auto rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-sm">

        {/* CABEÇALHO */}
        <header className="text-center pb-8 pt-2 px-1 relative">
          <button
            onClick={() => setIsMapOpen(true)}
            className="absolute left-0 top-0 text-[#0A4D3C] hover:text-[#083d2f] bg-[#0A4D3C]/10 hover:bg-[#0A4D3C]/20 p-2 rounded-full transition-all"
            title="Ver Mapa Geral"
          >
            <MapIcon size={20} />
          </button>
          {isAdminUser && !editando && (
            <BotaoEditar onClick={() => setEditando(true)} className="absolute left-12 top-0" />
          )}

          {editando ? (
            <button onClick={() => abrirJanela({ tipo: 'territorio' })} className="inline-flex items-center gap-2 text-[22px] sm:text-3xl font-bold text-slate-800 tracking-tight uppercase">
              {territorio?.nome} - {territorio?.bairro || CONGREGACAO.bairroPadrao}
              <Pencil size={18} className="text-amber-600 flex-shrink-0" />
            </button>
          ) : (
            <h1 className="text-[22px] sm:text-3xl font-bold text-slate-800 tracking-tight uppercase">
              {territorio?.nome} - {territorio?.bairro || CONGREGACAO.bairroPadrao}
            </h1>
          )}

          <div className="relative mt-2 flex items-center justify-center">
            <p className="text-gray-500">Escolha a quadra</p>
            <Link
              href="/"
              className="absolute right-0 bg-[#0A4D3C] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:scale-105 active:scale-95 transition-transform"
            >
              &lt; Voltar
            </Link>
          </div>
        </header>

        {/* GRID DE QUADRAS */}
        <div className="grid grid-cols-2 gap-4">
          {quadras.length === 0 && !editando ? (
            <div className="col-span-2 text-center text-gray-400 py-8">
              Nenhuma quadra encontrada.
            </div>
          ) : (
            quadras.map((q) => (
              <div key={q.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center relative">

                {/* No modo edição o cartão inteiro abre a janela da quadra */}
                {editando && (
                  <button
                    onClick={() => abrirJanela({ tipo: 'quadra', q })}
                    className="absolute inset-0 z-20 rounded-2xl ring-2 ring-amber-300 bg-amber-50/20 flex items-start justify-end p-3"
                    title="Editar quadra"
                  >
                    <Pencil size={15} className="text-amber-600" />
                  </button>
                )}

                <h2 className="font-bold text-slate-900 uppercase text-center mb-1">{q.nome}</h2>

                <p className="text-[10px] text-gray-400 mb-4 uppercase">{territorio?.bairro || CONGREGACAO.bairroPadrao}</p>

                <Link href={`/quadra/${q.id}`} className="flex flex-col items-center cursor-pointer transition-transform hover:scale-[1.02] w-full">
                  {/* Círculo de Progresso */}
                  <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                    <circle
                      cx="40" cy="40" r="34" stroke={getCircleColor(q.progresso)} strokeWidth="6" fill="none"
                      strokeDasharray="213" strokeDashoffset={213 - (213 * q.progresso) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute font-bold text-lg text-slate-800">{q.progresso}%</span>
                </div>

                <p className="text-[10px] text-gray-400 mb-4 uppercase">Concluído</p>

                <div className="w-full border-t border-gray-50 pt-3 flex flex-col items-center">
                  <span className="text-[11px] text-gray-500 mb-1 text-center leading-tight">
                    {q.totalEnderecos === 0
                      ? 'Nenhuma casa'
                      : q.totalEnderecos === q.completos
                        ? `Todas as ${q.totalEnderecos} casas concluídas`
                        : `Faltam ${q.totalEnderecos - q.completos} casas de ${q.totalEnderecos}`}
                  </span>
                  <button className="text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1 uppercase mt-1">
                    Ver endereços &rarr;
                  </button>
                </div>
                </Link>
              </div>
            ))
          )}

          {editando && (
            <button
              onClick={() => abrirJanela({ tipo: 'novaQuadra' })}
              className="rounded-2xl border-2 border-dashed border-amber-300 text-amber-800 font-bold min-h-[200px] flex flex-col items-center justify-center gap-2 hover:bg-amber-50"
            >
              <Plus size={28} />
              Nova quadra
            </button>
          )}
        </div>
      </div>

      {/* JANELAS DO MODO EDIÇÃO */}
      {janela?.tipo === 'territorio' && (
        <JanelaEdicao titulo="Editar território" onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome do território</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={rotuloEdicao}>Bairro</label>
            <input className={campoEdicao} value={txtBairro} onChange={e => setTxtBairro(e.target.value)} placeholder={CONGREGACAO.bairroPadrao} />
          </div>
          <BotaoSalvar onClick={salvarTerritorio} disabled={salvando || !txtNome.trim()}>Salvar</BotaoSalvar>
        </JanelaEdicao>
      )}

      {janela?.tipo === 'quadra' && (
        <JanelaEdicao
          titulo={janela.q.nome}
          subtitulo={janela.q.totalEnderecos === 1 ? '1 casa' : `${janela.q.totalEnderecos} casas`}
          onFechar={fecharJanela}
        >
          <div>
            <label className={rotuloEdicao}>Nome da quadra</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renomearQuadra(janela.q)} autoFocus />
          </div>
          <BotaoSalvar onClick={() => renomearQuadra(janela.q)} disabled={salvando}>Salvar nome</BotaoSalvar>
          <Link href={`/quadra/${janela.q.id}?editar=1`}
            className="w-full text-center text-slate-700 bg-gray-100 hover:bg-gray-200 font-bold rounded-xl px-4 py-3 transition-colors">
            Editar ruas e casas
          </Link>
          <BotaoPerigo onClick={() => excluirQuadra(janela.q)} disabled={salvando}>Excluir quadra</BotaoPerigo>
        </JanelaEdicao>
      )}

      {janela?.tipo === 'novaQuadra' && (
        <JanelaEdicao titulo="Nova quadra" subtitulo={territorio?.nome} onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome da quadra</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criarQuadra()} autoFocus />
            <p className="text-[11px] text-gray-400 mt-1.5">Depois de criar, você já entra na quadra para cadastrar as ruas e casas.</p>
          </div>
          <BotaoSalvar onClick={criarQuadra} disabled={salvando || !txtNome.trim()}>Criar quadra</BotaoSalvar>
        </JanelaEdicao>
      )}

      {isMapOpen && <MapModal onClose={() => setIsMapOpen(false)} />}
    </main>
  );
}
