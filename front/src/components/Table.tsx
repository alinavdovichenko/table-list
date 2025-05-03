import React, { useEffect, useRef, useState } from 'react';
import store from '../stores/tableStore';
import { observer } from 'mobx-react-lite';
import { ItemRow } from './ItemRow';
import { LoaderSentinel } from './LoaderSentinel';

export const Table: React.FC = observer(() => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState(store.search);

  useEffect(() => {
    store.fetchItems(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !store.isLoading && store.items.length < store.total) {
          store.fetchItems();
        }
      },
      { threshold: 1.0 }
    );

    const current = sentinelRef.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  const handleSearch = () => {
    const trimmed = searchValue.trim();
    if (trimmed !== store.search) {
      store.setSearch(trimmed);
    }
  };

  const handleResetAll = () => {
    store.resetAll();
    setSearchValue('');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (value.trim() === '' && store.search !== '') {
      store.setSearch('');
    }
  };

  return (
    <div className="table-wrapper">
      <h1>Table List</h1>

      <div className="table-controls">
        <input
          className="search-input"
          placeholder="Поиск..."
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <button onClick={handleSearch} className="search-button">
          Поиск
        </button>
        <button onClick={handleResetAll} className="search-button search-button--reset">
          Сбросить
        </button>
      </div>

      <div className="list-container" onDragOver={handleDragOver}>
        <div className="table-title">
          {store.isLoading && store.items.length === 0
            ? 'Данные загружаются...'
            : store.items.length
            ? `${store.total} результатов`
            : 'Нет результатов'}
        </div>
        <div className="table-title--selected">
          {store.isLoading && store.selected.length === 0
            ? ''
            : store.selected.length
            ? `Selected: ${store.selected}`
            : 'Нет выделенных элементов'}
        </div>

        {store.items.map(({ id }) => (
          <ItemRow key={id} id={id} />
        ))}
      </div>

      <LoaderSentinel sentinelRef={sentinelRef} isLoading={store.isLoading} />
    </div>
  );
});
