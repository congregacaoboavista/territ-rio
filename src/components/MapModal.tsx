"use client";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { CONGREGACAO } from "@/config/congregacao";

// O zoom muda a LARGURA da imagem (e não um transform), para a área de
// rolagem crescer junto: assim dá para rolar até qualquer canto do mapa.
// Vai até 8x porque, no celular, só aí o nome das ruas fica legível.
const ZOOM_MAXIMO = 8;
const PASSO = 1.5;

export default function MapModal({ onClose }: { onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const caixa = useRef<HTMLDivElement>(null);
  // Ponto do mapa (em fração da largura/altura) que deve voltar ao centro
  const centro = useRef<{ x: number; y: number } | null>(null);

  // Impede rolagem do body quando modal está aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Muda o zoom mantendo no centro da tela o mesmo ponto do mapa
  const mudarZoom = (novo: number) => {
    const el = caixa.current;
    if (el) {
      centro.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
    setScale(Math.min(ZOOM_MAXIMO, Math.max(1, novo)));
  };

  // Só depois que a imagem cresceu dá para rolar até o ponto guardado
  useLayoutEffect(() => {
    const el = caixa.current;
    const c = centro.current;
    if (!el || !c) return;
    el.scrollLeft = c.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = c.y * el.scrollHeight - el.clientHeight / 2;
    centro.current = null;
  }, [scale]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="w-full flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 z-10">
        <div className="flex items-center gap-1 bg-black/50 rounded-full p-1 backdrop-blur-md">
          <button
            onClick={() => mudarZoom(scale / PASSO)}
            disabled={scale <= 1}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
          >
            <ZoomOut size={20} />
          </button>
          <span className="text-white/80 text-xs font-bold w-9 text-center tabular-nums">{Math.round(scale * 10) / 10}x</span>
          <button
            onClick={() => mudarZoom(scale * PASSO)}
            disabled={scale >= ZOOM_MAXIMO}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
          >
            <ZoomIn size={20} />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* CONTEÚDO SCROLLÁVEL */}
      <div ref={caixa} className="flex-1 overflow-auto p-4 pt-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CONGREGACAO.mapaImagem}
          alt="Mapa Geral"
          style={{ width: `${scale * 100}%` }}
          className="block mx-auto h-auto max-w-none rounded-xl shadow-2xl"
        />
      </div>
    </div>
  );
}
