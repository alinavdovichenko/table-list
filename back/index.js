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

  // Переиндексация
  const reindexed = ordered.map((item, i) => ({ index: i, id: item.id }));
  const paged = reindexed.slice(offset, offset + limit);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
