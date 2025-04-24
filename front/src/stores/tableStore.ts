import { makeAutoObservable, runInAction } from 'mobx';
import API from '../api/api';

interface ItemResponse {
  items: number[];
  total: number;
  selected: number[];
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

  constructor() {
    makeAutoObservable(this);
  }

  async fetchItems(reset = false) {
    if (this.isLoading) return;
    if (!reset && this.items.length >= this.total) return; // ✅ Проверка на завершение загрузки

    this.isLoading = true;
    const currentOffset = reset ? 0 : this.offset;

    try {
      const res = await API.get<ItemResponse>('/items', {
        params: {
          offset: currentOffset,
          limit: this.limit,
          search: this.search,
        },
      });

      runInAction(() => {
        if (reset) {
          this.items = res.data.items;
        } else {
          this.items.push(...res.data.items);
        }

        this.total = res.data.total;
        this.selected = res.data.selected;
        this.offset = currentOffset + this.limit;
      });
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async updateSelection(selected: number[]) {
    try {
      this.selected = selected;
      await API.post('/select', { selected });
    } catch (error) {
      console.error('Ошибка при обновлении выбранных элементов:', error);
    }
  }

  async updateOrder(order: number[]) {
    try {
      this.order = order;
      await API.post('/order', { order });
    } catch (error) {
      console.error('Ошибка при обновлении порядка элементов:', error);
    }
  }

  setSearch(search: string) {
    this.search = search;
    this.offset = 0;
    this.fetchItems(true);
  }

  selectItem(id: number) {
    if (!this.selected.includes(id)) {
      this.selected.push(id);
      this.updateSelection(this.selected);
    }
  }

  deselectItem(id: number) {
    this.selected = this.selected.filter((item) => item !== id);
    this.updateSelection(this.selected);
  }

  setOrder(newOrder: number[]) {
    this.items = newOrder;
    this.updateOrder(newOrder);
  }
}

const store = new TableStore();
export default store;
