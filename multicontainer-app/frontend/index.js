const express = require('express');
const request = require('request');
const app = express();

app.get('/', (_req, res) => {
    res.send('This is the frontend root\n');
});

app.listen(80, () => {
    console.log('Started frontend');
});
