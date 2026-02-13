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

// Generate AI frame from a text prompt
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, artworkWidth, artworkHeight, unit } = req.body;
    
    if (!prompt || !userId) {
      return res.status(400).json({ error: 'Prompt and userId are required' });
    }

    // Step 1: Use GPT-4o to refine the frame prompt and extract metadata
    const refinementResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert picture frame designer and craftsman. The user wants to generate a custom AI picture frame. Your job is to:

1. Take their description and create a detailed, specific prompt for DALL-E 3 to generate a photorealistic picture frame
2. Extract structured metadata about the frame

The DALL-E prompt should describe ONLY the frame itself as a rectangular border/surround with a completely transparent or pure black empty center where the artwork goes. The frame should be shown head-on, flat, on a pure white background.

Respond in JSON:
{
  "dallePrompt": "Detailed prompt for generating the frame image. Must specify: head-on view, rectangular frame border, empty black/dark center for artwork, white background, photorealistic, product photography style",
  "name": "A short descriptive name for this frame (2-4 words)",
  "material": "primary material (gold, walnut, oak, metal, marble, acrylic, reclaimed-wood, etc.)",
  "cornerStyle": "mitered|rounded|ornate|carved|seamless",
  "colorPrimary": "#hex of the dominant color",
  "colorSecondary": "#hex of the secondary/accent color or null",
  "borderWidthSuggestion": "number in pixels (8 for thin, 12-16 for standard, 20-30 for thick, 40+ for ornate)",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "One sentence describing the frame for the gallery"
}`
        },
        {
          role: 'user',
          content: `Create a picture frame based on this description: "${prompt}". The frame is for artwork sized ${artworkWidth}×${artworkHeight} ${unit}.`
        }
      ],
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const frameSpec = JSON.parse(refinementResponse.choices[0].message.content || '{}');

    // Step 2: Generate the frame image with DALL-E 3
    const dalleResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${frameSpec.dallePrompt}. The frame must be shown perfectly head-on with no perspective distortion. The center of the frame is completely empty (solid black rectangle). The background outside the frame is pure white. Photorealistic product photography, studio lighting, 8K detail.`,
      n: 1,
      size: '1024x1024',
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

    // Step 3: Download, process, and store the frame image
    const imageResponse = await fetch(generatedImageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Create output directories
    const framesDir = path.join(process.cwd(), 'public', 'frames');
    fs.mkdirSync(framesDir, { recursive: true });

    const frameId = uuid();
    const filename = `${frameId}.png`;
    const thumbFilename = `${frameId}-thumb.png`;

    // Save full-size frame
    await sharp(imageBuffer)
      .resize(2048, 2048, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(framesDir, filename));

    // Generate thumbnail
    await sharp(imageBuffer)
      .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(framesDir, thumbFilename));

    const imageUrl = `/frames/${filename}`;
    const thumbnailUrl = `/frames/${thumbFilename}`;

    // Step 4: Save to database
    const slug = frameSpec.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + frameId.slice(0, 6);

    const savedFrame = await prisma.savedFrame.create({
      data: {
        id: frameId,
        userId,
        name: frameSpec.name,
        slug,
        prompt,
        style: 'ai-generated',
        imageUrl,
        thumbnailUrl,
        borderWidth: parseInt(frameSpec.borderWidthSuggestion) || 12,
        cornerStyle: frameSpec.cornerStyle || 'mitered',
        material: frameSpec.material,
        colorPrimary: frameSpec.colorPrimary,
        colorSecondary: frameSpec.colorSecondary,
        tags: frameSpec.tags || [],
      },
    });

    res.json({
      frame: savedFrame,
      metadata: frameSpec,
      generatedImageUrl,
    });

  } catch (error: any) {
    console.error('AI frame generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate frame variations (3 options from one prompt)
router.post('/generate-variations', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, artworkWidth, artworkHeight, unit } = req.body;

    const variationsResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert picture frame designer. Given a user's description, generate 3 distinct frame variations that interpret the request differently. Each should have a unique character.

Respond in JSON:
{
  "variations": [
    {
      "dallePrompt": "detailed DALL-E prompt for variation 1 — head-on frame, empty black center, white background",
      "name": "Short name",
      "material": "material",
      "description": "One line describing what makes this variation unique"
    },
    { ... },
    { ... }
  ]
}`
        },
        {
          role: 'user',
          content: `Create 3 frame variations for: "${prompt}". Artwork size: ${artworkWidth}×${artworkHeight} ${unit}.`
        }
      ],
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const specs = JSON.parse(variationsResponse.choices[0].message.content || '{}');

    // Generate all 3 images in parallel
    const imagePromises = specs.variations.map((v: any) =>
      openai.images.generate({
        model: 'dall-e-3',
        prompt: `${v.dallePrompt}. Head-on view, empty black center, pure white background, photorealistic, 8K.`,
        n: 1,
        size: '1024x1024',
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
    console.error('Frame variations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user's saved frames
router.get('/saved/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20', search } = req.query;

    const where: any = { userId };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { material: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ];
    }

    const [frames, total] = await Promise.all([
      prisma.savedFrame.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.savedFrame.count({ where }),
    ]);

    res.json({
      frames,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get community/public frames
router.get('/community', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', material, sort = 'popular' } = req.query;

    const where: any = { isPublic: true };
    if (material) where.material = material as string;

    const orderBy = sort === 'popular'
      ? { usageCount: 'desc' as const }
      : { createdAt: 'desc' as const };

    const frames = await prisma.savedFrame.findMany({
      where,
      orderBy,
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });

    res.json({ frames });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a saved frame
router.delete('/saved/:frameId', async (req: Request, res: Response) => {
  try {
    const { frameId } = req.params;
    const { userId } = req.body;

    await prisma.savedFrame.deleteMany({
      where: { id: frameId, userId }
    });

    // Delete files
    const framesDir = path.join(process.cwd(), 'public', 'frames');
    ['.png', '-thumb.png'].forEach(ext => {
      const filePath = path.join(framesDir, `${frameId}${ext}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle public visibility
router.patch('/saved/:frameId/visibility', async (req: Request, res: Response) => {
  try {
    const { frameId } = req.params;
    const { userId, isPublic } = req.body;

    const updated = await prisma.savedFrame.updateMany({
      where: { id: frameId, userId },
      data: { isPublic },
    });

    res.json({ success: updated.count > 0 });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Increment usage count when a frame is used in a mockup
router.post('/saved/:frameId/use', async (req: Request, res: Response) => {
  try {
    await prisma.savedFrame.update({
      where: { id: req.params.frameId },
      data: { usageCount: { increment: 1 } },
    });

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as aiFramesRouter };