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

// NEW: AI Generated Frame Types
export interface AiGeneratedFrame {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  borderWidth: number;
  cornerStyle: string;
  material?: string;
  colorPrimary?: string;
  colorSecondary?: string;
  tags: string[];
  createdAt: string;
}

// NEW: AI Generated Environment Types  
export interface AiGeneratedEnvironment {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  wallColor?: string;
  lighting?: string;
  mood?: string;
  tags: string[];
  createdAt: string;
}

// NEW: Mode Types
export type FrameMode = 'preset' | 'ai-generate' | 'saved';
export type EnvironmentMode = 'preset' | 'ai-auto' | 'ai-prompt' | 'saved';

interface StudioState {
  // Artwork
  artworkFile: File | null;
  artworkPreview: string | null;
  artworkDimensions: ArtworkDimensions;
  // Frame
  frameStyle: FrameStyle;
  matOption: MatOption;
  matWidth: number;
  // Environment
  selectedTemplate: TemplateConfig | null;
  environmentCategory: EnvironmentCategory | null;
  useAiSuggestion: boolean;
  aiPrompt: string | null;
  // Output
  generatedMockup: string | null;
  isGenerating: boolean;
  generationProgress: number;
  // NEW: Frame Mode
  frameMode: FrameMode;
  aiFramePrompt: string;
  aiGeneratedFrame: AiGeneratedFrame | null;
  aiFrameVariations: AiGeneratedFrame[];
  savedFrames: AiGeneratedFrame[];
  isGeneratingFrame: boolean;
  // NEW: Environment Mode
  environmentMode: EnvironmentMode;
  aiEnvironmentPrompt: string;
  aiGeneratedEnvironment: AiGeneratedEnvironment | null;
  aiEnvironmentVariations: AiGeneratedEnvironment[];
  savedEnvironments: AiGeneratedEnvironment[];
  isGeneratingEnvironment: boolean;
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
  // NEW: Frame Mode Actions
  setFrameMode: (mode: FrameMode) => void;
  setAiFramePrompt: (prompt: string) => void;
  setAiGeneratedFrame: (frame: AiGeneratedFrame | null) => void;
  setAiFrameVariations: (variations: AiGeneratedFrame[]) => void;
  setSavedFrames: (frames: AiGeneratedFrame[]) => void;
  setIsGeneratingFrame: (loading: boolean) => void;
  // NEW: Environment Mode Actions
  setEnvironmentMode: (mode: EnvironmentMode) => void;
  setAiEnvironmentPrompt: (prompt: string) => void;
  setAiGeneratedEnvironment: (env: AiGeneratedEnvironment | null) => void;
  setAiEnvironmentVariations: (variations: AiGeneratedEnvironment[]) => void;
  setSavedEnvironments: (envs: AiGeneratedEnvironment[]) => void;
  setIsGeneratingEnvironment: (loading: boolean) => void;
  // Reset
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
  // NEW initial state
  frameMode: 'preset' as FrameMode,
  aiFramePrompt: '',
  aiGeneratedFrame: null as AiGeneratedFrame | null,
  aiFrameVariations: [] as AiGeneratedFrame[],
  savedFrames: [] as AiGeneratedFrame[],
  isGeneratingFrame: false,
  environmentMode: 'preset' as EnvironmentMode,
  aiEnvironmentPrompt: '',
  aiGeneratedEnvironment: null as AiGeneratedEnvironment | null,
  aiEnvironmentVariations: [] as AiGeneratedEnvironment[],
  savedEnvironments: [] as AiGeneratedEnvironment[],
  isGeneratingEnvironment: false,
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
  // NEW actions
  setFrameMode: (mode) => set({ frameMode: mode }),
  setAiFramePrompt: (prompt) => set({ aiFramePrompt: prompt }),
  setAiGeneratedFrame: (frame) => set({ aiGeneratedFrame: frame }),
  setAiFrameVariations: (variations) => set({ aiFrameVariations: variations }),
  setSavedFrames: (frames) => set({ savedFrames: frames }),
  setIsGeneratingFrame: (loading) => set({ isGeneratingFrame: loading }),
  setEnvironmentMode: (mode) => set({ environmentMode: mode }),
  setAiEnvironmentPrompt: (prompt) => set({ aiEnvironmentPrompt: prompt }),
  setAiGeneratedEnvironment: (env) => set({ aiGeneratedEnvironment: env }),
  setAiEnvironmentVariations: (variations) => set({ aiEnvironmentVariations: variations }),
  setSavedEnvironments: (envs) => set({ savedEnvironments: envs }),
  setIsGeneratingEnvironment: (loading) => set({ isGeneratingEnvironment: loading }),
  reset: () => set(initialState),
}));