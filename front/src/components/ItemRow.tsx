import React from 'react';
import store from '../stores/tableStore';
import { observer } from 'mobx-react-lite';

interface ItemRowProps {
  id: number;
}

export const ItemRow: React.FC<ItemRowProps> = observer(({ id }) => {
  const isSelected = store.selected.includes(id);

  const toggleSelection = () => {
    if (store.selected.includes(id)) {
      store.deselectItem(id);
    } else {
      store.selectItem(id);
    }
  };

  return (
    <div className={`item-row ${isSelected ? 'selected' : ''}`}>
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
