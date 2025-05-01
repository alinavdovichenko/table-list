import React, { useState } from 'react';
import store from '../stores/tableStore';
import { observer } from 'mobx-react-lite';

interface ItemRowProps {
  id: number;
}

export const ItemRow: React.FC<ItemRowProps> = observer(({ id }) => {
  const isSelected = store.selected.includes(id);
  const [dragging, setDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDragging(true);
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragEnd = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const toId = id;

    if (fromId !== toId) {
      store.moveItem(fromId, toId);
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
    <div className={`item-row ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`} 
         draggable="true"
         onDragStart={handleDragStart}
         onDragEnd={handleDragEnd}
         onDragOver={handleDragOver}
         onDrop={handleDrop}
         onDragLeave={handleDragLeave}
    >
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
