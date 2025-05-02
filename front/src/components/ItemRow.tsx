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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(true);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const toIndex = index;

    if (fromIndex !== toIndex) {
      store.moveItemByIndex(fromIndex, toIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    store.setDragOver(id);
  };

  const handleDragLeave = () => {
    store.setDragOver(null);
  };

  const toggleSelection = () => {
    if (store.selected.includes(id)) {
      store.deselectItem(id);
    } else {
      store.selectItem(id);
    }
  };

  return (
    <div
      className={`item-row ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''} ${store.dragOverId === id ? 'drag-over' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <span className="item-id">{index}</span>
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
