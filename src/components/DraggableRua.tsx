import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';

// Um bloco de rua na tela da quadra. No modo edição o título vira botão
// (renomear/excluir a rua) e aparece a alça para arrastar a rua inteira.
export default function DraggableRua({ rua, editando, onEditar, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `rua-${rua}`, disabled: !editando });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6 rounded-xl border border-gray-100 overflow-hidden shadow-sm bg-white">
      {/* TÍTULO DA RUA */}
      <div className="bg-gray-50 px-4 py-3 font-semibold text-slate-800 text-lg border-b border-gray-100 flex items-center justify-between relative">
        {/* Alça para arrastar a rua inteira */}
        {editando && (
          <div
            {...attributes}
            {...listeners}
            className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/5 touch-none"
            title="Arrastar a rua"
          >
            <div className="w-1 h-5 flex flex-col justify-between gap-1">
              <div className="w-full h-1 bg-gray-400 rounded"></div>
              <div className="w-full h-1 bg-gray-400 rounded"></div>
              <div className="w-full h-1 bg-gray-400 rounded"></div>
            </div>
          </div>
        )}

        {editando ? (
          <button onClick={onEditar} className="ml-6 flex-1 flex items-center justify-between gap-2 text-left">
            <span>{rua}</span>
            <Pencil size={15} className="text-amber-600 flex-shrink-0" />
          </button>
        ) : (
          <span>{rua}</span>
        )}
      </div>

      {/* O conteúdo interno (GRID 2 COLUNAS de endereços) é injetado aqui */}
      {children}
    </div>
  );
}
