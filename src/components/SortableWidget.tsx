import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, ArrowLeftRight } from 'lucide-react';

interface SortableWidgetProps {
  id: string;
  className?: string;
  children: React.ReactNode;
  overrideSpan?: string;
  onResize?: (id: string, newSpan: string) => void;
  isEditMode?: boolean;
}

const WIDGET_SIZES = [
  'col-span-12 md:col-span-6 lg:col-span-3',
  'col-span-12 md:col-span-6 lg:col-span-4',
  'col-span-12 lg:col-span-6',
  'col-span-12 lg:col-span-8',
  'col-span-12'
];

export function SortableWidget({ id, className = '', children, overrideSpan, onResize, isEditMode }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: !isEditMode });

  let childGridClasses = '';
  if (React.isValidElement(children) && typeof (children.props as any).className === 'string') {
    childGridClasses = (children.props as any).className
      .split(' ')
      .filter(c => c.includes('col-span-') || c.includes('row-span-'))
      .join(' ');
  }
  
  const currentSpan = overrideSpan || childGridClasses;

  const handleCycleSize = (e?: React.MouseEvent | PointerEvent, dir: number = 1) => {
    if (e) e.stopPropagation();
    if (!onResize) return;
    
    let idx = -1;
    // Find closest match
    if (currentSpan.includes('col-span-3')) idx = 0;
    else if (currentSpan.includes('col-span-4')) idx = 1;
    else if (currentSpan.includes('col-span-6')) idx = 2;
    else if (currentSpan.includes('col-span-8')) idx = 3;
    else if (currentSpan.includes('col-span-12')) idx = 4;
    else idx = 3; // fallback
    
    // Some widgets have row-span, let's preserve it if present
    const rowSpanMatches = currentSpan.match(/row-span-\d+/g);
    const rowSpan = rowSpanMatches ? ` ${rowSpanMatches.join(' ')}` : '';

    let nextIdx = (idx + dir) % WIDGET_SIZES.length;
    if (nextIdx < 0) nextIdx = WIDGET_SIZES.length - 1;
    
    onResize(id, WIDGET_SIZES[nextIdx] + rowSpan);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`${currentSpan} ${className} relative group h-full flex flex-col [&>div:not(.drag-handle):not(.resize-handle)]:flex-1`}>
      {isEditMode && (
        <div 
          {...attributes} 
          {...listeners} 
          className="drag-handle absolute top-3 right-3 z-50 w-8 h-8 rounded-lg bg-black/20 hover:bg-black/40 shadow-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-grab active:cursor-grabbing opacity-30 hover:opacity-100 transition-all touch-none"
          title="Widget verschieben"
        >
          <GripHorizontal size={16} />
        </div>
      )}
      {isEditMode && onResize && (
        <div
          onClick={(e) => { e.stopPropagation(); handleCycleSize(e, 1); }}
          onPointerDown={(e) => {
             e.stopPropagation();
             let lastX = e.clientX;
             let lastY = e.clientY;
             const handleMove = (moveE: PointerEvent) => {
                 const dx = moveE.clientX - lastX;
                 const dy = moveE.clientY - lastY;
                 const delta = dx + dy; // Combined diagonal vector 
                 
                 if (delta > 60) { // Dragged diagonally bottom-right -> bigger
                     handleCycleSize(moveE as any, 1);
                     lastX = moveE.clientX;
                     lastY = moveE.clientY;
                 } else if (delta < -60) { // Dragged diagonally top-left -> smaller
                     handleCycleSize(moveE as any, -1);
                     lastX = moveE.clientX;
                     lastY = moveE.clientY;
                 }
             };
             const handleUp = () => {
                 window.removeEventListener('pointerup', handleUp);
                 window.removeEventListener('pointermove', handleMove);
             };
             window.addEventListener('pointerup', handleUp);
             window.addEventListener('pointermove', handleMove);
          }}
          className="resize-handle absolute bottom-3 right-3 z-50 w-8 h-8 rounded-lg bg-black/20 hover:bg-black/40 shadow-sm border border-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-ew-resize opacity-40 hover:opacity-100 transition-all active:scale-95 touch-none"
          title="Breite anpassen (Klicken oder Ziehen, um Spaltenanzahl zu ändern)"
        >
          <ArrowLeftRight size={14} />
        </div>
      )}
      {children}
    </div>
  );
}

