import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes';

export const app = express();

const origenesPermitidos = env.CORS_ORIGIN.split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(
  cors({
    origin: origenesPermitidos.includes('*') ? true : origenesPermitidos,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
