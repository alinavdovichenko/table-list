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
  fullOrder: number[] = [];
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
        const map = new Map(this.items.map(item => [item.id, item]));
        fetched.forEach(item => map.set(item.id, item)); // обновим/добавим
      
        const merged = Array.from(map.values());
      
        const orderSet = new Set(this.fullOrder);
        this.items = merged
          .filter(item => orderSet.has(item.id))
          .sort((a, b) => this.fullOrder.indexOf(a.id) - this.fullOrder.indexOf(b.id));
      
        this.total = res.data.total;
        this.selected = res.data.selected;
        this.search = res.data.search;
        this.offset += this.limit;
      
        if (reset && this.search === '') {
          this.setFullOrder(this.items.map(item => item.id));
        }
      });
      
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async fetchFullOrder() {
    try {
      const res = await API.get<number[]>('/order');
      runInAction(() => {
        this.setFullOrder(res.data);
      });
    } catch (error) {
      console.error('Ошибка при загрузке полного порядка:', error);
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

      await Promise.all([
        this.fetchFullOrder(),
        this.fetchItems(true),
      ]);
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

      const visibleIds = this.items.map(i => i.id);
      const fullOrder = [...this.fullOrder];

      const visiblePositions = fullOrder
        .map((id, idx) => ({ id, idx }))
        .filter(entry => visibleIds.includes(entry.id));

      const currentVisibleOrder = visiblePositions.map(v => v.id);
      const fromIndex = currentVisibleOrder.indexOf(fromId);
      const toIndex = currentVisibleOrder.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const updatedVisibleOrder = [...currentVisibleOrder];
      const [movedId] = updatedVisibleOrder.splice(fromIndex, 1);
      const insertAt =
        position === 'before'
          ? fromIndex < toIndex ? toIndex - 1 : toIndex
          : fromIndex < toIndex ? toIndex : toIndex + 1;

      updatedVisibleOrder.splice(insertAt, 0, movedId);

      const newFullOrder = [...fullOrder];
      visiblePositions.forEach((entry, i) => {
        newFullOrder[entry.idx] = updatedVisibleOrder[i];
      });

      runInAction(() => {
        this.fullOrder = newFullOrder;

        const itemMap = new Map(this.items.map(item => [item.id, item]));
        this.items = newFullOrder
          .filter(id => visibleIds.includes(id))
          .map(id => itemMap.get(id)!)
          .filter(Boolean);
      });

      await this.setOrder(newFullOrder);
    } catch (error) {
      console.error('Ошибка при перемещении:', error);
    }
  }

  setFullOrder(order: number[]) {
    this.fullOrder = order;
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
