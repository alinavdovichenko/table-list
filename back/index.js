import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let state = {
  selected: [],
  order: [], // [{ id }]
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ index: i, id: i }));
}

const items = generateItems(1_000_000);

app.get('/items', (req, res) => {
  const offset = parseInt(req.query.offset || '0', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const search = state.search;

  let filtered = items;
  if (search) {
    filtered = filtered.filter(({ id }) => id.toString().includes(search));
  }

  let ordered = filtered;
  if (state.order.length) {
    const orderSet = new Set(state.order.map(o => o.id));
    const idToItem = new Map(filtered.map(i => [i.id, i]));

    const orderedPart = state.order
      .filter(({ id }) => idToItem.has(id))
      .map(({ id }) => idToItem.get(id))
      .filter(Boolean);

    const remainingPart = filtered.filter(({ id }) => !orderSet.has(id));
    ordered = [...orderedPart, ...remainingPart];
  }

  const paged = ordered.slice(offset, offset + limit);

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

app.post('/order', (req, res) => {
  const newOrder = req.body.order;
  if (Array.isArray(newOrder)) {
    state.order = newOrder.filter(
      (entry, i, arr) =>
        entry && typeof entry.id === 'number' &&
        arr.findIndex(e => e.id === entry.id) === i
    );
  }
  res.sendStatus(200);
});

app.post('/move', (req, res) => {
  const { fromId, toId, position } = req.body;
  if (typeof fromId !== 'number' || typeof toId !== 'number' || !['before', 'after'].includes(position)) {
    return res.status(400).send('Invalid move payload');
  }

  const currentOrder = state.order.length ? [...state.order] : items.map(({ id }) => ({ id }));

  const fromIndex = currentOrder.findIndex(i => i.id === fromId);
  const toIndex = currentOrder.findIndex(i => i.id === toId);
  if (fromIndex === -1 || toIndex === -1) return res.sendStatus(400);

  const [moved] = currentOrder.splice(fromIndex, 1);
  let insertIndex = toIndex;

  if (position === 'after' && fromIndex < toIndex) insertIndex = toIndex;
  else if (position === 'after') insertIndex = toIndex + 1;
  else if (position === 'before' && fromIndex < toIndex) insertIndex = toIndex - 1;

  currentOrder.splice(insertIndex, 0, moved);

  state.order = currentOrder;
  res.sendStatus(200);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
