import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generateRouter } from './routes/generate';
import { aiRouter } from './routes/ai';
import { aiFramesRouter } from './routes/ai-frames';
import { aiEnvironmentsRouter } from './routes/ai-environments';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
}));

app.use(express.json({ limit: '50mb' }));

// Ensure upload/output directories exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const outputsDir = path.join(__dirname, '..', 'outputs');
const framesDir = path.join(__dirname, '..', 'public', 'frames');
const envsDir = path.join(__dirname, '..', 'public', 'environments');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(envsDir, { recursive: true });

// Static files
app.use('/outputs', express.static(outputsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/frames', express.static(framesDir));
app.use('/environments', express.static(envsDir));

// Routes
app.use('/api/generate', generateRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai/frames', aiFramesRouter);
app.use('/api/ai/environments', aiEnvironmentsRouter);
app.use('/api/health', healthRouter);

// Simple health check (backward compat)
app.get('/health', (_req: Request, res: Response) => res.json({ 
  status: 'ok',
  timestamp: new Date().toISOString()
}));

app.listen(PORT, () => {
  console.log(`🎨 Galleria Studio API running on port ${PORT}`);
});