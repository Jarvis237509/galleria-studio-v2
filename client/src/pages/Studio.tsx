import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2, Download, RefreshCw, Sparkles, Wand2, Globe } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import ArtworkUpload from '../components/ArtworkUpload';
import DimensionsPanel from '../components/DimensionsPanel';
import FrameSelector from '../components/FrameSelector';
import TemplateGallery from '../components/TemplateGallery';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
const USER_ID = 'demo-user';
const STEPS = ['Upload', 'Size & Frame', 'Environment', 'Generate'];

export default function Studio() {
  const [step, setStep] = useState(0);
  const store = useStudioStore();

  const canAdvance = () => {
    switch (step) {
      case 0: return !!store.artworkPreview;
      case 1: return store.artworkDimensions.width > 0 && store.artworkDimensions.height > 0;
      case 2: 
        // Check based on environment mode
        if (store.environmentMode === 'preset') return !!store.selectedTemplate;
        if (store.environmentMode === 'ai-auto') return true; // AI will generate
        if (store.environmentMode === 'ai-prompt') return !!store.aiGeneratedEnvironment;
        return store.useAiSuggestion || !!store.selectedTemplate;
      default: return true;
    }
  };

  const handleGenerate = async () => {
    if (!store.artworkFile) return;
    
    store.setIsGenerating(true);
    store.setGenerationProgress(0);

    try {
      let environmentPrompt = '';
      let environmentImageUrl = '';

      // Determine environment source
      if (store.environmentMode === 'ai-auto' || store.useAiSuggestion) {
        // AI auto-match: analyze artwork and generate environment
        store.setGenerationProgress(15);
        toast('Analyzing your artwork...', { icon: '🔍' });

        const analysisForm = new FormData();
        analysisForm.append('artwork', store.artworkFile);
        analysisForm.append('width', String(store.artworkDimensions.width));
        analysisForm.append('height', String(store.artworkDimensions.height));
        analysisForm.append('unit', store.artworkDimensions.unit);
        analysisForm.append('frameStyle', store.frameStyle);
        analysisForm.append('matOption', store.matOption);

        const analysis = await axios.post(`${API_URL}/api/ai/analyze-artwork`, analysisForm);
        environmentPrompt = analysis.data.generationPrompt;
        store.setAiPrompt(environmentPrompt);
        store.setGenerationProgress(35);
      } else if (store.environmentMode === 'ai-prompt' && store.aiGeneratedEnvironment) {
        // User generated a custom environment — use the image URL
        environmentImageUrl = `${API_URL}${store.aiGeneratedEnvironment.imageUrl}`;
        store.setGenerationProgress(50);
        // Track usage
        axios.post(`${API_URL}/api/ai/environments/saved/${store.aiGeneratedEnvironment.id}/use`).catch(() => {});
      } else if (store.selectedTemplate) {
        // Preset template
        environmentPrompt = store.selectedTemplate.prompt;
      }

      // Generate environment image if we don't already have one
      if (!environmentImageUrl && environmentPrompt) {
        toast('Generating environment...', { icon: '🎨' });
        store.setGenerationProgress(50);

        const envResponse = await axios.post(`${API_URL}/api/ai/generate-environment`, {
          prompt: environmentPrompt,
          width: store.artworkDimensions.width,
          height: store.artworkDimensions.height,
          unit: store.artworkDimensions.unit,
        });

        environmentImageUrl = envResponse.data.imageUrl;
      }

      store.setGenerationProgress(75);
      toast('Compositing mockup...', { icon: '🖼️' });

      // Build composite request - pass environment URL directly
      const compositeForm = new FormData();
      compositeForm.append('artwork', store.artworkFile);
      compositeForm.append('environmentUrl', environmentImageUrl);
      compositeForm.append('width', String(store.artworkDimensions.width));
      compositeForm.append('height', String(store.artworkDimensions.height));
      compositeForm.append('unit', store.artworkDimensions.unit);
      compositeForm.append('matOption', store.matOption);
      compositeForm.append('matWidth', String(store.matWidth));

      // Determine frame source
      if (store.frameMode === 'ai-generate' && store.aiGeneratedFrame) {
        // AI-generated frame: pass the frame image URL and metadata
        compositeForm.append('frameStyle', 'ai-generated');
        compositeForm.append('aiFrameImageUrl', `${API_URL}${store.aiGeneratedFrame.imageUrl}`);
        compositeForm.append('aiFrameBorderWidth', String(store.aiGeneratedFrame.borderWidth));
        // Track usage
        axios.post(`${API_URL}/api/ai/frames/saved/${store.aiGeneratedFrame.id}/use`).catch(() => {});
      } else {
        compositeForm.append('frameStyle', store.frameStyle);
      }

      const result = await axios.post(`${API_URL}/api/generate/composite`, compositeForm);

      store.setGenerationProgress(100);
      store.setGeneratedMockup(`${API_URL}${result.data.mockupUrl}`);
      
      toast.success('Mockup generated!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Generation failed');
    } finally {
      store.setIsGenerating(false);
    }
  };

  // Get display info for summary
  const getFrameDisplay = () => {
    if (store.frameMode === 'ai-generate' && store.aiGeneratedFrame) {
      return { icon: <Wand2 className="w-3 h-3" />, text: store.aiGeneratedFrame.name };
    }
    return { icon: null, text: store.frameStyle.replace(/-/g, ' ') };
  };

  const getEnvironmentDisplay = () => {
    if (store.environmentMode === 'ai-auto' || store.useAiSuggestion) {
      return { icon: <Sparkles className="w-3 h-3" />, text: 'AI Selected' };
    }
    if (store.environmentMode === 'ai-prompt' && store.aiGeneratedEnvironment) {
      return { icon: <Globe className="w-3 h-3" />, text: store.aiGeneratedEnvironment.name };
    }
    return { icon: null, text: store.selectedTemplate?.name || 'None' };
  };

  const frameDisplay = getFrameDisplay();
  const envDisplay = getEnvironmentDisplay();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl text-gallery-100">Create Mockup</h1>
          <p className="text-gallery-500 mt-1">Transform your artwork into stunning environment mockups</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                  i === step
                    ? 'bg-accent-gold/10 border border-accent-gold/30 text-accent-gold font-medium'
                    : i < step
                    ? 'bg-white/5 border border-white/10 text-gallery-300 cursor-pointer hover:bg-white/10'
                    : 'bg-white/[0.02] border border-white/5 text-gallery-600'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                  i === step
                    ? 'bg-accent-gold text-gallery-950'
                    : i < step
                    ? 'bg-gallery-600 text-gallery-200'
                    : 'bg-white/5 text-gallery-600'
                }`}>
                  {i < step ? '✓' : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gallery-700" />
              )}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div className="glass-panel p-6">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <ArtworkUpload />
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <DimensionsPanel />
                  <div className="border-t border-white/5 pt-6">
                    <FrameSelector />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <TemplateGallery />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <h2 className="font-display text-xl text-gallery-100">Summary</h2>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gallery-400">Artwork</span>
                      <span className="text-gallery-200">{store.artworkFile?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gallery-400">Size</span>
                      <span className="text-gallery-200">
                        {store.artworkDimensions.width}×{store.artworkDimensions.height} {store.artworkDimensions.unit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gallery-400">Frame</span>
                      <span className="text-gallery-200 capitalize flex items-center gap-1.5">
                        {frameDisplay.icon}
                        {frameDisplay.text}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gallery-400">Mat</span>
                      <span className="text-gallery-200 capitalize">
                        {store.matOption}
                        {store.matOption !== 'none' ? ` (${store.matWidth}")` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-gallery-400">Environment</span>
                      <span className="text-gallery-200 flex items-center gap-1.5">
                        {envDisplay.icon}
                        {envDisplay.text}
                      </span>
                    </div>
                  </div>

                  {store.aiPrompt && (
                    <div className="glass-panel p-4 space-y-2">
                      <p className="text-xs text-gallery-500 uppercase tracking-wider">AI-Generated Prompt</p>
                      <p className="text-sm text-gallery-300 italic">{store.aiPrompt}</p>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={store.isGenerating}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg disabled:opacity-50"
                  >
                    {store.isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating... {store.generationProgress}%
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Mockup
                      </>
                    )}
                  </button>

                  {store.isGenerating && (
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent-gold to-accent-copper rounded-full"
                        animate={{ width: `${store.generationProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="btn-ghost flex items-center gap-2 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              
              {step < 3 && (
                <button
                  onClick={() => setStep(Math.min(3, step + 1))}
                  disabled={!canAdvance()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Preview / Result */}
          <div className="glass-panel p-6 flex flex-col items-center justify-center min-h-[500px]">
            <AnimatePresence mode="wait">
              {store.generatedMockup ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 w-full"
                >
                  <img
                    src={store.generatedMockup}
                    alt="Generated mockup"
                    className="w-full rounded-xl shadow-2xl"
                  />
                  <div className="flex gap-3">
                    <a
                      href={store.generatedMockup}
                      download="galleria-mockup.jpg"
                      className="btn-primary flex-1 text-center flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <button
                      onClick={handleGenerate}
                      className="btn-ghost flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  </div>
                </motion.div>
              ) : store.artworkPreview ? (
                <motion.div
                  key="artwork-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4"
                >
                  <img
                    src={store.artworkPreview}
                    alt="Artwork"
                    className="max-h-[400px] mx-auto rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-gallery-500">
                    {store.artworkDimensions.width}×{store.artworkDimensions.height} {store.artworkDimensions.unit}
                    {store.frameStyle !== 'none' && ` · ${store.frameStyle.replace(/-/g, ' ')}`}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4"
                >
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-white/5 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-gallery-700" />
                  </div>
                  <div>
                    <p className="text-gallery-400">Upload your artwork to begin</p>
                    <p className="text-sm text-gallery-600 mt-1">Your mockup preview will appear here</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}