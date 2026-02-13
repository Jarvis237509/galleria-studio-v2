import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Frame, Wand2, Image, Palette, Zap, Globe } from 'lucide-react';

const FEATURES = [
  { icon: Image, title: 'Upload Anything', desc: 'PNG, JPG, WebP, TIFF — any format, any size' },
  { icon: Frame, title: '14 Frame Styles', desc: 'From thin modern to ornate gold with custom mats' },
  { icon: Palette, title: '20+ Environments', desc: 'Galleries, living rooms, offices, cafés and more' },
  { icon: Wand2, title: 'AI Smart Match', desc: 'AI analyzes your art and picks the perfect scene' },
  { icon: Zap, title: 'Instant Compositing', desc: 'Photorealistic results in under 30 seconds' },
  { icon: Globe, title: 'Commercial Ready', desc: 'High-res outputs for portfolios and clients' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gallery-950 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent-gold/5 rounded-full blur-[200px]" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-gold to-accent-copper flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-gallery-950" />
          </div>
          <span className="font-display text-xl text-gallery-100">Galleria Studio</span>
        </div>
        <Link to="/studio" className="btn-primary">
          Open Studio
          <ArrowRight className="w-4 h-4 inline ml-1" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-24 pb-32 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Artwork Mockups
          </div>

          <h1 className="font-display text-5xl md:text-7xl text-gallery-50 leading-tight">
            Your Art Deserves a <br />
            <span className="bg-gradient-to-r from-accent-gold to-accent-copper bg-clip-text text-transparent">
              Perfect Stage
            </span>
          </h1>

          <p className="text-lg text-gallery-400 mt-6 max-w-2xl mx-auto leading-relaxed">
            Upload your artwork, choose a frame, and let AI place it in stunning photorealistic environments.
            From gallery walls to Scandinavian living rooms — in seconds.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link to="/studio" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Start Creating
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="glass-panel p-6 group hover:border-white/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-accent-gold/10 transition-colors">
                <f.icon className="w-6 h-6 text-gallery-400 group-hover:text-accent-gold transition-colors" />
              </div>
              <h3 className="font-display text-lg text-gallery-100">{f.title}</h3>
              <p className="text-sm text-gallery-500 mt-2">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}