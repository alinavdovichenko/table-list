const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Временное хранилище
let state = {
  selected: [],
  order: [],
};

// Элементы (тестово от 1 до 1_000_000)
const items = Array.from({ length: 1_000_000 }, (_, i) => i + 1);

// Возврат порции данных
app.get('/items', (req, res) => {
  const { offset = 0, limit = 20, search = '' } = req.query;
  let filtered = items;

  if (search) {
    filtered = filtered.filter(i => i.toString().includes(search));
  }

  const ordered = state.order.length ? state.order : filtered;

  res.json({
    items: ordered.slice(Number(offset), Number(offset) + Number(limit)),
    total: filtered.length,
    selected: state.selected,
  });
});

// Сохранение выбора
app.post('/select', (req, res) => {
  state.selected = req.body.selected || [];
  res.sendStatus(200);
});

// Сохранение порядка
app.post('/order', (req, res) => {
  state.order = req.body.order || [];
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
