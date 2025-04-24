import React from 'react';
import store from '../stores/tableStore';

interface ItemRowProps {
  id: number;
}

export const ItemRow: React.FC<ItemRowProps> = ({ id }) => {
  const isSelected = store.selected.includes(id);

  const toggleSelection = () => {
    if (isSelected) {
      store.deselectItem(id);
    } else {
      store.selectItem(id);
    }
  };

  return (
    <div className={`item-row ${isSelected ? 'selected' : ''}`} onClick={toggleSelection}>
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
};
