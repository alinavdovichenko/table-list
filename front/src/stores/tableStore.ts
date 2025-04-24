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

  // Функция для подгрузки элементов с сервера
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
        this.offset = currentOffset + this.limit; // Обновляем offset
      });
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Обновление состояния выбранных элементов на сервере
  async updateSelection(selected: number[]) {
    try {
      this.selected = selected;
      await API.post('/select', { selected });
    } catch (error) {
      console.error("Ошибка при обновлении выбранных элементов:", error);
    }
  }

  // Обновление порядка элементов на сервере
  async updateOrder(order: number[]) {
    try {
      this.order = order;
      await API.post('/order', { order });
    } catch (error) {
      console.error("Ошибка при обновлении порядка элементов:", error);
    }
  }

  // Установка нового поискового запроса
  setSearch(search: string) {
    this.search = search;
    this.offset = 0; // Сбрасываем offset, если меняем запрос поиска
    this.fetchItems(true); // Загружаем элементы с новым поисковым запросом
  }

  // Добавление элемента в список выбранных
  selectItem(id: number) {
    if (!this.selected.includes(id)) {
      this.selected.push(id);
      this.updateSelection(this.selected); // Обновляем выбор на сервере
    }
  }

  // Удаление элемента из списка выбранных
  deselectItem(id: number) {
    this.selected = this.selected.filter(item => item !== id);
    this.updateSelection(this.selected); // Обновляем выбор на сервере
  }

  setOrder(newOrder: number[]) {
    this.items = newOrder;
    this.updateOrder(newOrder);
  }
}

const store = new TableStore();
export default store;
