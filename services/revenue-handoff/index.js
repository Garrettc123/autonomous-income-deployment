'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const { getApiKeySalt } = require('./secrets-manager');
const webhookRouter = require('./webhook');

// Resolve (and auto-generate if needed) the API key salt at startup
getApiKeySalt();

const app = express();
const PORT = process.env.PORT ?? 3001;

// Security headers
app.use(helmet());

// Mount raw-body webhook handler BEFORE json middleware
app.use('/webhook', webhookRouter);

// JSON middleware for all other routes – cap at 100 kb to limit request-size attacks
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Reject unknown routes explicitly instead of falling through
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.info(`[revenue-handoff] Listening on port ${PORT}`);
});

module.exports = app;
