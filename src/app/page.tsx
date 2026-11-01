"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Settings, Map as MapIcon, LogOut, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import MapModal from '@/components/MapModal';
import { CONGREGACAO } from '@/config/congregacao';
import { BotaoEditar, FaixaEdicao, JanelaEdicao, BotaoSalvar, BotaoPerigo, campoEdicao, rotuloEdicao } from '@/components/ModoEdicao';
import { numeroDoTerritorio } from '@/lib/mapaTerritorios';

// Janelas do modo edição
type Janela =
  | { tipo: 'territorio'; t: any }
  | { tipo: 'novoTerritorio' };

export default function Home() {
  const router = useRouter();
  const [territorios, setTerritorios] = useState<any[]>([]);
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
      if (role === 'admin') setIsAdminUser(true);
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

  async function fetchTerritorios() {
      try {
        const { data, error } = await supabase
          .from('territorios')
          .select('id, nome, bairro, quadras(id, nome, enderecos(status, is_bloqueado))')
          .order('nome', { ascending: true });

        if (error) {
          console.error("Erro ao buscar territórios:", error);
          return;
        }

        if (data) {
          const territoriosCalculados = data.map((t: any) => {
            let totalEnderecos = 0;
            let completos = 0;

            t.quadras?.forEach((q: any) => {
              q.enderecos?.forEach((e: any) => {
                totalEnderecos++;
                const status = String(e.status).toLowerCase();
                const isBloqueado = status === 'bloqueado' || e.is_bloqueado === true || String(e.is_bloqueado).toLowerCase() === 'true';
                if (status === 'true' || status === 'falado' || status === 'cartas' || isBloqueado) {
                  completos++;
                }
              });
            });

            const progresso = totalEnderecos > 0 
              ? Math.round((completos / totalEnderecos) * 100) 
              : 0;

            const quadrasNomes = (t.quadras || [])
              .map((q: any) => {
                const match = String(q.nome || '').match(/\d+/);
                return match ? Number(match[0]) : q.nome;
              })
              .sort((a: any, b: any) => {
                if (typeof a === 'number' && typeof b === 'number') return a - b;
                return String(a).localeCompare(String(b));
              })
              .join(', ');

            return {
              id: t.id,
              nome: t.nome,
              bairro: t.bairro || CONGREGACAO.bairroPadrao,
              bairroCadastrado: t.bairro,
              totalQuadras: (t.quadras || []).length,
              progresso,
              quadrasNomes
            };
          });

          setTerritorios(territoriosCalculados);
        }
      } catch (err) {
        console.error("Erro inesperado:", err);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchTerritorios();
  }, []);

  const getCircleColor = (prog: number) => {
    if (prog < 20) return "#f97316"; // Laranja
    if (prog < 75) return "#3b82f6"; // Azul
    return "#22c55e"; // Verde
  };

  // ------------------------------------------------------------ modo edição
  const abrirJanela = (j: Janela) => {
    setJanela(j);
    if (j.tipo === 'territorio') {
      setTxtNome(j.t.nome);
      setTxtBairro(j.t.bairroCadastrado ?? "");
    } else {
      // Sugere o próximo número, no mesmo formato dos que já existem
      const maior = Math.max(0, ...territorios.map(t => parseInt(numeroDoTerritorio(t.nome) ?? '0', 10)));
      setTxtNome(`TERRITÓRIO ${String(maior + 1).padStart(2, '0')}`);
      setTxtBairro("");
    }
  };

  const fecharJanela = () => { setJanela(null); setSalvando(false); };

  const salvarTerritorio = async (t: any) => {
    const nome = txtNome.trim();
    if (!nome) return;
    setSalvando(true);
    const { error } = await supabase.from('territorios').update({ nome, bairro: txtBairro.trim() || null }).eq('id', t.id);
    setSalvando(false);
    if (error) return alert(`Não foi possível salvar o território.\n\n${error.message}`);
    fecharJanela();
    fetchTerritorios();
  };

  // Só deixa excluir território vazio: com quadras, o risco de apagar
  // casas, marcações e designações sem querer é grande demais.
  const excluirTerritorio = async (t: any) => {
    if (!window.confirm(`Excluir o ${t.nome}?`)) return;
    setSalvando(true);
    const { error } = await supabase.from('territorios').delete().eq('id', t.id);
    setSalvando(false);
    if (error) return alert(`Não foi possível excluir o território.\n\n${error.message}`);
    fecharJanela();
    fetchTerritorios();
  };

  const criarTerritorio = async () => {
    const nome = txtNome.trim();
    if (!nome) return;
    if (territorios.some(t => t.nome.trim().toLowerCase() === nome.toLowerCase()) &&
        !window.confirm(`Já existe o ${nome}. Criar outro com o mesmo nome?`)) return;
    setSalvando(true);
    const { data, error } = await supabase.from('territorios').insert([{ nome, bairro: txtBairro.trim() || null }]).select('id').single();
    setSalvando(false);
    if (error || !data) return alert(`Não foi possível criar o território.\n\n${error?.message ?? ''}`);
    // Abre o território novo já editando, para criar as quadras
    router.push(`/territorio/${data.id}?editar=1`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Carregando territórios...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-12 relative">
      <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
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
      
      <button 
        onClick={() => setIsMapOpen(true)}
        className="absolute top-6 left-6 text-[#0A4D3C] hover:text-[#083d2f] bg-[#0A4D3C]/10 hover:bg-[#0A4D3C]/20 p-2 rounded-full transition-all z-10"
        title="Ver Mapa Geral"
      >
        <MapIcon size={20} />
      </button>
      {isAdminUser && !editando && (
        <BotaoEditar onClick={() => setEditando(true)} className="absolute top-6 left-[4.25rem] z-10" />
      )}

      {editando && (
        <div className="max-w-4xl mx-auto sticky top-0 z-40 -mx-4 sm:mx-auto">
          <FaixaEdicao dica="Toque num território para renomear, ou crie um novo no fim da lista." onConcluir={() => setEditando(false)} />
        </div>
      )}
      
      <header className="text-center py-8 px-4 max-w-4xl mx-auto relative">
        <h1 className="text-[22px] sm:text-3xl font-bold text-slate-800 tracking-tight">Territórios {CONGREGACAO.nome}</h1>
        
        <div className="relative mt-2 flex items-center justify-center">
          <p className="text-gray-500">Escolha o território</p>
        </div>
      </header>

      {/* GRID DE 2 COLUNAS FIXAS (Funciona em mobile e PC) */}
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {territorios.map((t) => (
          <div key={t.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center relative">
            
            {/* No modo edição o cartão inteiro abre a janela do território */}
            {editando && (
              <button
                onClick={() => abrirJanela({ tipo: 'territorio', t })}
                className="absolute inset-0 z-20 rounded-3xl ring-2 ring-amber-300 bg-amber-50/20 flex items-start justify-end p-4"
                title="Editar território"
              >
                <Pencil size={15} className="text-amber-600" />
              </button>
            )}

            <h2 className="font-bold text-gray-800 uppercase text-center mb-1">{t.nome}</h2>
            
            <p className="text-[10px] text-gray-400 mb-4 uppercase">{t.bairro}</p>

            <Link href={`/territorio/${t.id}`} className="flex flex-col items-center cursor-pointer transition-transform hover:scale-[1.02] w-full">
              {/* Círculo de Progresso */}
              <div className="relative w-20 h-20 flex items-center justify-center mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                <circle 
                  cx="40" cy="40" r="34" stroke={getCircleColor(t.progresso)} strokeWidth="6" fill="none" 
                  strokeDasharray="213" strokeDashoffset={213 - (213 * t.progresso) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-bold text-lg">{t.progresso}%</span>
            </div>
            
            <p className="text-[10px] text-gray-400 mb-4 uppercase">Concluído</p>

            <div className="w-full border-t border-gray-100 pt-3 flex flex-col items-center">
              {t.quadrasNomes && (
                <span className="text-[12px] text-gray-500 font-medium mb-2 truncate max-w-full px-2" title={t.quadrasNomes}>
                  Quadras: {t.quadrasNomes}
                </span>
              )}
              <button className="text-[10px] font-bold text-blue-600 flex items-center justify-center gap-1 uppercase">
                VER QUADRAS <ArrowRight size={14} />
              </button>
            </div>
            </Link>
          </div>
        ))}

        {editando && (
          <button
            onClick={() => abrirJanela({ tipo: 'novoTerritorio' })}
            className="rounded-3xl border-2 border-dashed border-amber-300 text-amber-800 font-bold min-h-[220px] flex flex-col items-center justify-center gap-2 hover:bg-amber-50"
          >
            <Plus size={28} />
            Novo território
          </button>
        )}
      </div>

      {/* JANELAS DO MODO EDIÇÃO */}
      {janela?.tipo === 'territorio' && (
        <JanelaEdicao titulo={janela.t.nome} subtitulo={janela.t.totalQuadras === 1 ? '1 quadra' : `${janela.t.totalQuadras} quadras`} onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome do território</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={rotuloEdicao}>Bairro</label>
            <input className={campoEdicao} value={txtBairro} onChange={e => setTxtBairro(e.target.value)} placeholder={CONGREGACAO.bairroPadrao} />
          </div>
          <BotaoSalvar onClick={() => salvarTerritorio(janela.t)} disabled={salvando || !txtNome.trim()}>Salvar</BotaoSalvar>
          <Link href={`/territorio/${janela.t.id}?editar=1`}
            className="w-full text-center text-slate-700 bg-gray-100 hover:bg-gray-200 font-bold rounded-xl px-4 py-3 transition-colors">
            Editar quadras
          </Link>
          {janela.t.totalQuadras === 0 ? (
            <BotaoPerigo onClick={() => excluirTerritorio(janela.t)} disabled={salvando}>Excluir território</BotaoPerigo>
          ) : (
            <p className="text-[11px] text-gray-400 text-center">Para excluir o território, exclua as quadras dele antes.</p>
          )}
        </JanelaEdicao>
      )}

      {janela?.tipo === 'novoTerritorio' && (
        <JanelaEdicao titulo="Novo território" onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome do território</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)} autoFocus />
            <p className="text-[11px] text-gray-400 mt-1.5">Termine com o número (ex: TERRITÓRIO 23) para ele aparecer certo no mapa.</p>
          </div>
          <div>
            <label className={rotuloEdicao}>Bairro</label>
            <input className={campoEdicao} value={txtBairro} onChange={e => setTxtBairro(e.target.value)} placeholder={CONGREGACAO.bairroPadrao} />
          </div>
          <BotaoSalvar onClick={criarTerritorio} disabled={salvando || !txtNome.trim()}>Criar território</BotaoSalvar>
        </JanelaEdicao>
      )}

      {isMapOpen && <MapModal onClose={() => setIsMapOpen(false)} />}
    </main>
  );
}
