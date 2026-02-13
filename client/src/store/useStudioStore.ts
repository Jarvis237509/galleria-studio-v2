import { create } from 'zustand';

export type FrameStyle = 'none' | 'thin-black' | 'thin-white' | 'classic-gold' | 'classic-silver' | 'ornate-gold' | 'ornate-dark' | 'natural-oak' | 'natural-walnut' | 'natural-maple' | 'floating-white' | 'floating-black' | 'shadow-box' | 'canvas-wrap';
export type MatOption = 'none' | 'white' | 'cream' | 'black' | 'grey';
export type EnvironmentCategory = 'living-room' | 'bedroom' | 'office' | 'gallery' | 'cafe' | 'restaurant' | 'hotel' | 'retail' | 'hallway' | 'outdoor' | 'ai-suggested';

export interface ArtworkDimensions {
  width: number;
  height: number;
  unit: 'in' | 'cm';
}

export interface TemplateConfig {
  id: string;
  name: string;
  category: EnvironmentCategory;
  thumbnail: string;
  prompt: string;
  wallColor?: string;
  lighting?: string;
}

interface StudioState {
  // Artwork
  artworkFile: File | null;
  artworkPreview: string | null;
  artworkDimensions: ArtworkDimensions;
  // Frame
  frameStyle: FrameStyle;
  matOption: MatOption;
  matWidth: number; // in inches
  // Environment
  selectedTemplate: TemplateConfig | null;
  environmentCategory: EnvironmentCategory | null;
  useAiSuggestion: boolean;
  aiPrompt: string | null;
  // Output
  generatedMockup: string | null;
  isGenerating: boolean;
  generationProgress: number;
  // Actions
  setArtwork: (file: File, preview: string) => void;
  setDimensions: (dims: Partial<ArtworkDimensions>) => void;
  setFrame: (style: FrameStyle) => void;
  setMat: (option: MatOption) => void;
  setMatWidth: (width: number) => void;
  setTemplate: (template: TemplateConfig) => void;
  setEnvironmentCategory: (cat: EnvironmentCategory) => void;
  setUseAi: (use: boolean) => void;
  setAiPrompt: (prompt: string) => void;
  setGeneratedMockup: (url: string) => void;
  setIsGenerating: (loading: boolean) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

const initialState = {
  artworkFile: null as File | null,
  artworkPreview: null as string | null,
  artworkDimensions: { width: 24, height: 36, unit: 'in' as const },
  frameStyle: 'none' as FrameStyle,
  matOption: 'none' as MatOption,
  matWidth: 2,
  selectedTemplate: null as TemplateConfig | null,
  environmentCategory: null as EnvironmentCategory | null,
  useAiSuggestion: false,
  aiPrompt: null as string | null,
  generatedMockup: null as string | null,
  isGenerating: false,
  generationProgress: 0,
};

export const useStudioStore = create<StudioState>((set) => ({
  ...initialState,
  setArtwork: (file, preview) => set({ artworkFile: file, artworkPreview: preview }),
  setDimensions: (dims) => set((s) => ({ artworkDimensions: { ...s.artworkDimensions, ...dims } })),
  setFrame: (style) => set({ frameStyle: style }),
  setMat: (option) => set({ matOption: option }),
  setMatWidth: (width) => set({ matWidth: width }),
  setTemplate: (template) => set({ selectedTemplate: template }),
  setEnvironmentCategory: (cat) => set({ environmentCategory: cat }),
  setUseAi: (use) => set({ useAiSuggestion: use }),
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),
  setGeneratedMockup: (url) => set({ generatedMockup: url }),
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  setProgress: (progress) => set({ generationProgress: progress }),
  reset: () => set(initialState),
}));