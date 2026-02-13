import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

const router = Router();

// Helper: create frame border based on style
function getFrameConfig(style: string) {
  const configs: Record<string, { width: number; color: string; shadow: boolean; double: boolean }> = {
    'none': { width: 0, color: '#000', shadow: false, double: false },
    'thin-black': { width: 4, color: '#111111', shadow: true, double: false },
    'thin-white': { width: 4, color: '#f5f5f5', shadow: true, double: false },
    'classic-gold': { width: 12, color: '#b8860b', shadow: true, double: false },
    'classic-silver': { width: 12, color: '#c0c0c0', shadow: true, double: false },
    'ornate-gold': { width: 24, color: '#a67c00', shadow: true, double: true },
    'ornate-dark': { width: 24, color: '#2d2d2d', shadow: true, double: true },
    'natural-oak': { width: 16, color: '#c19a6b', shadow: true, double: false },
    'natural-walnut': { width: 16, color: '#5c3317', shadow: true, double: false },
    'natural-maple': { width: 16, color: '#f2d2a9', shadow: true, double: false },
    'floating-white': { width: 3, color: '#f5f5f5', shadow: true, double: false },
    'floating-black': { width: 3, color: '#111111', shadow: true, double: false },
    'shadow-box': { width: 30, color: '#1a1a1a', shadow: true, double: false },
    'canvas-wrap': { width: 0, color: '#000', shadow: true, double: false },
  };
  return configs[style] || configs['none'];
}

function getMatColor(option: string): string {
  const colors: Record<string, string> = {
    'none': 'transparent',
    'white': '#ffffff',
    'cream': '#fdf6e3',
    'black': '#1a1a1a',
    'grey': '#9ca3af',
  };
  return colors[option] || 'transparent';
}

async function createFramedArtwork(
  artworkBuffer: Buffer,
  artW: number,
  artH: number,
  totalW: number,
  totalH: number,
  frameCfg: { width: number; color: string; shadow: boolean; double: boolean },
  matPx: number,
  matColor: string,
): Promise<Buffer> {
  const fw = frameCfg.width;

  // Create base canvas for the full framed piece
  const svg = `
<svg width="${totalW}" height="${totalH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="4" dy="6" stdDeviation="8" flood-opacity="0.4"/>
    </filter>
    <filter id="innerShadow">
      <feOffset dx="0" dy="2"/>
      <feGaussianBlur stdDeviation="3" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity=".2" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
  </defs>
  ${frameCfg.shadow ? `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${frameCfg.color}" rx="1" filter="url(#shadow)"/>` : ''}
  ${fw > 0 ? `<rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${frameCfg.color}" rx="1"/>` : ''}
  ${frameCfg.double && fw > 0 ? `<rect x="${fw/3}" y="${fw/3}" width="${totalW - fw*2/3}" height="${totalH - fw*2/3}" fill="none" stroke="${frameCfg.color === '#a67c00' ? '#d4a844' : '#555'}" stroke-width="1"/>` : ''}
  ${matPx > 0 ? `<rect x="${fw}" y="${fw}" width="${totalW - fw*2}" height="${totalH - fw*2}" fill="${matColor}"/>` : ''}
</svg>
  `;

  const svgBuffer = Buffer.from(svg);
  const result = await sharp(svgBuffer)
    .composite([
      {
        input: artworkBuffer,
        left: fw + matPx,
        top: fw + matPx,
      }
    ])
    .png()
    .toBuffer();

  return result;
}

// Configure multer for file uploads
const upload = multer({ 
  dest: path.join(__dirname, '..', '..', 'uploads') 
});

// Composite artwork onto environment using Sharp
router.post('/composite', upload.fields([
  { name: 'artwork', maxCount: 1 },
  { name: 'environment', maxCount: 1 },
]), async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const artworkFile = files?.artwork?.[0];
  const environmentFile = files?.environment?.[0];
  
  if (!artworkFile || !environmentFile) {
    return res.status(400).json({ error: 'Both artwork and environment images required' });
  }

  try {
    const { width, height, unit, frameStyle, matOption, matWidth, posX = 50, posY = 45, scale = 1 } = req.body;

    // Load environment image to get its dimensions
    const envMeta = await sharp(environmentFile.path).metadata();
    const envWidth = envMeta.width || 1920;
    const envHeight = envMeta.height || 1080;

    // Calculate artwork pixel size relative to environment
    // Assume a standard wall is ~120" wide for a 1920px image
    const pxPerInch = envWidth / 120;
    const artW = Math.round(parseFloat(width) * pxPerInch * parseFloat(scale as string));
    const artH = Math.round(parseFloat(height) * pxPerInch * parseFloat(scale as string));

    // Frame dimensions
    const frameCfg = getFrameConfig(frameStyle);
    const matPx = matOption !== 'none' ? Math.round(parseFloat(matWidth as string) * pxPerInch) : 0;
    const totalFrameW = frameCfg.width;
    const totalW = artW + (matPx * 2) + (totalFrameW * 2);
    const totalH = artH + (matPx * 2) + (totalFrameW * 2);

    // Resize artwork
    const resizedArtwork = await sharp(artworkFile.path)
      .resize(artW, artH, { fit: 'fill' })
      .toBuffer();

    // Create frame + mat as a composed image
    const frameBuffer = await createFramedArtwork(
      resizedArtwork,
      artW,
      artH,
      totalW,
      totalH,
      frameCfg,
      matPx,
      getMatColor(matOption)
    );

    // Position on environment
    const left = Math.round((parseFloat(posX as string) / 100) * envWidth - totalW / 2);
    const top = Math.round((parseFloat(posY as string) / 100) * envHeight - totalH / 2);

    // Composite
    const result = await sharp(environmentFile.path)
      .composite([
        {
          input: frameBuffer,
          left: Math.max(0, left),
          top: Math.max(0, top),
        }
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    const outputId = uuid();
    const outputPath = path.join(__dirname, '..', '..', 'outputs', `${outputId}.jpg`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result);

    // Clean up temp files
    fs.unlinkSync(artworkFile.path);
    fs.unlinkSync(environmentFile.path);

    res.json({
      mockupUrl: `/outputs/${outputId}.jpg`,
      dimensions: { totalW, totalH, artW, artH },
    });

  } catch (error: any) {
    console.error('Compositing error:', error);
    
    // Cleanup on error
    if (artworkFile?.path) {
      try { fs.unlinkSync(artworkFile.path); } catch {}
    }
    if (environmentFile?.path) {
      try { fs.unlinkSync(environmentFile.path); } catch {}
    }
    
    res.status(500).json({ error: error.message });
  }
});

export { router as generateRouter };