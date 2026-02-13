import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalyzeRequest {
  width: string;
  height: string;
  unit: string;
  frameStyle: string;
  matOption: string;
}

// Analyze artwork and generate optimal environment prompt
router.post('/analyze-artwork', upload.single('artwork'), async (req: Request, res: Response) => {
  try {
    const { width, height, unit, frameStyle, matOption } = req.body as AnalyzeRequest;
    const filePath = req.file?.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No artwork file provided' });
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file?.mimetype || 'image/jpeg';

    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior designer, art curator, and photographer specializing in artwork presentation. Your task is to analyze an uploaded artwork and recommend the ideal environment, framing, and lighting for a photorealistic mockup.

Consider:
1. The artwork's dominant colors, temperature, and contrast
2. The style (abstract, realism, photography, illustration, etc.)
3. The mood and emotional tone
4. The size (${width}×${height} ${unit}) and how it relates to room scale
5. Current frame choice: ${frameStyle}, mat: ${matOption}

Respond in JSON format:
{
  "analysis": {
    "dominantColors": ["#hex1", "#hex2", "#hex3"],
    "colorTemperature": "warm|cool|neutral",
    "style": "abstract|realism|photography|illustration|mixed-media|...",
    "mood": "string describing the mood",
    "contrast": "high|medium|low"
  },
  "recommendation": {
    "environmentType": "living-room|gallery|office|etc",
    "wallColor": "specific color recommendation",
    "lighting": "lighting description",
    "suggestedFrame": "frame style if current choice could be improved",
    "reasoning": "2-3 sentences explaining why"
  },
  "generationPrompt": "A detailed, specific prompt for generating the environment image. This should be a photorealistic interior scene description, 2-3 sentences, emphasizing the wall where the artwork will hang, the lighting, furniture, and atmosphere. Do NOT mention the artwork itself — just the environment.",
  "alternativePrompts": [
    "alternative prompt 1 for a different mood/setting",
    "alternative prompt 2 for a contrasting option"
  ]
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            },
            {
              type: 'text',
              text: `Analyze this artwork (${width}×${height} ${unit}) and provide the optimal mockup environment.`
            }
          ]
        }
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(analysisResponse.choices[0].message.content || '{}');
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json(result);
  } catch (error: any) {
    console.error('AI analysis error:', error);
    
    // Cleanup on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Generate environment image using DALL-E 3
router.post('/generate-environment', async (req: Request, res: Response) => {
  try {
    const { prompt, width, height, unit } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Determine orientation for DALL-E
    const isLandscape = width > height;
    const isSquare = Math.abs(width - height) < 2;
    const size = isSquare ? '1024x1024' : isLandscape ? '1792x1024' : '1024x1792';

    const enhancedPrompt = `Photorealistic interior photograph, professional architectural photography, ${prompt}. The wall prominently features a blank rectangular space where artwork would hang, clearly visible and well-lit. Shot on Phase One IQ4, 35mm lens, f/8, natural and artificial lighting blend. Ultra high quality, 8K detail.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: size as any,
      quality: 'hd',
      style: 'natural',
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      return res.status(500).json({ error: 'Failed to generate image - no URL returned' });
    }

    res.json({
      imageUrl,
      revisedPrompt: revisedPrompt || enhancedPrompt,
    });
  } catch (error: any) {
    console.error('Environment generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as aiRouter };