const express = require('express');
require('dotenv').config();

const app = express();

app.use('/', express.static('../build'));

const path =  process.env.NODE_ENV === 'development' ? 'http://localhost:3001/' : 'https://scouting-kohl.vercel.app/';

app.listen(path, () => {
    console.log('Server running at ' + path);
})
