import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

let state = {
  selected: [],
  order: [],
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ id: i + 1, index: i }));
}

const items = generateItems(1_000_000);

// Инициализация порядка
if (state.order.length === 0) {
  state.order = items.map(({ id }) => id);
}

app.get('/items', (req, res) => {
  const offset = parseInt(req.query.offset || '0', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const search = state.search;

  if (state.order.length === 0) {
    state.order = items.map(({ id }) => id);
  }

  let filteredIds = state.order;
  if (search) {
    filteredIds = filteredIds.filter(id => id.toString().includes(search));
  }

  const total = filteredIds.length;
  const pagedIds = filteredIds.slice(offset, offset + limit);
  const pagedItems = pagedIds.map(id => {
    const original = items.find(i => i.id === id);
    return { id: id, index: original?.index ?? -1 };
  });

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
    console.warn('Invalid move payload:', req.body);
    return res.status(400).send('Invalid move payload');
  }

  const currentOrder = [...state.order];
  const fromIndex = currentOrder.indexOf(fromId);
  const toIndex = currentOrder.indexOf(toId);
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
  const updated = req.body.order;

  console.log('SET ORDER:', updated);

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

  const newOrder = [...state.order];
  for (const { index, id } of updated) {
    newOrder[index] = id;
  }

  state.order = newOrder;
  res.sendStatus(200);
});

app.get('/order', (req, res) => {
  res.json(state.order);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
