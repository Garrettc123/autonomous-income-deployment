'use strict';

require('dotenv').config();

const express = require('express');
const webhookRouter = require('./webhook');

const app = express();
const PORT = process.env.PORT ?? 3001;

// Mount raw-body webhook handler BEFORE json middleware
app.use('/webhook', webhookRouter);

// JSON middleware for all other routes
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.info(`[revenue-handoff] Listening on port ${PORT}`);
});

module.exports = app;
