import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Sparkles, Loader2, Palette, Type as TypeIcon, Box, Search, Library, Plus, ArrowLeft, LogIn, LogOut, Pipette, Trash2, Download, Folder, Image as ImageIcon, Maximize2, Minimize2, Terminal } from 'lucide-react';
import { analyzeInspiration, generateImage } from './services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';

export type AnalysisResult = {
  coreVibe: string;
  colorAtmosphere: {
    colors?: {
      hex: string;
      role: string;
      description: string;
    }[];
    dominantColorHex?: string;
    dominantColorDesc?: string;
    accentColorHex?: string;
    accentColorDesc?: string;
    contrastHarmony: string;
  };
  typographyPersona: string;
  shapeLanguage: {
    shape: string;
    depthLighting: string;
  };
  keywords: {
    literal: string[];
    abstract: string[];
  };
};

export type SavedStyle = {
  id: string;
  date: string;
  images: string[];
  analysis: AnalysisResult;
};

// --- Components ---

function DesktopWindow({ 
  title, 
  children, 
  onClose, 
  className, 
  isActive, 
  onClick 
}: { 
  title: string; 
  children: React.ReactNode; 
  onClose?: () => void; 
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div 
      drag
      dragMomentum={false}
      dragHandle=".title-bar"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "absolute bg-[#F5F5F0] rounded-lg shadow-2xl overflow-hidden border border-black/20 flex flex-col",
        isActive ? "z-50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]" : "z-40 shadow-lg",
        className
      )}
    >
      {/* Title Bar */}
      <div className={cn(
        "title-bar h-8 flex items-center px-3 border-b border-black/10 shrink-0 select-none cursor-default",
        isActive ? "bg-[#E8E6E1]" : "bg-[#F0EFEA]"
      )}>
        <div className="flex gap-1.5 w-16">
          <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:bg-[#ff473d]"></button>
          <button className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></button>
          <button className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></button>
        </div>
        <div className="flex-1 text-center text-xs font-sans text-gray-700 font-medium tracking-wide">
          {title}
        </div>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto bg-white relative">
        {children}
      </div>
    </motion.div>
  );
}

function DesktopIcon({ label, onDoubleClick, defaultPosition }: { label: string, onDoubleClick: () => void, defaultPosition: {x: number, y: number} }) {
  return (
    <motion.div 
      drag
      dragMomentum={false}
      initial={{ x: defaultPosition.x, y: defaultPosition.y }}
      onDoubleClick={onDoubleClick}
      className="absolute top-0 left-0 flex flex-col items-center gap-1 w-24 cursor-pointer group z-10"
    >
      <div className="relative w-16 h-16 drop-shadow-md group-active:brightness-75 transition-all">
        {/* Back folder flap */}
        <div className="absolute top-2 left-1 w-14 h-12 bg-[#4A90E2] rounded-t-md border border-[#357ABD]"></div>
        {/* Folder tab */}
        <div className="absolute top-1 left-1 w-6 h-3 bg-[#4A90E2] rounded-t-md border-t border-l border-r border-[#357ABD]"></div>
        {/* Front folder flap */}
        <div className="absolute top-4 left-0 w-16 h-11 bg-[#5D9CEC] rounded-md border border-[#4A90E2] shadow-inner"></div>
        {/* Highlight */}
        <div className="absolute top-4 left-0 w-16 h-1 bg-white/20 rounded-t-md"></div>
      </div>
      <span className="text-white text-xs font-sans font-medium drop-shadow-md text-center bg-black/20 px-2 py-0.5 rounded border border-transparent group-hover:bg-[#0033A0]/60 group-hover:border-white/30 select-none">
        {label}
      </span>
    </motion.div>
  );
}

// --- Main App ---

