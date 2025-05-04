import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

let state = {
  selected: [],
  order: [], // Массив объектов: { index, id }
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i + 1, index: i }));
}

const items = generateItems(1_000_000);

// Инициализация порядка
if (state.order.length === 0) {
  state.order = items.map(({ index, id }) => ({ index, id }));
}

app.get('/items', (req, res) => {
  const offset = parseInt(req.query.offset || '0', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const search = state.search;

  let filtered = state.order;

  if (search) {
    filtered = filtered.filter(({ id }) => id.toString().includes(search));
  }

  const total = filtered.length;
  const pagedItems = filtered.slice(offset, offset + limit);

  res.json({
    items: pagedItems,
    total,
    selected: state.selected,
    search: state.search,
  });
});

app.post('/search', (req, res) => {
  state.search = req.body.search || '';
  res.sendStatus(200);
});

app.post('/select', (req, res) => {
  state.selected = req.body.selected || [];
  res.sendStatus(200);
});

app.post('/move', (req, res) => {
  const { fromId, toId, position } = req.body;

  if (
    typeof fromId !== 'number' ||
    typeof toId !== 'number' ||
    !['before', 'after'].includes(position)
  ) {
    return res.status(400).send('Invalid move payload');
  }

  // Находим индекс элемента по fromId и toId
  const fromIdx = state.order.findIndex(item => item.id === fromId);
  const toIdx = state.order.findIndex(item => item.id === toId);

  if (fromIdx === -1 || toIdx === -1) {
    return res.status(400).send('IDs not found');
  }

  // Определяем границы диапазона, который нужно сдвинуть
  let start = Math.min(fromIdx, toIdx);
  let end = Math.max(fromIdx, toIdx);

  const subrange = state.order.slice(start, end + 1); // Включительно
  const ids = subrange.map(item => item.id);

  if (fromIdx < toIdx) {
    // Сдвиг вниз
    const movedId = ids.shift(); // удалить fromId
    const insertPos = position === 'before' ? toIdx - start : toIdx - start + 1;
    ids.splice(insertPos, 0, movedId);
  } else {
    // Сдвиг вверх
    const movedId = ids.splice(fromIdx - start, 1)[0]; // удалить fromId
    const insertPos = position === 'before' ? toIdx - start : toIdx - start + 1;
    ids.splice(insertPos, 0, movedId);
  }

  // Применяем новую последовательность id в order
  ids.forEach((id, i) => {
    state.order[start + i].id = id;
  });

  res.sendStatus(200);
});

app.post('/order', (req, res) => {
  const updated = req.body.order;

  if (!Array.isArray(updated)) {
    return res.status(400).send('Invalid order payload');
  }

  for (const item of updated) {
    if (
      typeof item !== 'object' ||
      typeof item.index !== 'number' ||
      typeof item.id !== 'number'
    ) {
      return res.status(400).send('Invalid item format');
    }
  }

  // Применяем переданный порядок: только обновляем `id` по `index`
  for (const { index, id } of updated) {
    const entry = state.order.find(o => o.index === index);
    if (entry) {
      entry.id = id;
    }
  }

  res.sendStatus(200);
});

app.get('/order', (req, res) => {
  res.json(state.order);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
