import API from '../api/api';
import { makeAutoObservable, runInAction } from 'mobx';

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

    this.isLoading = true;

    // Определение смещения для запроса
    const currentOffset = reset ? 0 : this.offset;

    try {
      const res = await API.get<ItemResponse>('/items', {
        params: {
          offset: currentOffset,
          limit: this.limit,
          search: this.search
        }
      });

      runInAction(() => {
        // Если выполняется сброс, перезаписываем элементы
        if (reset) {
          this.items = res.data.items;
        } else {
          this.items.push(...res.data.items);
        }

        // Обновляем другие состояния
        this.total = res.data.total;
        this.selected = res.data.selected;
        this.search = res.data.search;
        this.offset = currentOffset + this.limit;
      });
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async setSearch(search: string) {
    try {
      await API.post('/search', { search });
      runInAction(() => {
        this.offset = 0;
        this.items = [];
      });
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
      console.error('Ошибка при обновлении выбранных:', error);
    }
  }

  async resetAll() {
    try {
      await Promise.all([
        API.post('/order', {}),
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
    try {/*
      const fromIndex = this.items.findIndex(item => item.id === fromId);
      const toIndex = this.items.findIndex(item => item.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromId === toId) return;
  
      // 🧠 Копируем список и удаляем fromId
      const updatedItems = [...this.items];
      const [movedItem] = updatedItems.splice(fromIndex, 1);
  
      // 🔢 Определяем индекс вставки
      const insertIndex =
        position === 'before'
          ? (fromIndex < toIndex ? toIndex - 1 : toIndex)
          : (fromIndex < toIndex ? toIndex : toIndex + 1);
  
      updatedItems.splice(insertIndex, 0, movedItem);

      runInAction(() => {
        this.items = updatedItems;
      });*/

      await this.setOrder(fromId, toId, position);
      await this.fetchItems(true);
    } catch (error) {
      console.error('Ошибка при локальном перемещении:', error);
    }
  }

  async setOrder(fromId: number, toId: number, position: 'before' | 'after') {
    if (!fromId || !toId) {
      console.error('Один из элементов не найден для сохранения порядка');
      return;
    }
    try {
      await API.post('/order', { fromId: fromId, toId: toId, position });
    } catch (error) {
      console.error('Ошибка при сохранении порядка:', error);
    }
  }  
}

const store = new TableStore();
export default store;