import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';

export default function ArtworkUpload() {
  const { artworkPreview, setArtwork, artworkFile } = useStudioStore();
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => setArtwork(file, reader.result as string);
    reader.readAsDataURL(file);
  }, [setArtwork]);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tiff']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Sync local state with dropzone state
  if (dropzoneActive !== isDragActive) {
    setIsDragActive(dropzoneActive);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-gallery-100">Upload Your Artwork</h2>
      
      <AnimatePresence mode="wait">
        {!artworkPreview ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              {...getRootProps()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 group
                ${isDragActive ? 'border-accent-gold bg-accent-gold/5 scale-[1.02]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Upload className="w-7 h-7 text-gallery-400 group-hover:text-accent-gold transition-colors" />
                </div>
                <div>
                  <p className="text-gallery-200 font-medium">Drop your artwork here</p>
                  <p className="text-sm text-gallery-500 mt-1">PNG, JPG, WebP, TIFF — up to 50MB</p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative glass-panel overflow-hidden group"
          >
            <img 
              src={artworkPreview} 
              alt="Artwork preview" 
              className="w-full max-h-[400px] object-contain p-4"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                useStudioStore.getState().reset();
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-accent-gold" />
                <span className="text-sm text-gallery-200 truncate">{artworkFile?.name}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}