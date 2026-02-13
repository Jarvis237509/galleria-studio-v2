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

// Analyze artwork and suggest environment prompt
router.post('/analyze-artwork', async (req: Request, res: Response) => {
  try {
    // req.body contains: artwork dimensions, frame style, mat option
    const { width, height, unit, frameStyle, matOption } = req.body;

    const analysisResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior designer and art curator. Analyze artwork specifications and create a matching environment description.

The environment should:
1. Feature a clean wall straight-on where artwork can be hung (center of image)
2. Have appropriate room context (furniture, decor) that matches the frame style
3. Use lighting and colors that complement the frame

Respond in JSON:
{
  "roomType": "living room|bedroom|gallery|office|etc",
  "styleVibe": "modern|minimalist|cozy|luxury|industrial",
  "colorPalette": "warm neutrals|cool tones|etc",
  "lighting": "natural light from left|soft ambient|spotlight|etc",
  "generationPrompt": "Complete DALL-E prompt for the environment. MUST specify: straight-on camera view facing wall, centered perspective, photorealistic interior suitable for hanging artwork"
}`
        },
        {
          role: 'user',
          content: `Create an environment for artwork sized ${width}x${height} ${unit}, with ${frameStyle} frame and ${matOption} mat option.`
        }
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');
    
    res.json(analysis);
  } catch (error: any) {
    console.error('Artwork analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate environment from text prompt
router.post('/generate-environment', async (req: Request, res: Response) => {
  try {
    const { prompt, userId, artworkWidth, artworkHeight, unit } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Step 1: Use GPT-4o to refine the environment prompt
    const refinementResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert interior photographer and 3D artist. Create a detailed prompt for generating a photorealistic room environment suitable for hanging artwork.

CRITICAL REQUIREMENTS for the DALL-E prompt:
- Camera: Straight-on view, directly facing the main wall (90 degree angle, flat perspective)
- Wall: Clean, well-lit main wall in the CENTER of the image where artwork will hang
- Room: Full room context visible but the wall is the focus
- Style: Photorealistic interior photography, 8K quality
- Lighting: Natural and appropriate for artwork display
- NO artwork on the wall - it should be empty/blank for the user to add their own

Respond ONLY with the refined DALL-E prompt text (no JSON, no extra commentary).`
        },
        {
          role: 'user',
          content: `Create an environment based on: "${prompt}". The artwork to be hung is ${artworkWidth}x${artworkHeight} ${unit}.`
        }
      ],
      max_tokens: 500,
    });

    const refinedPrompt = refinementResponse.choices[0].message.content || prompt;

    // Step 2: Generate the environment image with DALL-E 3
    const dalleResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `${refinedPrompt}. The camera looks straight-on at the wall (90 degrees, flat perspective). The main wall is centered in the composition, empty and ready for artwork. Photorealistic interior photography, 8K, professional lighting.`,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural',
    });

    if (!dalleResponse.data || dalleResponse.data.length === 0) {
      throw new Error('DALL-E returned no image data');
    }
    const generatedImageUrl = dalleResponse.data[0].url;
    if (!generatedImageUrl) {
      throw new Error('DALL-E returned no image URL');
    }

    // Step 3: Download and process the image
    const imageResponse = await fetch(generatedImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const envsDir = path.join(process.cwd(), 'public', 'environments');
    fs.mkdirSync(envsDir, { recursive: true });

    const envId = uuid();
    const filename = `${envId}.png`;
    const thumbFilename = `${envId}-thumb.png`;

    // Save full-size
    await sharp(imageBuffer)
      .resize(2048, 2048, { fit: 'inside' })
      .png()
      .toFile(path.join(envsDir, filename));

    // Generate thumbnail
    await sharp(imageBuffer)
      .resize(512, 512, { fit: 'inside' })
      .png()
      .toFile(path.join(envsDir, thumbFilename));

    const imageUrl = `/environments/${filename}`;
    const thumbnailUrl = `/environments/${thumbFilename}`;

    // Save to database if userId provided
    let savedEnvironment = null;
    if (userId) {
      const slug = `environment-${Date.now()}-${envId.slice(0, 6)}`;
      
      savedEnvironment = await prisma.savedEnvironment.create({
        data: {
          id: envId,
          userId,
          name: `${prompt.slice(0, 30)}...`,
          slug,
          prompt,
          imageUrl,
          thumbnailUrl,
          tags: [],
          description: `${prompt.slice(0, 100)}...`,
        },
      });
    }

    res.json({
      environment: savedEnvironment,
      imageUrl,
      thumbnailUrl,
      generatedImageUrl,
    });

  } catch (error: any) {
    console.error('Environment generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user's saved environments
router.get('/saved/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20', search } = req.query;

    const where: any = { userId };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
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

// Delete a saved environment
router.delete('/saved/:envId', async (req: Request, res: Response) => {
  try {
    const { envId } = req.params;
    const { userId } = req.body;

    await prisma.savedEnvironment.deleteMany({
      where: { id: envId, userId }
    });

    // Delete files
    const envsDir = path.join(process.cwd(), 'public', 'environments');
    ['.png', '-thumb.png'].forEach(ext => {
      const filePath = path.join(envsDir, `${envId}${ext}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Increment usage count
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