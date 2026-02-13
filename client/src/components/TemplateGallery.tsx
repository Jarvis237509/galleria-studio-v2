import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Wand2 } from 'lucide-react';
import { useStudioStore, EnvironmentCategory } from '../store/useStudioStore';
import { TEMPLATES, CATEGORIES } from '../data/templates';

export default function TemplateGallery() {
  const { 
    selectedTemplate, 
    setTemplate, 
    environmentCategory, 
    setEnvironmentCategory,
    useAiSuggestion,
    setUseAi,
  } = useStudioStore();
  
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = environmentCategory && environmentCategory !== 'ai-suggested'
    ? TEMPLATES.filter((t) => t.category === environmentCategory)
    : TEMPLATES;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-gallery-100">Environment</h2>
        <button
          onClick={() => setUseAi(!useAiSuggestion)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-300 ${
            useAiSuggestion
              ? 'bg-gradient-to-r from-accent-gold to-accent-copper text-gallery-950 font-semibold gold-glow'
              : 'border border-white/10 text-gallery-400 hover:text-gallery-200 hover:border-white/20'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          AI Select
        </button>
      </div>

      <AnimatePresence mode="wait">
        {useAiSuggestion ? (
          <motion.div
            key="ai-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel p-6 text-center space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-gold/20 to-accent-copper/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-accent-gold animate-float" />
            </div>
            <div>
              <h3 className="font-display text-lg text-gallery-100">AI Environment Matching</h3>
              <p className="text-sm text-gallery-400 mt-1 max-w-md mx-auto">
                Our AI will analyze your artwork's colors, style, and mood to select the perfect environment
                and generate a custom prompt tailored to your piece.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gallery-500">
              {['Color analysis', 'Style detection', 'Mood matching', 'Optimal framing'].map((f) => (
                <span key={f} className="px-3 py-1 rounded-full bg-white/5 border border-white/5">{f}</span>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual-mode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Category pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEnvironmentCategory(null as any)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  !environmentCategory
                    ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                    : 'border-white/10 text-gallery-400 hover:border-white/20'
                }`}
              >
                All
              </button>
              {CATEGORIES.filter(c => c.id !== 'ai-suggested').map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setEnvironmentCategory(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                    environmentCategory === cat.id
                      ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold'
                      : 'border-white/10 text-gallery-400 hover:border-white/20'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((template) => (
                <motion.button
                  key={template.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.03 }}
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setTemplate(template)}
                  className={`relative rounded-xl overflow-hidden border transition-all duration-300 group ${
                    selectedTemplate?.id === template.id
                      ? 'border-accent-gold ring-2 ring-accent-gold/30'
                      : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-gallery-800 to-gallery-900 flex items-center justify-center relative overflow-hidden">
                    <div className="text-4xl opacity-30">
                      {CATEGORIES.find(c => c.id === template.category)?.icon}
                    </div>
                    
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-gold flex items-center justify-center">
                        <Check className="w-3 h-3 text-gallery-950" />
                      </div>
                    )}
                    
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
                      hoveredId === template.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-[10px] text-gallery-300 line-clamp-2">{template.prompt.slice(0, 80)}…</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gallery-200 font-medium truncate">{template.name}</p>
                    <p className="text-[10px] text-gallery-500">{template.wallColor} · {template.lighting}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}