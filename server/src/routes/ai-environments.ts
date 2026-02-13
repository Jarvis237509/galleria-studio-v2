import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

// Generate AI environment from prompt
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, artworkWidth, artworkHeight, unit, artworkStyle, artworkMood, artworkColors } = req.body;
    
    if (!prompt || !userId) {
      return res.status(400).json({ error: 'Prompt and userId are required' });
    }

    // Step 1: GPT-4o refines the environment prompt and extracts metadata
    const refinementResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior designer and architectural photographer. The user wants to generate a custom interior environment for displaying artwork. Create a detailed, photorealistic environment description.

CRITICAL REQUIREMENTS for the DALL-E prompt:
- The scene must have a prominent, well-lit wall area where artwork can be composited later
- The wall area should be relatively flat and unobstructed
- Include realistic furniture, decor, and architectural details
- Specify lighting conditions precisely
- Do NOT include any artwork, paintings, or frames on the walls — leave the display wall blank
- Describe the scene as if shot by a professional architectural photographer

${artworkStyle ? `The artwork is ${artworkStyle} style.` : ''}
${artworkMood ? `The artwork mood is ${artworkMood}.` : ''}
${artworkColors ? `Dominant artwork colors: ${artworkColors}.` : ''}

Respond in JSON:
{
  "dallePrompt": "Detailed 2-3 sentence prompt for DALL-E 3. Photorealistic interior, specify wall, lighting, furniture, atmosphere. NO artwork on walls.",
  "name": "Short descriptive environment name (2-5 words)",
  "category": "living-room|bedroom|office|gallery|cafe|restaurant|hotel|retail|hallway|outdoor|studio|library|loft|penthouse",
  "wallColor": "specific wall color description",
  "lighting": "lighting description",
  "roomType": "specific room type",
  "mood": "mood/atmosphere description",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "orientation": "landscape|portrait|square",
  "complementaryColors": ["#hex1", "#hex2"]
}`
        },
        {
          role: 'user',
          content: `Create an interior environment for: "${prompt}". The artwork to display is ${artworkWidth}×${artworkHeight} ${unit}.`
        }
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const envSpec = JSON.parse(refinementResponse.choices[0].message.content || '{}');

    // Step 2: Determine image orientation from artwork
    const widthNum = parseFloat(artworkWidth);
    const heightNum = parseFloat(artworkHeight);
    const isLandscape = widthNum > heightNum;
    const isSquare = Math.abs(widthNum - heightNum) < 2;
    const size = isSquare ? '1024x1024' : isLandscape ? '1792x1024' : '1024x1792';

    // Step 3: Generate environment with DALL-E 3
    const dalleResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${envSpec.dallePrompt}. The wall where artwork would hang is prominently visible, well-lit, and completely blank — no paintings, frames, or decorations on it. Professional architectural photography, shot on Phase One IQ4 150MP, 24mm tilt-shift lens, f/11, perfectly balanced natural and artificial lighting. Ultra high quality, photorealistic, 8K detail.`,
      n: 1,
      size: size as any,
      quality: 'hd',
      style: 'natural',
    });

    // FIX: Handle potentially undefined data array
    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error('DALL-E returned no image data');
    }
    const generatedImageUrl = dalleResponse.data[0].url;
    if (!generatedImageUrl) {
      throw new Error('DALL-E returned no image URL');
    }

    // Step 4: Download, process, and store
    const imageResponse = await fetch(generatedImageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const envsDir = path.join(process.cwd(), 'public', 'environments');
    fs.mkdirSync(envsDir, { recursive: true });

    const envId = uuid();
    const filename = `${envId}.jpg`;
    const thumbFilename = `${envId}-thumb.jpg`;

    // Save full-size environment
    await sharp(imageBuffer)
      .jpeg({ quality: 95 })
      .toFile(path.join(envsDir, filename));

    // Generate thumbnail
    await sharp(imageBuffer)
      .resize(400, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(path.join(envsDir, thumbFilename));

    const imageUrl = `/environments/${filename}`;
    const thumbnailUrl = `/environments/${thumbFilename}`;

    // Step 5: Save to database
    const slug = envSpec.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + envId.slice(0, 6);

    const savedEnvironment = await prisma.savedEnvironment.create({
      data: {
        id: envId,
        userId,
        name: envSpec.name,
        slug,
        prompt,
        category: envSpec.category || 'custom',
        imageUrl,
        thumbnailUrl,
        wallColor: envSpec.wallColor,
        lighting: envSpec.lighting,
        roomType: envSpec.roomType,
        mood: envSpec.mood,
        tags: envSpec.tags || [],
      },
    });

    res.json({
      environment: savedEnvironment,
      metadata: envSpec,
      generatedImageUrl,
    });

  } catch (error: any) {
    console.error('AI environment generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate environment variations
router.post('/generate-variations', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, artworkWidth, artworkHeight, unit } = req.body;

    const variationsResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior designer. Generate 3 distinct environment variations based on the user's description. Each should feel meaningfully different — vary the room type, lighting mood, color palette, or architectural style.

Respond in JSON:
{
  "variations": [
    {
      "dallePrompt": "Detailed DALL-E prompt — photorealistic interior, blank wall for artwork, no frames/paintings on walls",
      "name": "Short name",
      "category": "room category",
      "mood": "mood description",
      "description": "One line on what makes this unique"
    },
    { ... },
    { ... }
  ]
}`
        },
        {
          role: 'user',
          content: `3 environment variations for: "${prompt}". Artwork: ${artworkWidth}×${artworkHeight} ${unit}.`
        }
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const specs = JSON.parse(variationsResponse.choices[0].message.content || '{}');

    const widthNum = parseFloat(artworkWidth);
    const heightNum = parseFloat(artworkHeight);
    const isSquare = Math.abs(widthNum - heightNum) < 2;
    const size = isSquare ? '1024x1024' : widthNum > heightNum ? '1792x1024' : '1024x1792';

    const imagePromises = specs.variations.map((v: any) =>
      openai.images.generate({
        model: 'dall-e-3',
        prompt: `${v.dallePrompt}. Blank wall for artwork display, no paintings or frames. Professional architectural photography, 8K, photorealistic.`,
        n: 1,
        size: size as any,
        quality: 'hd',
        style: 'natural',
      })
    );

    const imageResults = await Promise.all(imagePromises);

    const variations = specs.variations.map((v: any, i: number) => {
      const result = imageResults[i];
      if (!result.data || result.data.length === 0) {
        throw new Error(`DALL-E returned no image for variation: ${v.name}`);
      }
      return {
        ...v,
        imageUrl: result.data[0].url,
      };
    });

    res.json({ variations });

  } catch (error: any) {
    console.error('Environment variations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user's saved environments
router.get('/saved/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20', category, search } = req.query;

    const where: any = { userId };
    if (category) where.category = category as string;

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { mood: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    const [environments, total] = await Promise.all([
      prisma.savedEnvironment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.savedEnvironment.count({ where }),
    ]);

    res.json({
      environments,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Community environments
router.get('/community', async (req: Request, res: Response) => {
  try {
    const { category, sort = 'popular', limit = '20', page = '1' } = req.query;

    const where: any = { isPublic: true };
    if (category) where.category = category;

    const orderBy = sort === 'popular'
      ? { usageCount: 'desc' as const }
      : { createdAt: 'desc' as const };

    const environments = await prisma.savedEnvironment.findMany({
      where,
      orderBy,
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });

    res.json({ environments });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete
router.delete('/saved/:envId', async (req: Request, res: Response) => {
  try {
    const { envId } = req.params;
    const { userId } = req.body;

    await prisma.savedEnvironment.deleteMany({
      where: { id: envId, userId }
    });

    const envsDir = path.join(process.cwd(), 'public', 'environments');
    ['.jpg', '-thumb.jpg'].forEach(ext => {
      const filePath = path.join(envsDir, `${envId}${ext}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle visibility
router.patch('/saved/:envId/visibility', async (req: Request, res: Response) => {
  try {
    const { envId } = req.params;
    const { userId, isPublic } = req.body;

    const updated = await prisma.savedEnvironment.updateMany({
      where: { id: envId, userId },
      data: { isPublic },
    });

    res.json({ success: updated.count > 0 });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Increment usage
router.post('/saved/:envId/use', async (req: Request, res: Response) => {
  try {
    await prisma.savedEnvironment.update({
      where: { id: req.params.envId },
      data: { usageCount: { increment: 1 } },
    });

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as aiEnvironmentsRouter };