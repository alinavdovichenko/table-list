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
    // Reset to original order
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

  let start = Math.min(fromIdx, toIdx);
  let end = Math.max(fromIdx, toIdx);
  const subrange = state.order.slice(start, end + 1);
  const ids = subrange.map(item => item.id);

  if (fromIdx < toIdx) {
    const movedId = ids.shift();
    const insertPos = position === 'before' ? toIdx - start : toIdx - start + 1;
    ids.splice(insertPos, 0, movedId);
  } else {
    const movedId = ids.splice(fromIdx - start, 1)[0];
    const insertPos = position === 'before' ? toIdx - start : toIdx - start + 1;
    ids.splice(insertPos, 0, movedId);
  }

  ids.forEach((id, i) => {
    state.order[start + i].id = id;
  });

  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