export default function PrismApp() {
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [openWindows, setOpenWindows] = useState<string[]>(['welcome']);
  const [activeWindow, setActiveWindow] = useState<string>('welcome');
  
  // Analysis State
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  
  // Generate State
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyleRef, setSelectedStyleRef] = useState<string | null>(null);

  // Library State
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [styleToDelete, setStyleToDelete] = useState<string | null>(null);

  // Wallpaper State
  const [wallpaper, setWallpaper] = useState<string>('https://i.pinimg.com/originals/83/8f/ac/838facdfae4ce6e213e42c94fb5931eb.jpg');

  useEffect(() => {
    const saved = localStorage.getItem('prism_styles');
    if (saved) {
      try {
        setSavedStyles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved styles");
      }
    }
    
    const savedWallpaper = localStorage.getItem('prism_wallpaper');
    if (savedWallpaper && !savedWallpaper.includes('unsplash.com')) {
      setWallpaper(savedWallpaper);
    }
  }, []);

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setWallpaper(url);
        localStorage.setItem('prism_wallpaper', url);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveStyles = (styles: SavedStyle[]) => {
    setSavedStyles(styles);
    localStorage.setItem('prism_styles', JSON.stringify(styles));
  };

  const openWindow = (id: string) => {
    if (!openWindows.includes(id)) {
      setOpenWindows([...openWindows, id]);
    }
    setActiveWindow(id);
  };

  const closeWindow = (id: string) => {
    setOpenWindows(openWindows.filter(w => w !== id));
    if (activeWindow === id) {
      setActiveWindow(openWindows[openWindows.length - 2] || '');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: string[] = [];
    let loadedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
        }
        loadedCount++;
        if (loadedCount === files.length) {
          setImages(prev => [...prev, ...newImages].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    try {
      const formattedImages = images.map(img => {
        const [prefix, data] = img.split(',');
        const mimeType = prefix.split(':')[1].split(';')[0];
        return { mimeType, data };
      });
      const result = await analyzeInspiration(formattedImages);
      setCurrentAnalysis(result);
      
      const newStyle: SavedStyle = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        images: [...images],
        analysis: result
      };
      saveStyles([newStyle, ...savedStyles]);
      setImages([]);
      
      // Open library and show the new style
      openWindow('library');
      setSelectedStyleId(newStyle.id);
      closeWindow('analyze');
      
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      let finalPrompt = prompt;
      if (selectedStyleRef) {
        const style = savedStyles.find(s => s.id === selectedStyleRef);
        if (style) {
          const keywords = [...(style.analysis.keywords?.literal || []), ...(style.analysis.keywords?.abstract || [])].join(', ');
          finalPrompt = `${prompt}. In the style of: ${style.analysis.coreVibe}. Keywords: ${keywords}`;
        }
      }
      const imgData = await generateImage(finalPrompt);
      setGeneratedImage(imgData);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmDeleteStyle = () => {
    if (styleToDelete) {
      const newStyles = savedStyles.filter(s => s.id !== styleToDelete);
      saveStyles(newStyles);
      setStyleToDelete(null);
      if (selectedStyleId === styleToDelete) {
        setSelectedStyleId(null);
      }
    }
  };

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={{ backgroundImage: `url("${wallpaper}")` }}
    >
      {/* Desktop Icons */}
      <DesktopIcon 
        label="Start" 
        onDoubleClick={() => openWindow('analyze')} 
        defaultPosition={{ x: 40, y: 40 }}
      />
      <DesktopIcon 
        label="Library" 
        onDoubleClick={() => openWindow('library')} 
        defaultPosition={{ x: 40, y: 140 }}
      />
      <DesktopIcon 
        label="Generate" 
        onDoubleClick={() => openWindow('generate')} 
        defaultPosition={{ x: 40, y: 240 }}
      />

      {/* App Title & Description */}
      <div className="absolute top-12 right-12 text-right pointer-events-none select-none">
        <h1 className="font-serif text-8xl font-bold text-black tracking-wide mb-2">Prism</h1>
        <p className="font-serif text-3xl text-black/80 italic max-w-lg ml-auto leading-snug">
          A digital instrument to deconstruct visual aesthetics and synthesize new realities.
        </p>
      </div>

      <AnimatePresence>
        {/* Welcome Window */}
        {openWindows.includes('welcome') && (
          <DesktopWindow
            title="Prism.exe"
            onClose={() => closeWindow('welcome')}
            isActive={activeWindow === 'welcome'}
            onClick={() => setActiveWindow('welcome')}
            className="top-[20%] left-[25%] w-[500px] max-w-[90vw] h-auto"
          >
            <div className="p-10 flex flex-col items-center justify-center text-center bg-[#FDFDFB]">
              <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg">
                <Terminal className="w-8 h-8" />
              </div>
              <h1 className="font-serif text-3xl text-black mb-6 leading-relaxed">
                A digital instrument to <i>deconstruct</i> visual aesthetics and <i>synthesize</i> new realities.
              </h1>
              <p className="font-sans text-sm text-gray-500 mb-10 max-w-sm">
                Upload inspiration to extract its visual DNA, or generate new images based on your saved styles.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => openWindow('analyze')}
                  className="btn-oldschool px-8 py-3 font-serif text-lg tracking-wide hover:bg-[#d0d0d0]"
                >
                  Start Analyzing
                </button>
                <label className="btn-oldschool px-4 py-3 font-serif text-lg tracking-wide hover:bg-[#d0d0d0] cursor-pointer flex items-center justify-center" title="Change Wallpaper">
                  <ImageIcon className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperUpload} />
                </label>
              </div>
            </div>
          </DesktopWindow>
        )}

        {/* Analyze Window */}
        {openWindows.includes('analyze') && (
          <DesktopWindow
            title="Start.folder"
            onClose={() => closeWindow('analyze')}
            isActive={activeWindow === 'analyze'}
            onClick={() => setActiveWindow('analyze')}
            className="top-[10%] left-[10%] w-[600px] max-w-[90vw] h-[600px]"
          >
            <div className="p-6 h-full flex flex-col bg-[#FDFDFB]">
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-semibold text-black mb-2">New Analysis</h2>
                <p className="font-sans text-sm text-gray-600">Upload up to 4 images to extract their visual DNA.</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {images.length === 0 ? (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 text-gray-400 mb-4" />
                      <p className="mb-2 text-sm text-gray-600 font-sans"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500 font-sans">PNG, JPG up to 10MB</p>
                    </div>
                    <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                          <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-40 object-cover" />
                          <button
                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-700 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {images.length < 4 && (
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <Plus className="w-8 h-8 text-gray-400" />
                          <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-auto border-t border-gray-100">
                <button
                  onClick={handleAnalyze}
                  disabled={images.length === 0 || isAnalyzing}
                  className="w-full btn-oldschool py-3 font-serif text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing DNA...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Extract Style DNA</>
                  )}
                </button>
              </div>
            </div>
          </DesktopWindow>
        )}

        {/* Library Window */}
        {openWindows.includes('library') && (
          <DesktopWindow
            title="Style_Library.folder"
            onClose={() => closeWindow('library')}
            isActive={activeWindow === 'library'}
            onClick={() => setActiveWindow('library')}
            className="top-[15%] left-[20%] w-[800px] max-w-[90vw] h-[70vh]"
          >
            <div className="p-6 h-full flex flex-col bg-[#FDFDFB]">
              {!selectedStyleId ? (
                <>
                  <div className="mb-6 flex justify-between items-end">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-black mb-2">Style Library</h2>
                      <p className="font-sans text-sm text-gray-600">Your extracted visual DNAs.</p>
                    </div>
                    <button onClick={() => openWindow('analyze')} className="btn-oldschool px-4 py-1.5 text-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </div>

                  {savedStyles.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <Library className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-sans">Your library is empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 overflow-y-auto pb-4 pr-2">
                      {savedStyles.map((style) => (
                        <div 
                          key={style.id}
                          className="group relative bg-white border border-gray-200 p-3 rounded-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setSelectedStyleId(style.id)}
                        >
                          <div className="aspect-square mb-3 bg-gray-100 overflow-hidden border border-gray-100">
                            <img src={style.images[0]} alt="Style thumbnail" className="w-full h-full object-cover" />
                          </div>
                          <div className="font-serif font-medium text-black truncate text-sm">
                            {style.analysis.coreVibe.split('.')[0]}
                          </div>
                          <div className="font-sans text-xs text-gray-500 mt-1">
                            {new Date(style.date).toLocaleDateString()}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setStyleToDelete(style.id); }}
                            className="absolute top-4 right-4 p-1.5 bg-white/90 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <button 
                      onClick={() => setSelectedStyleId(null)}
                      className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-sans text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Library
                    </button>
                    <div className="flex items-center gap-4">
                      <span className="font-sans text-xs text-gray-400">
                        {new Date(savedStyles.find(s => s.id === selectedStyleId)?.date || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2">
                    {(() => {
                      const style = savedStyles.find(s => s.id === selectedStyleId);
                      if (!style) return null;
                      return (
                        <div className="space-y-8 pb-8">
                          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                            {style.images.map((img, i) => (
                              <div key={i} className="h-48 border border-gray-200 p-2 bg-white shadow-sm shrink-0 snap-center">
                                <img src={img} alt="Reference" className="h-full w-auto object-cover" />
                              </div>
                            ))}
                          </div>
                          <AnalysisDisplay 
                            analysis={style.analysis} 
                            onUpdate={(newAnalysis) => {
                              const newStyles = savedStyles.map(s => s.id === style.id ? { ...s, analysis: newAnalysis } : s);
                              saveStyles(newStyles);
                            }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </DesktopWindow>
        )}

        {/* Generate Window */}
        {openWindows.includes('generate') && (
          <DesktopWindow
            title="Generate.folder"
            onClose={() => closeWindow('generate')}
            isActive={activeWindow === 'generate'}
            onClick={() => setActiveWindow('generate')}
            className="top-[20%] left-[40%] w-[500px] max-w-[90vw] h-[650px]"
          >
            <div className="p-6 h-full flex flex-col bg-[#FDFDFB]">
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-semibold text-black mb-2">Synthesize Image</h2>
                <p className="font-sans text-sm text-gray-600">Generate new visuals using your saved style DNAs.</p>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                <div>
                  <label className="block font-sans text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Prompt</label>
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to see..."
                    className="w-full h-24 p-3 border border-gray-300 rounded-md font-sans text-sm resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block font-sans text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider">Style Reference (Optional)</label>
                  <select 
                    value={selectedStyleRef || ''}
                    onChange={(e) => setSelectedStyleRef(e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-md font-sans text-sm focus:outline-none focus:border-black"
                  >
                    <option value="">None (Raw Prompt)</option>
                    {savedStyles.map(style => (
                      <option key={style.id} value={style.id}>
                        {style.analysis.coreVibe.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt || isGenerating}
                    className="w-full btn-oldschool py-3 font-serif text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Synthesizing...</>
                    ) : (
                      <><ImageIcon className="w-5 h-5" /> Generate</>
                    )}
                  </button>
                </div>

                {generatedImage && (
                  <div className="pt-6 border-t border-gray-100 mt-6">
                    <h3 className="font-sans text-xs font-medium text-gray-700 mb-3 uppercase tracking-wider">Result</h3>
                    <div className="border border-gray-200 p-2 bg-white shadow-sm">
                      <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                    </div>
                    <a 
                      href={generatedImage} 
                      download={`synthesized-${Date.now()}.png`}
                      className="mt-4 w-full btn-oldschool py-2 font-sans text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Save Image
                    </a>
                  </div>
                )}
              </div>
            </div>
          </DesktopWindow>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {styleToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FDFDFB] border border-black/20 rounded-lg p-6 max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-xl font-serif font-semibold text-black mb-2">Delete Style</h3>
            <p className="text-gray-600 font-sans text-sm mb-6">
              Are you sure you want to delete this style? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setStyleToDelete(null)}
                className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 font-sans text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteStyle}
                className="px-4 py-1.5 bg-red-500 text-white rounded font-sans text-sm hover:bg-red-600 shadow-sm"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- Analysis Display Component ---

function AnalysisDisplay({ analysis, onUpdate }: { analysis: AnalysisResult, onUpdate?: (newAnalysis: AnalysisResult) => void }) {
  if (!analysis) return null;
  const colors = (analysis?.colorAtmosphere?.colors && analysis.colorAtmosphere.colors.length > 0) 
    ? analysis.colorAtmosphere.colors.filter((c: any) => c && c.hex) 
    : [
        { hex: analysis?.colorAtmosphere?.dominantColorHex || '#000000', role: 'Dominant', description: analysis?.colorAtmosphere?.dominantColorDesc || '' },
        { hex: analysis?.colorAtmosphere?.accentColorHex || '#000000', role: 'Accent', description: analysis?.colorAtmosphere?.accentColorDesc || '' }
      ].filter((c: any) => c && c.hex);

  const exportToMarkdown = () => {
    const md = `# 🎨 Visual Style DNA

## 1. Core Vibe & Emotional Tone
> ${analysis.coreVibe}

## 2. Color Atmosphere
${colors.map((c: any) => `- **${c.role}** (\`${c.hex}\`): ${c.description}`).join('\n')}

**Harmony:** ${analysis.colorAtmosphere?.contrastHarmony || ''}

## 3. Typography Persona
${analysis.typographyPersona}

## 4. Shape Language & Visual Treatment
- **Shape:** ${analysis.shapeLanguage?.shape}
- **Depth & Lighting:** ${analysis.shapeLanguage?.depthLighting}

## 5. Keywords & Tags
- **Literal / Technical:** ${analysis.keywords?.literal?.join(', ')}
- **Abstract / Stylistic:** ${analysis.keywords?.abstract?.join(', ')}

---
*Generated by Prism Style Library*
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `style-dna-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-end">
        <button
          onClick={exportToMarkdown}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-medium transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Export to Markdown
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Vibe */}
        <div>
          <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">Core Vibe & Emotional Tone</h3>
          <p className="text-gray-700 leading-relaxed font-serif text-lg italic">{analysis?.coreVibe}</p>
        </div>

        {/* Colors */}
        <div>
          <h3 className="font-serif text-xl font-semibold text-black mb-4 border-b border-gray-200 pb-2">Color Atmosphere</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colors.map((color, idx) => (
              <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-md border border-gray-100">
                <div className="w-10 h-10 rounded shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: color.hex }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-black font-medium text-sm">{color.role}</span>
                    <span className="text-[10px] font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 uppercase">{color.hex}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{color.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="text-black font-medium">Harmony:</span> {analysis?.colorAtmosphere?.contrastHarmony}
          </p>
        </div>

        {/* Typography & Shape */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">Typography Persona</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{analysis?.typographyPersona}</p>
          </div>
          <div>
            <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">Shape & Treatment</h3>
            <div className="space-y-3">
              <div>
                <span className="text-black font-medium text-xs uppercase tracking-wider">Shape</span>
                <p className="text-gray-700 text-sm mt-0.5">{analysis?.shapeLanguage?.shape}</p>
              </div>
              <div>
                <span className="text-black font-medium text-xs uppercase tracking-wider">Depth & Lighting</span>
                <p className="text-gray-700 text-sm mt-0.5">{analysis?.shapeLanguage?.depthLighting}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <h3 className="font-serif text-xl font-semibold text-black mb-4 border-b border-gray-200 pb-2">Keywords</h3>
          <div className="space-y-4">
            <div>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 block font-semibold">Literal / Technical</span>
              <div className="flex flex-wrap gap-1.5">
                {analysis?.keywords?.literal?.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 shadow-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 block font-semibold">Abstract / Stylistic</span>
              <div className="flex flex-wrap gap-1.5">
                {analysis?.keywords?.abstract?.map((kw, i) => (
                  <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 shadow-sm">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
