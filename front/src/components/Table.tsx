import React, { useEffect, useRef, useState } from 'react';
import store from '../stores/tableStore';
import { observer } from 'mobx-react-lite';
import { ItemRow } from './ItemRow';

export const Table: React.FC = observer(() => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState(store.search);

  useEffect(() => {
    store.fetchItems(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !store.isLoading) {
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
    store.setSearch(searchValue.trim());
  };

  return (
    <div className="table-wrapper">
      <h1>Table List</h1>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
        <input
          className="search"
          placeholder="Поиск..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />
        <button onClick={handleSearch} className="search-button">
          Поиск
        </button>
      </div>

      <div className="list-container">
        {store.items.map((id) => (
          <ItemRow key={id} id={id} />
        ))}
        {store.isLoading && <div className="loader" />}
        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>
    </div>
  );
});
