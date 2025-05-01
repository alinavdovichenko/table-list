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
  return Array.from({ length: size }, (_, i) => i + 1);
}

const items = generateItems(1_000_000);

app.get('/items', (req, res) => {
  const { offset = 0, limit = 20 } = req.query;
  const search = state.search;

  let filtered = items;
  if (search) {
    filtered = filtered.filter(i => i.toString().includes(search));
  }

  const ordered =
  state.order.length && filtered.some(i => state.order.includes(i))
    ? state.order.filter(i => filtered.includes(i))
    : filtered;
  const paged = ordered.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    items: paged,
    total: filtered.length,
    selected: state.selected,
    order: state.order,
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
  state.order = req.body.order || [];
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
