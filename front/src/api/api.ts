import axios from 'axios';

const API = axios.create({
  baseURL: 'https://table-list.onrender.com',
});

export default API;
