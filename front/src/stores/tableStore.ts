import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api/api';

interface Item {
  id: number;
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

      runInAction(() => {
        const fetched = res.data.items;
        const existingIds = new Set(this.items.map(i => i.id));
        const newItems = fetched.filter(i => !existingIds.has(i.id));

        this.items = reset ? fetched : [...this.items, ...newItems];
        this.total = res.data.total;
        this.selected = res.data.selected;
        this.search = res.data.search;
        this.offset += this.limit;
      });
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async setSearch(search: string) {
    try {
      await API.post('/search', { search });
      await this.fetchItems(true);
    } catch (error) {
      console.error('Ошибка при установке поиска:', error);
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
      console.error('Ошибка при обновлении выбранных элементов:', error);
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

      await this.fetchItems(true);
    } catch (error) {
      console.error('Ошибка при сбросе:', error);
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
      await API.post('/move', { fromId, toId, position });
  
      const fromIndex = this.items.findIndex(i => i.id === fromId);
      const toIndex = this.items.findIndex(i => i.id === toId);
      if (fromIndex === -1 || toIndex === -1) return;
  
      const updated = [...this.items];
      const [moved] = updated.splice(fromIndex, 1);
  
      let insertAt;
      if (position === 'before') {
        insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      } else {
        insertAt = fromIndex < toIndex ? toIndex : toIndex + 1;
      }
  
      updated.splice(insertAt, 0, moved);
  
      runInAction(() => {
        this.items = updated;
      });
  
      // 🧩 Добавляем отправку нового порядка
      const orderIds = updated.map(i => i.id);
      await this.setOrder(orderIds);
  
    } catch (error) {
      console.error('Ошибка при перемещении:', error);
    }
  }
  
  
  async setOrder(order: number[]) {
    try {
      await API.post('/order', { order });
    } catch (error) {
      console.error('Ошибка при обновлении порядка:', error);
    }
  }
  
}

const store = new TableStore();
export default store;
