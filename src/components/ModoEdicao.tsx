"use client";
import { Pencil, X } from 'lucide-react';

// Peças do "modo edição" das telas públicas (início, território e quadra).
// Quem não é administrador nunca vê nada daqui.

export const campoEdicao =
  'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#0A4D3C] transition-colors text-slate-800';

export const rotuloEdicao = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5';

// Botão de lápis que liga o modo edição. Fica ao lado do botão do mapa.
export function BotaoEditar({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-amber-700 bg-amber-100 hover:bg-amber-200 p-2 rounded-full transition-all ${className}`}
      title="Editar"
    >
      <Pencil size={20} />
    </button>
  );
}

// Faixa amarela no topo enquanto o modo edição está ligado.
export function FaixaEdicao({ dica, onConcluir }: { dica: string; onConcluir: () => void }) {
  return (
    <div className="sticky top-0 z-40 bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2.5 flex items-center gap-3 sm:rounded-2xl sm:mb-3">
      <Pencil size={16} className="flex-shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-sm font-bold">Modo edição</p>
        <p className="text-[11px] text-amber-800">{dica}</p>
      </div>
      <button
        onClick={onConcluir}
        className="bg-amber-900 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
      >
        Concluir
      </button>
    </div>
  );
}

// Janela de edição: sobe de baixo no celular, centralizada no computador.
export function JanelaEdicao({
  titulo,
  subtitulo,
  onFechar,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-slate-800 break-words">{titulo}</h3>
            {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

// Botões padrão do rodapé das janelas.
export function BotaoSalvar({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[#0A4D3C] hover:bg-[#083d2f] text-white font-bold rounded-xl px-4 py-3 transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function BotaoPerigo({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-red-600 bg-red-50 hover:bg-red-100 font-bold rounded-xl px-4 py-3 transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// Lista os números que vão ser criados, antes de salvar.
export function PreviaNumeros({ numeros, repetidos, erro }: { numeros: string[]; repetidos: string[]; erro?: string }) {
  if (erro) return <p className="text-xs text-red-600 font-medium">{erro}</p>;
  if (numeros.length === 0 && repetidos.length === 0) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
      {numeros.length > 0 && (
        <p>
          <span className="font-bold text-slate-800">{numeros.length} {numeros.length === 1 ? 'casa nova' : 'casas novas'}:</span>{' '}
          {numeros.join(', ')}
        </p>
      )}
      {repetidos.length > 0 && (
        <p className="text-amber-700 mt-1">
          Já existem, não serão repetidas: {repetidos.join(', ')}
        </p>
      )}
    </div>
  );
}
