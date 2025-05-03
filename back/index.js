import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let state = {
  selected: [],
  order: [],
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i }));
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

  let filtered = items;
  if (search) {
    filtered = filtered.filter(({ id }) => id.toString().includes(search));
  }

  // сортировка строго по state.order
  const orderMap = new Map(state.order.map(({ id }, index) => [id, index]));
  filtered.sort((a, b) => {
    const indexA = orderMap.get(a.id) ?? Infinity;
    const indexB = orderMap.get(b.id) ?? Infinity;
    return indexA - indexB;
  });

  const paged = filtered.slice(offset, offset + limit);

  res.json({
    items: paged,
    total: filtered.length,
    selected: state.selected,
    search: state.search
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
    console.warn('Invalid move payload:', req.body);
    return res.status(400).send('Invalid move payload');
  }

  const currentOrder = [...state.order];
  const fromIndex = currentOrder.findIndex(i => i.id === fromId);
  const toIndex = currentOrder.findIndex(i => i.id === toId);
  if (fromIndex === -1 || toIndex === -1) return res.sendStatus(400);

  const [moved] = currentOrder.splice(fromIndex, 1);

  const insertIndex =
    position === 'after'
      ? toIndex + (fromIndex < toIndex ? -1 : 1)
      : toIndex - (fromIndex < toIndex ? 0 : 1);

  currentOrder.splice(insertIndex, 0, moved);
  state.order = currentOrder;

  res.sendStatus(200);
});

app.post('/order', (req, res) => {
  const order = req.body.order;
  if (!Array.isArray(order)) {
    return res.status(400).send('Invalid order payload');
  }

  // Сброс порядка (например, начальный порядок)
  if (order.length === 0) {
    state.order = items.map(({ id }) => ({ id }));
  } else {
    state.order = order.map(id => ({ id }));
  }

  res.sendStatus(200);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
