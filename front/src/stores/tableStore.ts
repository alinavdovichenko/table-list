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

  moveItemByIndex(fromIndex: number, toIndex: number) {
    const fromItem = this.items.find(i => i.index === fromIndex);
    const toItem = this.items.find(i => i.index === toIndex);
    if (!fromItem || !toItem) return;

    const updated = [...this.items];
    const fromIdx = updated.findIndex(i => i.index === fromIndex);
    const [moved] = updated.splice(fromIdx, 1);
    const insertIdx = updated.findIndex(i => i.index === toIndex);
    updated.splice(insertIdx, 0, moved);

    this.items = updated;
    this.setOrder(this.items);
  }

  setDragOver(id: number | null) {
    this.dragOverId = id;
  }
}

const store = new TableStore();
export default store;
