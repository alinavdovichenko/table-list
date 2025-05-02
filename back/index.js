import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let state = {
  selected: [],
  order: [], // [{ index, id }]
  search: ''
};

function generateItems(size) {
  return Array.from({ length: size }, (_, i) => ({ index: i, id: i }));
}

const items = generateItems(1_000_000);

app.get('/items', (req, res) => {
  const { offset = 0, limit = 20 } = req.query;
  const search = state.search;

  let filtered = items;
  if (search) {
    filtered = filtered.filter(({ id }) => id.toString().includes(search));
  }

  let ordered;
  if (state.order.length) {
    const orderMap = new Map(state.order.map(entry => [entry.index, entry.id]));
    ordered = filtered.map(({ index, id }) => ({
      index,
      id: orderMap.has(index) ? orderMap.get(index) : id
    }));
  } else {
    ordered = filtered;
  }

  const paged = ordered.slice(Number(offset), Number(offset) + Number(limit));

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
    state.order = newOrder;
  }
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
