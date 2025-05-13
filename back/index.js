import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

let state = {
  selected: [],
  order: [], // Массив объектов: { id }
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i + 1 }));
}

const items = generateItems(1_000_000);

// Инициализация порядка
if (state.order.length === 0) {
  state.order = items.map(({ id }) => ({ id }));
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

app.post('/order', (req, res) => {
  const { fromId, toId, position } = req.body;

  if (!fromId && !toId && !position) {
    state.order = items.map(({ id }) => ({ id }));
    return res.status(200).send('Order reset to initial');
  }

  if (
    typeof fromId !== 'number' ||
    typeof toId !== 'number' ||
    !['before', 'after'].includes(position)
  ) {
    return res.status(400).send('Invalid move payload');
  }

  const fromIdx = state.order.findIndex(item => item.id === fromId);
  const toIdx = state.order.findIndex(item => item.id === toId);

  if (fromIdx === -1 || toIdx === -1) {
    return res.status(400).send('IDs not found');
  }

  const [movedItem] = state.order.splice(fromIdx, 1);

  // Обновляем индекс после удаления
  let insertIdx = toIdx;
  if (fromIdx < toIdx) insertIdx--; // Сдвигаем на 1 влево, т.к. удалён элемент выше

  if (position === 'after') insertIdx += 1;

  state.order.splice(insertIdx, 0, movedItem);

  res.sendStatus(200);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
