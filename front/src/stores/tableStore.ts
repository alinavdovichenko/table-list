import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api/api';

interface Item {
  index: number;
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

    this.isLoading = true;
    const currentOffset = reset ? 0 : this.offset;

    try {
      const res = await API.get<ItemResponse>('/items', {
        params: { offset: currentOffset, limit: this.limit },
      });

      runInAction(() => {
        if (reset) {
          this.items = res.data.items;
        } else {
          const newItems = res.data.items.filter(i => !this.items.find(existing => existing.id === i.id));
          this.items = [...this.items, ...newItems];
        }

        this.total = res.data.total;
        this.selected = res.data.selected;
        this.search = res.data.search;
        this.offset = currentOffset + this.limit;
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
    this.offset = 0;
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

  async setOrder(order: Item[]) {
    try {
      await API.post('/order', { order });
    } catch (error) {
      console.error('Ошибка при обновлении порядка:', error);
    }
  }

  async resetAll() {
    try {
      await Promise.all([
        API.post('/order', { order: [] }),
        API.post('/search', { search: '' }),
        API.post('/select', { selected: [] }),
      ]);
      this.offset = 0;
      this.items = [];
      await this.fetchItems(true);
    } catch (error) {
      console.error('Ошибка при сбросе:', error);
    }
  }

  setDragOver(id: number | null, position: 'before' | 'after' | null = null) {
    if (this.dragOverId === id && this.dropPosition === position) return;
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
      this.offset = 0;
      await this.fetchItems(true); 
    } catch (error) {
      console.error('Ошибка при перемещении:', error);
    }
  }
  
}

const store = new TableStore();
export default store;
