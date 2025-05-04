import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api/api';

interface Item {
  id: number;
  index: number; // неизменяемый индекс в исходном массиве
}

interface ItemResponse {
  items: Item[];
  total: number;
  selected: number[];
  search: string;
}

class TableStore {
  items: Item[] = [];
  total = 0;
  selected: number[] = [];
  fullOrder: Map<number, number> = new Map(); // ключ: index, значение: id
  offset = 0;
  limit = 20;
  search = '';
  isLoading = false;
  dragOverId: number | null = null;
  dropPosition: 'before' | 'after' | null = null;
  draggingItemId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async fetchItems(reset = false) {
    if (this.isLoading) return;
    if (!reset && this.items.length >= this.total) return;

    if (reset) {
      this.offset = 0;
      this.items = [];
    }

    this.isLoading = true;

    try {
      const res = await API.get<ItemResponse>('/items', {
        params: { offset: this.offset, limit: this.limit },
      });

      console.log('📥 Получено с сервера:', res.data.items);

      runInAction(() => {
        const fetched = res.data.items;
        const map = new Map(this.items.map(item => [item.index, item]));
        fetched.forEach(item => map.set(item.index, item)); // обновим/добавим

        this.items = Array.from(map.values())
          .sort((a, b) => a.index - b.index);

        this.total = res.data.total;
        this.selected = res.data.selected;
        this.search = res.data.search;
        this.offset += this.limit;

        if (reset && this.search === '') {
          const orderMap = new Map<number, number>();
          this.items.forEach(item => orderMap.set(item.index, item.id));
          this.setFullOrder(orderMap);
        }
      });

    } catch (error) {
      console.error('❌ Ошибка при загрузке:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async fetchFullOrder() {
    try {
      const res = await API.get<{ index: number; id: number }[]>('/order');
      const orderMap = new Map<number, number>();
      res.data.forEach(({ index, id }) => orderMap.set(index, id));

      runInAction(() => {
        this.setFullOrder(orderMap);
      });

      console.log('📥 Загружен полный порядок:', res.data);
    } catch (error) {
      console.error('❌ Ошибка при загрузке порядка:', error);
    }
  }

  async setSearch(search: string) {
    try {
      await API.post('/search', { search });
      runInAction(() => {
        this.offset = 0;
        this.items = [];
      });

      await this.fetchFullOrder();
      await this.fetchItems(true);
    } catch (error) {
      console.error('❌ Ошибка при установке поиска:', error);
    }
  }

  selectItem(id: number) {
    if (!this.selected.includes(id)) {
      this.selected.push(id);
      this.updateSelection(this.selected);
    }
  }

  deselectItem(id: number) {
    this.selected = this.selected.filter(i => i !== id);
    this.updateSelection(this.selected);
  }

  async updateSelection(selected: number[]) {
    try {
      await API.post('/select', { selected });
    } catch (error) {
      console.error('❌ Ошибка при обновлении выбранных:', error);
    }
  }

  async resetAll() {
    try {
      await Promise.all([
        API.post('/order', { order: [] }),
        API.post('/search', { search: '' }),
        API.post('/select', { selected: [] }),
      ]);

      runInAction(() => {
        this.offset = 0;
        this.items = [];
        this.search = '';
        this.selected = [];
        this.draggingItemId = null;
        this.dragOverId = null;
        this.dropPosition = null;
      });

      await Promise.all([
        this.fetchFullOrder(),
        this.fetchItems(true),
      ]);
    } catch (error) {
      console.error('❌ Ошибка при сбросе:', error);
    }
  }

  setDragOver(id: number | null, position: 'before' | 'after' | null = null) {
    this.dragOverId = id;
    this.dropPosition = position;
  }

  setDraggingItem(id: number) {
    this.draggingItemId = id;
  }

  clearDragState() {
    this.dragOverId = null;
    this.dropPosition = null;
    this.draggingItemId = null;
  }

  async moveItemById(fromId: number, toId: number, position: 'before' | 'after' = 'before') {
    try {
      const fromItem = this.items.find(i => i.id === fromId);
      const toItem = this.items.find(i => i.id === toId);
      if (!fromItem || !toItem) return;
  
      const fromIndex = fromItem.index;
      const toIndex = toItem.index;
  
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
  
      const rangeIndexes = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      const rangeIds = rangeIndexes.map(index => this.fullOrder.get(index)!).filter(id => id !== undefined);
  
      // перемещаем только id, index остаются фиксированными
      const oldPos = rangeIds.indexOf(fromId);
      const newPos = rangeIds.indexOf(toId);
      if (oldPos === -1 || newPos === -1) return;
  
      const updatedIds = [...rangeIds];
      const [movedId] = updatedIds.splice(oldPos, 1);
  
      const insertAt = position === 'before'
        ? (oldPos < newPos ? newPos - 1 : newPos)
        : (oldPos < newPos ? newPos : newPos + 1);
  
      updatedIds.splice(insertAt, 0, movedId);
  
      // Формируем массив объектов с index и новым id
      const updatedOrderArray = rangeIndexes.map((index, i) => ({
        index,
        id: updatedIds[i],
      }));
  
      console.log('📤 Отправка нового порядка:', updatedOrderArray);
  
      await this.setOrder(updatedOrderArray);
  
      runInAction(() => {
        // обновляем глобальный порядок
        const newOrder = new Map(this.fullOrder);
        for (const { index, id } of updatedOrderArray) {
          newOrder.set(index, id);
        }
        this.setFullOrder(newOrder);
  
        // локально обновим items (чтобы не ждать повторного fetchItems)
        const itemMap = new Map(this.items.map(item => [item.id, item]));
        const updatedItems = updatedIds
          .map(id => itemMap.get(id))
          .filter(Boolean) as Item[];
  
        // Вставляем их обратно по их индексам
        const newItemsMap = new Map(this.items.map(item => [item.index, item]));
        updatedItems.forEach(item => newItemsMap.set(item.index, item));
  
        this.items = Array.from(newItemsMap.values()).sort((a, b) => a.index - b.index);
      });
  
    } catch (error) {
      console.error('❌ Ошибка при перемещении:', error);
    }
  }
  

  setFullOrder(order: Map<number, number>) {
    this.fullOrder = order;
  }

  async setOrder(order: { index: number; id: number }[]) {
    try {
      await API.post('/order', { order });
    } catch (error) {
      console.error('❌ Ошибка при сохранении порядка:', error);
    }
  }
}

const store = new TableStore();
export default store;
