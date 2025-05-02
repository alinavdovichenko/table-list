import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api/api';

interface ItemResponse {
  items: number[];
  total: number;
  selected: number[];
  order: number[];
  search: string;
}

class TableStore {
  items: number[] = [];
  total = 0;
  selected: number[] = [];
  offset = 0;
  limit = 20;
  order: number[] = [];
  search = '';
  isLoading = false;
  dragOverId: number | null = null;

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
        params: {
          offset: currentOffset,
          limit: this.limit,
        },
      });
  
      runInAction(() => {
        if (reset) {
          this.items = res.data.items;
        } else {
          const newItems = res.data.items.filter(id => !this.items.includes(id));
          this.items = [...this.items, ...newItems];
        }
  
        this.total = res.data.total;
        this.selected = res.data.selected;
        this.order = res.data.order;
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

  async setOrder(order: number[]) {
    try {
      this.order = order;
      await API.post('/order', { order });
    } catch (error) {
      console.error('Ошибка при обновлении порядка элементов:', error);
    }
  }

  async resetAll() {
    try {
      await Promise.all([
        API.post('/order', { order: [] }),
        API.post('/search', { search: '' }),
        API.post('/select', { selected: [] })
      ]);
      this.offset = 0;
      this.items = [];
      await this.fetchItems(true);
    } catch (error) {
      console.error('Ошибка при сбросе:', error);
    }
  }

  moveItem(fromId: number, toId: number) {
    const fromIndex = this.items.indexOf(fromId);
    const toIndex = this.items.indexOf(toId);
  
    if (fromIndex === -1 || toIndex === -1) return;
  
    const updated = [...this.items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
  
    this.items = updated;
    this.setOrder(updated); // сохраняем порядок на сервер
  }

  setDragOver(id: number | null) {
    this.dragOverId = id;
  } 
}

const store = new TableStore();
export default store;
