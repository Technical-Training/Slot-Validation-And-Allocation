const express = require('express');
const path = require('path');

const app = express();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'public', '404.html'))
});

app.listen(8080, (err) => {
  console.log('started');
});