import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import store from '../stores/tableStore';
import { ItemRow } from './ItemRow';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

export const Table = observer(() => {
  useEffect(() => {
    store.fetchItems();

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= fullHeight - 100) {
        store.fetchItems();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(store.items);
    const [removed] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, removed);

    store.setOrder(newItems);
  };

  return (
    <div className="table-wrapper">
      <h1>Table List</h1>
      <input
        className="search"
        type="text"
        placeholder="Поиск..."
        value={store.search}
        onChange={(e) => store.setSearch(e.target.value)}
      />
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="list">
          {(provided) => (
            <div
              className="list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {store.items.map((item, index) => (
                <Draggable key={item} draggableId={String(item)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        backgroundColor: snapshot.isDragging ? '#e0f7fa' : '',
                      }}
                    >
                      <ItemRow id={item} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
});
