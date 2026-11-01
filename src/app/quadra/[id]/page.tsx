"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, UserCheck, Mail, Ban, Map as MapIcon, Settings, LogOut, Pencil, Plus } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableEndereco from '@/components/DraggableEndereco';
import DraggableRua from '@/components/DraggableRua';
import { supabase } from '@/lib/supabase';
import { CONGREGACAO } from '@/config/congregacao';
import Link from 'next/link';
import MapModal from '@/components/MapModal';
import { BotaoEditar, FaixaEdicao, JanelaEdicao, BotaoSalvar, BotaoPerigo, PreviaNumeros, campoEdicao, rotuloEdicao } from '@/components/ModoEdicao';
import { interpretarNumeros } from '@/lib/numeros';

// Janelas do modo edição
type Janela =
  | { tipo: 'casa'; end: any }
  | { tipo: 'rua'; rua: string }
  | { tipo: 'addCasas'; rua: string }
  | { tipo: 'novaRua' }
  | { tipo: 'quadra' };

const mesmoNumero = (a: string, b: string) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export default function QuadraPage() {
  const params = useParams();
  const router = useRouter();
  
  const [quadra, setQuadra] = useState<any>(null);
  const [ruasAgrupadas, setRuasAgrupadas] = useState<{rua: string, ordem_rua: number, enderecos: any[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<any>(null);

  // Estados Admin e Edição
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [editando, setEditando] = useState(false);
  const [janela, setJanela] = useState<Janela | null>(null);
  const [txtNome, setTxtNome] = useState("");
  const [txtNumeros, setTxtNumeros] = useState("");
  const [salvando, setSalvando] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    } else if (isAdmin === 'true') {
      setIsLogged(true);
      if (role === 'admin') {
        setIsAdminUser(true);
        // Vindo de "nova quadra" ou "editar ruas e casas": já abre editando
        if (new URLSearchParams(window.location.search).get('editar') === '1') setEditando(true);
      }
    }
    
    fetchQuadraEEnderecos();
  }, [params?.id]);

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userRole');
    localStorage.removeItem('loginExpiry');
    setIsLogged(false);
    setIsAdminUser(false);
    setEditando(false);
  };

  // Escutar mudanças em tempo real no banco
  useEffect(() => {
    if (!params?.id) return;

    const channel = supabase
      .channel('realtime-enderecos')
      .on(
        'postgres_changes',
        {
          event: '*', // UPDATE, INSERT, DELETE
          schema: 'public',
          table: 'enderecos',
          filter: `quadra_id=eq.${params.id}`
        },
        () => {
          // Quando alguém alterar um endereço (ex: marcar), atualiza a lista
          fetchQuadraEEnderecos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params?.id]);

  async function fetchQuadraEEnderecos() {
    if (!params?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('quadras')
        .select('*, territorio:territorios(nome, bairro), enderecos(*)')
        .eq('id', params.id as string)
        .single();

      if (error) {
        console.error("Erro ao buscar quadra:", error);
        return;
      }

      if (data) {
        setQuadra({
          id: data.id,
          nome: data.nome,
          territorio_nome: data.territorio?.nome,
          territorio_bairro: data.territorio?.bairro,
          territorio_id: data.territorio_id
        });

        // Agrupa os endereços por nome da rua
        const agrupados: Record<string, any[]> = {};
        
        // Retorna na ordem natural do banco de dados
        const sortedEnderecos = (data.enderecos || []);

        sortedEnderecos.forEach((e: any) => {
          const rua = e.rua || 'Sem Rua';
          if (!agrupados[rua]) agrupados[rua] = [];
          agrupados[rua].push(e);
        });

        // Converte para Array de Ruas
        const ruasArray = Object.keys(agrupados).map(rua => {
           const ordem_rua = agrupados[rua].find(e => e.ordem_rua && e.ordem_rua !== 0)?.ordem_rua || 0;
           return {
             rua,
             ordem_rua,
             enderecos: agrupados[rua]
           }
        });

        // Ordena as ruas entre si
        ruasArray.sort((a, b) => {
          if (a.ordem_rua !== 0 || b.ordem_rua !== 0) {
            return a.ordem_rua - b.ordem_rua;
          }
          return a.rua.localeCompare(b.rua);
        });

        // Ordena os endereços dentro de cada rua
        ruasArray.forEach(r => {
          r.enderecos.sort((a, b) => {
             // Se tiver ordem definida no BD, ela tem prioridade absoluta
             if (a.ordem !== undefined && b.ordem !== undefined && (a.ordem !== 0 || b.ordem !== 0)) {
               return (a.ordem || 0) - (b.ordem || 0);
             }

             // Se não tiver ordem, cai no sort normal (por número/SN)
             const numA = String(a.numero || '').toLowerCase().trim();
             const numB = String(b.numero || '').toLowerCase().trim();
             
             const isSnA = numA === 'sn' || numA === 's/n' || numA === 's.n' || numA === '';
             const isSnB = numB === 'sn' || numB === 's/n' || numB === 's.n' || numB === '';
             
             if (isSnA && !isSnB) return 1;
             if (!isSnA && isSnB) return -1;
             
             const matchA = numA.match(/\d+/);
             const matchB = numB.match(/\d+/);
             
             const intA = matchA ? parseInt(matchA[0], 10) : 0;
             const intB = matchB ? parseInt(matchB[0], 10) : 0;
             
             if (intA !== intB) return intA - intB;
             return numA.localeCompare(numB);
          });
        });

        setRuasAgrupadas(ruasArray);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  }

  const isVazioOuLivre = (status: string) => {
    if (!status) return true;
    const s = String(status).toLowerCase();
    return s === 'false' || s === 'null';
  };

  const handleEnderecoClick = (endereco: any) => {
    const isEndBloqueado = String(endereco.status).toLowerCase() === 'bloqueado' || endereco.is_bloqueado === true || String(endereco.is_bloqueado).toLowerCase() === 'true';

    // Se for "Não Visitar" ou estiver bloqueado
    if (isEndBloqueado) {
      alert("Este endereço está bloqueado (Não Visitar).");
      return;
    }

    // Se já estiver marcado, só o administrador pode desmarcar.
    // Antes qualquer um desmarcava, e marcações certas eram apagadas por engano.
    if (!isVazioOuLivre(endereco.status)) {
      if (!isAdminUser) {
        alert("Esta casa já foi marcada. Se foi por engano, avise o responsável pelo território.");
        return;
      }
      const confirmar = window.confirm("Você gostaria de desmarcar essa casa?");
      if (confirmar) {
        atualizarStatusNoBanco(endereco.id, 'false');
      }
      return;
    }

    // Se estiver em branco (ou 'false'), abre o modal de ações
    setEnderecoSelecionado(endereco);
    setModalAberto(true);
  };

  const atualizarStatusNoBanco = async (enderecoId: string, novoStatus: string) => {
    try {
      // Cria a data atual para caso de marcação
      const hoje = String(novoStatus).toLowerCase() === 'false' ? null : new Date().toISOString().split('T')[0];

      // Atualiza na view state imediatamente pra UX ficar rápida
      setRuasAgrupadas(prev => {
        const novo = [...prev];
        for (let i = 0; i < novo.length; i++) {
          novo[i].enderecos = novo[i].enderecos.map(e => 
            e.id === enderecoId ? { ...e, status: novoStatus, data_visita: hoje } : e
          );
        }
        return novo;
      });

      setModalAberto(false);
      setEnderecoSelecionado(null);

      // Envia pro Supabase
      const { error } = await supabase
        .from('enderecos')
        .update({ 
          status: novoStatus,
          data_visita: hoje
        })
        .eq('id', enderecoId);
        
      if (error) {
        console.error("Erro ao salvar endereço:", error);
        alert("Houve um erro ao tentar salvar.");
        fetchQuadraEEnderecos(); // Refetch caso falhe
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------------------------------------------------ modo edição
  const abrirJanela = (j: Janela) => {
    setJanela(j);
    setTxtNumeros("");
    if (j.tipo === 'casa') setTxtNome(j.end.numero ?? "");
    else if (j.tipo === 'rua') setTxtNome(j.rua);
    else if (j.tipo === 'quadra') setTxtNome(quadra?.nome ?? "");
    else setTxtNome("");
  };

  const fecharJanela = () => { setJanela(null); setSalvando(false); };

  // Roda a gravação, avisa se der erro e recarrega a quadra se der certo.
  const gravar = async (acao: () => PromiseLike<{ error: any }>, erro: string) => {
    setSalvando(true);
    const { error } = await acao();
    setSalvando(false);
    if (error) {
      alert(`${erro}\n\n${error.message}`);
      return;
    }
    fecharJanela();
    fetchQuadraEEnderecos();
  };

  const grupoDaRua = (rua: string) => ruasAgrupadas.find(r => r.rua === rua);
  const contaMarcadas = (ends: any[]) => ends.filter(e => !isVazioOuLivre(e.status) && String(e.status).toLowerCase() !== 'bloqueado').length;

  // Casa ---------------------------------------------------------------------
  const salvarNumeroCasa = (end: any) => {
    const novo = txtNome.trim();
    if (!novo || novo === end.numero) return fecharJanela();
    const repetida = grupoDaRua(end.rua)?.enderecos.some(e => e.id !== end.id && mesmoNumero(e.numero, novo));
    if (repetida && !window.confirm(`Já existe o número ${novo} nesta rua. Salvar mesmo assim?`)) return;
    // Só o número muda: a marcação da casa continua.
    gravar(() => supabase.from('enderecos').update({ numero: novo }).eq('id', end.id), 'Não foi possível salvar o número.');
  };

  const alternarBloqueio = (end: any, bloqueada: boolean) => {
    if (bloqueada) {
      gravar(() => supabase.from('enderecos').update({ status: 'false', is_bloqueado: false, data_visita: null }).eq('id', end.id), 'Não foi possível desbloquear.');
    } else {
      if (!window.confirm(`Marcar o número ${end.numero} como "Não visitar"?`)) return;
      gravar(() => supabase.from('enderecos').update({ status: 'bloqueado', data_visita: null }).eq('id', end.id), 'Não foi possível bloquear.');
    }
  };

  const excluirCasa = (end: any) => {
    const marcada = !isVazioOuLivre(end.status) && String(end.status).toLowerCase() !== 'bloqueado';
    const aviso = marcada ? '\n\nEla está marcada; a marcação também será apagada.' : '';
    if (!window.confirm(`Excluir o número ${end.numero} da ${end.rua}?${aviso}`)) return;
    gravar(() => supabase.from('enderecos').delete().eq('id', end.id), 'Não foi possível excluir a casa.');
  };

  // Rua ----------------------------------------------------------------------
  const renomearRua = (antiga: string) => {
    const nova = txtNome.trim();
    if (!nova || nova === antiga) return fecharJanela();
    if (grupoDaRua(nova) && !window.confirm(`Já existe a rua "${nova}" nesta quadra. As casas das duas vão ficar juntas numa rua só. Continuar?`)) return;
    gravar(() => supabase.from('enderecos').update({ rua: nova }).eq('quadra_id', quadra.id).eq('rua', antiga), 'Não foi possível renomear a rua.');
  };

  const excluirRua = (rua: string) => {
    const ends = grupoDaRua(rua)?.enderecos ?? [];
    const marcadas = contaMarcadas(ends);
    const aviso = marcadas === 1 ? '\n\n1 delas está marcada; a marcação também será apagada.'
      : marcadas > 1 ? `\n\n${marcadas} delas estão marcadas; as marcações também serão apagadas.` : '';
    if (!window.confirm(`Excluir a rua "${rua}" e as ${ends.length} casas dela?${aviso}`)) return;
    gravar(() => supabase.from('enderecos').delete().eq('quadra_id', quadra.id).eq('rua', rua), 'Não foi possível excluir a rua.');
  };

  // Números digitados -> só os que ainda não existem na rua
  const previaCasas = (rua: string) => {
    const { numeros, erro } = interpretarNumeros(txtNumeros);
    const existentes = grupoDaRua(rua)?.enderecos ?? [];
    const novos = numeros.filter(n => !existentes.some(e => mesmoNumero(e.numero, n)));
    const repetidos = numeros.filter(n => !novos.includes(n));
    return { novos, repetidos, erro };
  };

  const adicionarCasas = (rua: string) => {
    const { novos } = previaCasas(rua);
    if (novos.length === 0) return;
    const grupo = grupoDaRua(rua);
    const existentes = grupo?.enderecos ?? [];
    // Rua com ordem arrumada à mão: as casas novas entram no fim.
    // Rua sem ordem definida: entram pela ordem do número, como as outras.
    const maiorOrdem = Math.max(0, ...existentes.map(e => e.ordem || 0));
    const ordemRua = grupo?.ordem_rua ?? (Math.max(0, ...ruasAgrupadas.map(r => r.ordem_rua || 0)) + 1);
    const linhas = novos.map((numero, i) => ({
      quadra_id: quadra.id,
      rua,
      numero,
      status: 'false',
      is_bloqueado: false,
      ordem_rua: ordemRua,
      ordem: maiorOrdem > 0 ? maiorOrdem + 1 + i : 0,
    }));
    gravar(() => supabase.from('enderecos').insert(linhas), 'Não foi possível adicionar as casas.');
  };

  // Quadra -------------------------------------------------------------------
  const renomearQuadra = () => {
    const novo = txtNome.trim();
    if (!novo || novo === quadra?.nome) return fecharJanela();
    gravar(() => supabase.from('quadras').update({ nome: novo }).eq('id', quadra.id), 'Não foi possível renomear a quadra.');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Se estiver arrastando uma RUA inteira
    if (activeId.startsWith('rua-') && overId.startsWith('rua-')) {
       setRuasAgrupadas(prev => {
          const oldIndex = prev.findIndex(r => `rua-${r.rua}` === activeId);
          const newIndex = prev.findIndex(r => `rua-${r.rua}` === overId);
          const newArray = arrayMove(prev, oldIndex, newIndex);
          
          // Salva ordem das ruas no BD
          Promise.all(newArray.map((r, index) => {
             const ids = r.enderecos.map((e: any) => e.id);
             return supabase.from('enderecos').update({ ordem_rua: index + 1 }).in('id', ids);
          })).catch(err => console.error("Erro ao salvar ordem das ruas", err));

          return newArray;
       });
       return;
    }

    // Se estiver arrastando um ENDEREÇO dentro da rua
    let ruaIndex = -1;
    let isEnderecoDrag = false;

    // Acha a rua que contém este endereço (assumindo drag and drop apenas dentro da mesma rua por enquanto)
    for (let i = 0; i < ruasAgrupadas.length; i++) {
       if (ruasAgrupadas[i].enderecos.some(e => String(e.id) === activeId)) {
          ruaIndex = i;
          isEnderecoDrag = true;
          break;
       }
    }

    if (isEnderecoDrag && ruaIndex !== -1) {
       setRuasAgrupadas(prev => {
          const novo = [...prev];
          const oldIndex = novo[ruaIndex].enderecos.findIndex(x => String(x.id) === activeId);
          const newIndex = novo[ruaIndex].enderecos.findIndex(x => String(x.id) === overId);
          
          if (oldIndex !== -1 && newIndex !== -1) {
             const newArray = arrayMove(novo[ruaIndex].enderecos, oldIndex, newIndex);
             novo[ruaIndex] = { ...novo[ruaIndex], enderecos: newArray };
             
             // Salva no BD em bg
             Promise.all(newArray.map((end, index) => {
                return supabase.from('enderecos').update({ ordem: index + 1 }).eq('id', end.id);
             })).catch(err => console.error("Erro ao salvar ordem dos endereços", err));
          }
          return novo;
       });
    }
  };

  const formatData = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    // Padrão visual do dev: "19/04/26"
    return `${day}/${month}/${year?.substring(2)}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-500 font-medium">Carregando endereços...</p>
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
          <FaixaEdicao dica="Toque numa casa, numa rua ou no nome da quadra para alterar." onConcluir={() => setEditando(false)} />
        </div>
      )}

      <div className="bg-white min-h-screen sm:min-h-[calc(100vh-2rem)] max-w-4xl mx-auto rounded-t-3xl sm:rounded-3xl p-6 shadow-sm relative">
        
        {/* CABEÇALHO PADRONIZADO */}
        <header className="text-center pb-6 pt-2 px-1 relative">
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
            <button onClick={() => abrirJanela({ tipo: 'quadra' })} className="inline-flex items-center gap-2 text-[22px] sm:text-3xl font-bold text-slate-800 tracking-tight uppercase">
              {quadra?.nome}
              <Pencil size={18} className="text-amber-600" />
            </button>
          ) : (
            <h1 className="text-[22px] sm:text-3xl font-bold text-slate-800 tracking-tight uppercase">
              {quadra?.nome}
            </h1>
          )}
          
          <div className="relative mt-2 flex items-center justify-center">
            <p className="text-gray-500 text-[13px] sm:text-sm">
               {quadra?.territorio_nome} - {quadra?.territorio_bairro || CONGREGACAO.bairroPadrao}
            </p>
            {quadra?.territorio_id ? (
              <Link 
                href={`/territorio/${quadra.territorio_id}`} 
                className="absolute right-0 bg-[#0A4D3C] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:scale-105 active:scale-95 transition-transform"
              >
                &lt; Voltar
              </Link>
            ) : (
               <button 
                 onClick={() => router.back()}
                 className="absolute right-0 bg-[#0A4D3C] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:scale-105 active:scale-95 transition-transform"
               >
                 &lt; Voltar
               </button>
            )}
          </div>
        </header>

        <p className="font-mono text-gray-500 tracking-tight text-sm mb-6 border-b border-gray-100 pb-6">
          Marque somente as casas que você<br/>conseguiu falar.
        </p>

        {/* LISTAGEM DE ENDEREÇOS AGRUPADOS */}
        <div className="w-full">
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ruasAgrupadas.map(r => `rua-${r.rua}`)} strategy={verticalListSortingStrategy}>
              {ruasAgrupadas.map((ruaGroup) => (
                <DraggableRua 
                  key={ruaGroup.rua}
                  rua={ruaGroup.rua}
                  editando={editando}
                  onEditar={() => abrirJanela({ tipo: 'rua', rua: ruaGroup.rua })}
                >
                  <SortableContext items={ruaGroup.enderecos.map(e => e.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2">
                      {ruaGroup.enderecos.map((end) => {
                        const taVazio = isVazioOuLivre(end.status);
                        const isBloqueado = String(end.status).toLowerCase() === 'bloqueado' || end.is_bloqueado === true || String(end.is_bloqueado).toLowerCase() === 'true';

                        let bgStatus = 'bg-white';
                        if (isBloqueado) bgStatus = 'bg-red-50/60 hover:bg-red-100/50';
                        else if (!taVazio) {
                          if (String(end.status).toLowerCase() === 'cartas') bgStatus = 'bg-blue-50/60 hover:bg-blue-100/50';
                          else bgStatus = 'bg-green-50/60 hover:bg-green-100/50';
                        } else bgStatus = 'bg-white hover:bg-slate-50';

                        return (
                          <DraggableEndereco
                            key={end.id}
                            end={end}
                            onClick={editando ? (e: any) => abrirJanela({ tipo: 'casa', end: e }) : handleEnderecoClick}
                            isBloqueado={isBloqueado}
                            taVazio={taVazio}
                            bgStatus={bgStatus}
                            formatData={formatData}
                            editando={editando}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                  {editando && (
                    <button
                      onClick={() => abrirJanela({ tipo: 'addCasas', rua: ruaGroup.rua })}
                      className="w-full border-t border-dashed border-amber-300 bg-amber-50/50 text-amber-800 font-bold text-sm py-3 flex items-center justify-center gap-1.5 hover:bg-amber-50"
                    >
                      <Plus size={16} /> Casas nesta rua
                    </button>
                  )}
                </DraggableRua>
              ))}
            </SortableContext>
          </DndContext>

          {ruasAgrupadas.length === 0 && !editando && (
            <p className="text-center text-gray-400 py-8">Nenhuma casa cadastrada nesta quadra.</p>
          )}

          {editando && (
            <button
              onClick={() => abrirJanela({ tipo: 'novaRua' })}
              className="w-full rounded-xl border-2 border-dashed border-amber-300 text-amber-800 font-bold py-4 flex items-center justify-center gap-2 hover:bg-amber-50"
            >
              <Plus size={18} /> Nova rua
            </button>
          )}
        </div>

        {/* MODAL DE AÇÕES */}
        {modalAberto && enderecoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Nº {enderecoSelecionado.numero}</h3>
                  <p className="text-xs text-gray-500">{enderecoSelecionado.rua}</p>
                </div>
                <button 
                  onClick={() => setModalAberto(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-5 grid grid-cols-3 gap-3">
                <button 
                  onClick={() => atualizarStatusNoBanco(enderecoSelecionado.id, 'Falado')}
                  className="flex flex-col items-center justify-start p-3 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-green-400 hover:bg-green-50 focus:bg-green-50 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
                    <UserCheck size={22} />
                  </div>
                  <span className="text-[10px] font-bold text-center text-slate-700 leading-snug">
                    Falei nessa<br/>casa
                  </span>
                </button>
                
                <button 
                  onClick={() => atualizarStatusNoBanco(enderecoSelecionado.id, 'Cartas')}
                  className="flex flex-col items-center justify-start p-3 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-blue-400 hover:bg-blue-50 focus:bg-blue-50 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                    <Mail size={22} />
                  </div>
                  <span className="text-[10px] font-bold text-center text-slate-700 leading-snug">
                    Coloquei uma<br/>carta
                  </span>
                </button>

                <button 
                  onClick={() => {
                    const confirmBlock = window.confirm("Certeza que deseja bloquear este endereço?");
                    if (confirmBlock) atualizarStatusNoBanco(enderecoSelecionado.id, 'bloqueado');
                  }}
                  className="flex flex-col items-center justify-start p-3 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-red-400 hover:bg-red-50 focus:bg-red-50 active:scale-95 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                    <Ban size={22} />
                  </div>
                  <span className="text-[10px] font-bold text-center text-slate-700 leading-snug">
                    Não<br/>visitar
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* JANELAS DO MODO EDIÇÃO */}
      {janela?.tipo === 'casa' && (() => {
        const end = janela.end;
        const bloqueada = String(end.status).toLowerCase() === 'bloqueado' || end.is_bloqueado === true || String(end.is_bloqueado).toLowerCase() === 'true';
        return (
          <JanelaEdicao titulo={`Nº ${end.numero}`} subtitulo={end.rua} onFechar={fecharJanela}>
            <div>
              <label className={rotuloEdicao}>Número</label>
              <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && salvarNumeroCasa(end)} autoFocus />
            </div>
            <BotaoSalvar onClick={() => salvarNumeroCasa(end)} disabled={salvando}>Salvar número</BotaoSalvar>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => alternarBloqueio(end, bloqueada)} disabled={salvando}
                className="w-full text-slate-700 bg-gray-100 hover:bg-gray-200 font-bold rounded-xl px-3 py-3 text-sm transition-colors disabled:opacity-40">
                {bloqueada ? 'Desbloquear' : 'Não visitar'}
              </button>
              <BotaoPerigo onClick={() => excluirCasa(end)} disabled={salvando}>Excluir casa</BotaoPerigo>
            </div>
          </JanelaEdicao>
        );
      })()}

      {janela?.tipo === 'rua' && (
        <JanelaEdicao titulo={janela.rua} subtitulo={`${grupoDaRua(janela.rua)?.enderecos.length ?? 0} casas`} onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome da rua</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renomearRua(janela.rua)} autoFocus />
          </div>
          <BotaoSalvar onClick={() => renomearRua(janela.rua)} disabled={salvando}>Salvar nome</BotaoSalvar>
          <BotaoPerigo onClick={() => excluirRua(janela.rua)} disabled={salvando}>Excluir rua inteira</BotaoPerigo>
        </JanelaEdicao>
      )}

      {janela?.tipo === 'addCasas' && (() => {
        const previa = previaCasas(janela.rua);
        return (
          <JanelaEdicao titulo="Adicionar casas" subtitulo={janela.rua} onFechar={fecharJanela}>
            <div>
              <label className={rotuloEdicao}>Números</label>
              <input className={campoEdicao} value={txtNumeros} onChange={e => setTxtNumeros(e.target.value)}
                placeholder="Ex: 10, 12, 14  ou  10-30 pares" inputMode="text" autoFocus />
              <p className="text-[11px] text-gray-400 mt-1.5">Separe por vírgula. Use 10-20 para uma sequência e escreva &quot;pares&quot; ou &quot;ímpares&quot; se for só um lado da rua.</p>
            </div>
            <PreviaNumeros numeros={previa.novos} repetidos={previa.repetidos} erro={previa.erro} />
            <BotaoSalvar onClick={() => adicionarCasas(janela.rua)} disabled={salvando || previa.novos.length === 0}>
              {previa.novos.length > 1 ? `Adicionar ${previa.novos.length} casas` : 'Adicionar casa'}
            </BotaoSalvar>
          </JanelaEdicao>
        );
      })()}

      {janela?.tipo === 'novaRua' && (() => {
        const rua = txtNome.trim();
        const previa = previaCasas(rua);
        return (
          <JanelaEdicao titulo="Nova rua" subtitulo={quadra?.nome} onFechar={fecharJanela}>
            <div>
              <label className={rotuloEdicao}>Nome da rua</label>
              <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)} placeholder="Ex: Rua das Flores" autoFocus />
              {rua && grupoDaRua(rua) && (
                <p className="text-[11px] text-amber-700 mt-1.5">Essa rua já existe nesta quadra; as casas vão entrar nela.</p>
              )}
            </div>
            <div>
              <label className={rotuloEdicao}>Números</label>
              <input className={campoEdicao} value={txtNumeros} onChange={e => setTxtNumeros(e.target.value)} placeholder="Ex: 10, 12, 14  ou  10-30 pares" />
            </div>
            <PreviaNumeros numeros={previa.novos} repetidos={previa.repetidos} erro={previa.erro} />
            <BotaoSalvar onClick={() => adicionarCasas(rua)} disabled={salvando || !rua || previa.novos.length === 0}>
              Criar rua
            </BotaoSalvar>
          </JanelaEdicao>
        );
      })()}

      {janela?.tipo === 'quadra' && (
        <JanelaEdicao titulo="Renomear quadra" subtitulo={quadra?.territorio_nome} onFechar={fecharJanela}>
          <div>
            <label className={rotuloEdicao}>Nome da quadra</label>
            <input className={campoEdicao} value={txtNome} onChange={e => setTxtNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && renomearQuadra()} autoFocus />
          </div>
          <BotaoSalvar onClick={renomearQuadra} disabled={salvando}>Salvar nome</BotaoSalvar>
        </JanelaEdicao>
      )}

      {isMapOpen && <MapModal onClose={() => setIsMapOpen(false)} />}
    </main>
  );
}
