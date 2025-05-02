import React, { useState } from 'react';
import store from '../stores/tableStore';
import { observer } from 'mobx-react-lite';

interface ItemRowProps {
  id: number;
  index: number;
}

export const ItemRow: React.FC<ItemRowProps> = observer(({ id, index }) => {
  const isSelected = store.selected.includes(id);
  const [dragging, setDragging] = useState(false);
  const isDragOver = store.dragOverId === id && store.draggingItemId !== id;
  const dropPosition = isDragOver ? store.dropPosition : null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(true);
    store.setDraggingItem(id);
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragEnd = () => {
    setDragging(false);
    store.clearDragState();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const toId = id;

    if (fromId !== toId && dropPosition) {
      store.moveItemById(fromId, toId, dropPosition);
    }

    store.clearDragState();
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromId === id) {
      store.clearDragState();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    store.setDragOver(id, position);
  };

  const handleDragLeave = () => {
    store.clearDragState();
  };

  const toggleSelection = () => {
    if (isSelected) {
      store.deselectItem(id);
    } else {
      store.selectItem(id);
    }
  };

  return (
    <div
      className={`item-row 
        ${isSelected ? 'selected' : ''} 
        ${dragging ? 'dragging' : ''} 
        ${isDragOver && dropPosition ? `drag-over-${dropPosition}` : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {isDragOver && dropPosition && (
        <div className={`drop-indicator drop-${dropPosition}`}>
          Вставить {dropPosition === 'before' ? 'до' : 'после'} элемента {id}
        </div>
      )}

      <span className="item-index">{index}</span>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          toggleSelection();
        }}
        className="checkbox"
      />
      <span className="item-id">{id}</span>
    </div>
  );
});
