import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Sparkles, Loader2, Palette, Type as TypeIcon, Box, Search, Library, Plus, ArrowLeft, LogIn, LogOut, Pipette, Trash2, Download, Folder, Image as ImageIcon, Maximize2, Minimize2, Terminal } from 'lucide-react';
import { analyzeInspiration, generateImage } from './services/gemini';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';

export type AnalysisType = 'style' | 'ui-ux' | 'motion';

export type AnalysisResult = {
  analysisType?: AnalysisType;
  // Style fields
  coreVibe?: string;
  mediumAndTechnique?: string;
  detailAndTexture?: string;
  shapeLanguage?: {
    shape: string;
    depthLighting: string;
  };
  lightingDirectionQuality?: string;
  compositionSpatialLogic?: string;
  whatThisIsNot?: string;
  styleReplicationPrompt?: string;
  // UI/UX fields
  designPhilosophy?: string;
  layoutArchitecture?: string;
  typographySystem?: string;
  colorSystem?: {
    rules: string;
    colors: {
      tokenName: string;
      hex: string;
      hsl: string;
      role: string;
      usageContext: string;
      opacityVariants: string;
    }[];
  };
  componentLibrary?: string;
  iconographyAndAssets?: string;
  depthAndElevation?: string;
  surfaceAndMaterial?: string;
  borderAndDivider?: string;
  interactiveAffordances?: string;
  contentPatterns?: string;
  negativeConstraints?: string;
  cssCustomProperties?: string;
  // Motion fields
  pageLoadChoreography?: string;
  scrollDrivenMotion?: string;
  hoverMicroInteractions?: string;
  transitionNavigationMotion?: string;
  loopingAmbientMotion?: string;
  typographyMotion?: string;
  specialEffectsShaders?: string;
  responsiveMotionAdaptation?: string;
  selfContainedReplicationPrompt?: string;
  
  // Shared fields
  colorRules?: {
    rules: string;
    colors: {
      hex: string;
      role: string;
      description: string;
    }[];
  };
  keywords: {
    literal?: string[];
    abstract?: string[];
    medium?: string[];
    mood?: string[];
    antiKeywords?: string[];
  };
};

export type SavedStyle = {
  id: string;
  date: string;
  images: string[];
  url?: string;
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
      <div className="relative flex justify-center items-center w-full h-[72px]">
        <svg viewBox="0 0 100 100" className="w-[72px] h-[72px] drop-shadow-md group-active:brightness-75 transition-all">
          <defs>
            <linearGradient id="folderBack" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#2E9DFB" />
              <stop offset="100%" stopColor="#1884E8" />
            </linearGradient>
            <linearGradient id="folderFront" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#62C6FF" />
              <stop offset="100%" stopColor="#43B1FA" />
            </linearGradient>
          </defs>
          {/* Back flap */}
          <path d="M10 24 C10 19, 13 16, 18 16 L35 16 C38 16, 41 17.5, 43 20 L47 26 C49 29, 52 31, 56 31 L86 31 C91 31, 95 35, 95 40 L95 80 C95 85, 91 89, 86 89 L14 89 C9 89, 5 85, 5 80 Z" fill="url(#folderBack)" />
          {/* Front flap */}
          <path d="M5 35 C5 31, 8 28, 12 28 L88 28 C92 28, 95 31, 95 35 L95 80 C95 85, 91 89, 86 89 L14 89 C9 89, 5 85, 5 80 Z" fill="url(#folderFront)" />
          {/* Top highlight */}
          <path d="M5 35 C5 31, 8 28, 12 28 L88 28 C92 28, 95 31, 95 35 L95 36.5 C95 32.5, 92 29.5, 88 29.5 L12 29.5 C8 29.5, 5 32.5, 5 36.5 Z" fill="#BBE6FF" opacity="0.9" />
          {/* Bottom shadow lines */}
          <path d="M5 78 L95 78 L95 80 C95 85, 91 89, 86 89 L14 89 C9 89, 5 85, 5 80 Z" fill="#2E9DFB" />
          <path d="M5 82 L95 82 L95 83 L5 83 Z" fill="#1884E8" opacity="0.5" />
        </svg>
      </div>
      <span 
        className="text-white text-[13px] font-sans font-medium text-center px-1.5 py-0.5 rounded border border-transparent group-hover:bg-blue-500/50 group-hover:border-blue-400/30 select-none"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)' }}
      >
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
  const [url, setUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisType>('style');
  
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

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Error Handler
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        // Fallback to local storage if not logged in
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
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthReady && user) {
      // Listen to styles
      const stylesRef = collection(db, `users/${user.uid}/styles`);
      const unsubscribeStyles = onSnapshot(stylesRef, (snapshot) => {
        const stylesData: SavedStyle[] = [];
        snapshot.forEach((doc) => {
          stylesData.push(doc.data() as SavedStyle);
        });
        // Sort by date descending
        stylesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSavedStyles(stylesData);
      }, (error) => {
        handleFirestoreError(error, 'get', `users/${user.uid}/styles`);
      });

      // Listen to preferences
      const prefsRef = doc(db, `users/${user.uid}/preferences/default`);
      const unsubscribePrefs = onSnapshot(prefsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.wallpaper) {
            setWallpaper(data.wallpaper);
          }
        }
      }, (error) => {
        handleFirestoreError(error, 'get', `users/${user.uid}/preferences/default`);
      });

      return () => {
        unsubscribeStyles();
        unsubscribePrefs();
      };
    }
  }, [isAuthReady, user]);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const url = event.target.result as string;
        setWallpaper(url);
        if (user) {
          try {
            await setDoc(doc(db, `users/${user.uid}/preferences/default`), { wallpaper: url });
          } catch (error) {
            handleFirestoreError(error, 'write', `users/${user.uid}/preferences/default`);
          }
        } else {
          localStorage.setItem('prism_wallpaper', url);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const saveStyles = async (styles: SavedStyle[]) => {
    // This is now mainly used for local fallback or updating a specific style
    setSavedStyles(styles);
    if (!user) {
      localStorage.setItem('prism_styles', JSON.stringify(styles));
    }
  };

  const saveSingleStyle = async (style: SavedStyle) => {
    if (user) {
      try {
        await setDoc(doc(db, `users/${user.uid}/styles/${style.id}`), style);
      } catch (error) {
        handleFirestoreError(error, 'write', `users/${user.uid}/styles/${style.id}`);
      }
    } else {
      const newStyles = [style, ...savedStyles.filter(s => s.id !== style.id)];
      saveStyles(newStyles);
    }
  };

  const openWindow = (id: string) => {
    setOpenWindows(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
    setActiveWindow(id);
  };

  const closeWindow = (id: string) => {
    setOpenWindows(prev => {
      const next = prev.filter(w => w !== id);
      if (activeWindow === id) {
        setActiveWindow(next[next.length - 1] || '');
      }
      return next;
    });
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
    if (images.length === 0 && !url.trim()) return;
    setIsAnalyzing(true);
    try {
      const formattedImages = images.map(img => {
        const [prefix, data] = img.split(',');
        const mimeType = prefix.split(':')[1].split(';')[0];
        return { mimeType, data };
      });
      const result = await analyzeInspiration(formattedImages, analysisMode, url.trim());
      setCurrentAnalysis(result);
      
      const newStyle: SavedStyle = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        images: [...images],
        url: url.trim() || undefined,
        analysis: result
      };
      await saveSingleStyle(newStyle);
      setImages([]);
      setUrl('');
      
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
          const a = style.analysis;
          const keywords = [
            ...(a.keywords?.literal || []), 
            ...(a.keywords?.abstract || []),
            ...(a.keywords?.medium || []),
            ...(a.keywords?.mood || []),
            ...(a.keywords?.antiKeywords || [])
          ].join(', ');
          const colorHexes = a.colorRules?.colors?.map(c => c.hex).join(', ') || '';
          
          if (a.analysisType === 'motion') {
            finalPrompt = `
You are an expert Motion Design Engineer and AI image generator. Your task is to generate a storyboard or visual representation of a website based on this prompt: "${prompt}".

CRITICAL MOTION & INTERACTION STYLE INSTRUCTIONS - YOU MUST STRICTLY FOLLOW THESE:
1. Page Load Choreography: ${a.pageLoadChoreography}
2. Scroll-Driven Motion: ${a.scrollDrivenMotion}
3. Hover & Micro-Interactions: ${a.hoverMicroInteractions}
4. Transition & Navigation Motion: ${a.transitionNavigationMotion}
5. Looping & Ambient Motion: ${a.loopingAmbientMotion}
6. Typography Motion: ${a.typographyMotion}
7. Special Effects & Shaders: ${a.specialEffectsShaders}
8. Responsive Motion Adaptation: ${a.responsiveMotionAdaptation}

Try to visually represent these motion concepts in the static image (e.g., motion blur, overlapping frames, dynamic composition).
`;
          } else if (a.analysisType === 'ui-ux') {
            finalPrompt = `
You are an expert UI/UX designer and AI image generator. Your task is to generate a UI/UX mockup based on this prompt: "${prompt}".

CRITICAL UI/UX STYLE INSTRUCTIONS - YOU MUST STRICTLY FOLLOW THESE:
1. Design Philosophy: ${a.designPhilosophy}
2. Layout Architecture: ${a.layoutArchitecture}
3. Component Library: ${a.componentLibrary}
4. Typography System: ${a.typographySystem}
5. Color System: ${a.colorSystem?.rules}. Use these exact colors if possible: ${(a.colorSystem?.colors || []).map(c => c.hex).join(', ')}.
6. Surface & Material Quality: ${a.surfaceAndMaterial}
7. Depth & Elevation System: ${a.depthAndElevation}
8. Negative Constraints: ${a.negativeConstraints}

Do not deviate from the Color System and Component Library.
`;
          } else {
            if (a.styleReplicationPrompt) {
              finalPrompt = a.styleReplicationPrompt.replace(/\[subject placeholder\]/gi, prompt);
            } else {
              finalPrompt = `
You are an expert AI image generator. Your task is to generate an image that perfectly matches the requested subject while STRICTLY adhering to the provided visual style DNA.

SUBJECT / PROMPT:
"${prompt}"

VISUAL STYLE DNA (YOU MUST OBEY THESE STRICTLY):
- Medium & Technique: ${a.mediumAndTechnique}
- Shape Language & Visual Treatment: ${a.shapeLanguage?.shape}. ${a.shapeLanguage?.depthLighting}.
- Level of Detail & Texture: ${a.detailAndTexture}
- Color Rules: ${a.colorRules?.rules}. (Target colors: ${colorHexes})
- Core Vibe: ${a.coreVibe}
- Keywords: ${keywords}

CRITICAL INSTRUCTIONS:
1. The SUBJECT ("${prompt}") must be rendered ENTIRELY in the VISUAL STYLE DNA.
2. Do not add default realistic details if the style is abstract or stylized.
3. If the style specifies "blurred blobs" or "no outlines", you MUST NOT use outlines or sharp edges for the subject.
4. The final image must look like it belongs in the exact same portfolio as the reference style.
`;
            }
          }
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

  const confirmDeleteStyle = async () => {
    if (styleToDelete) {
      if (user) {
        try {
          await deleteDoc(doc(db, `users/${user.uid}/styles/${styleToDelete}`));
        } catch (error) {
          handleFirestoreError(error, 'delete', `users/${user.uid}/styles/${styleToDelete}`);
        }
      } else {
        const newStyles = savedStyles.filter(s => s.id !== styleToDelete);
        saveStyles(newStyles);
      }
      setStyleToDelete(null);
      if (selectedStyleId === styleToDelete) {
        setSelectedStyleId(null);
      }
    }
  };

  const getStyleTitle = (style: SavedStyle) => {
    if (style.analysis.analysisType === 'motion') {
      const title = style.analysis.pageLoadChoreography || 'Motion DNA';
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }
    if (style.analysis.analysisType === 'ui-ux') {
      return style.analysis.designPhilosophy || 'UI/UX Style';
    }
    return style.analysis.coreVibe || 'Visual Style';
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

      {/* Auth Button */}
      <div className="absolute bottom-12 right-12 z-50">
        {user ? (
          <button 
            onClick={logOut}
            className="btn-oldschool px-4 py-2 font-sans text-sm flex items-center gap-2 bg-white/80 backdrop-blur"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <button 
            onClick={signInWithGoogle}
            className="btn-oldschool px-4 py-2 font-sans text-sm flex items-center gap-2 bg-white/80 backdrop-blur"
          >
            <LogIn className="w-4 h-4" />
            Sign In to Sync
          </button>
        )}
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
                <p className="font-sans text-sm text-gray-600">Upload up to 4 images or provide a website URL to extract visual DNA.</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-sans">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-black focus:border-black font-sans text-sm"
                  />
                </div>

                {images.length === 0 ? (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
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
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setAnalysisMode('style')}
                    className={`flex-1 py-2 font-serif text-sm border border-black transition-colors ${analysisMode === 'style' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                  >
                    Visual Style
                  </button>
                  <button
                    onClick={() => setAnalysisMode('ui-ux')}
                    className={`flex-1 py-2 font-serif text-sm border border-black transition-colors ${analysisMode === 'ui-ux' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                  >
                    UI/UX
                  </button>
                  <button
                    onClick={() => setAnalysisMode('motion')}
                    className={`flex-1 py-2 font-serif text-sm border border-black transition-colors ${analysisMode === 'motion' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                  >
                    Motion DNA
                  </button>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={(images.length === 0 && !url.trim()) || isAnalyzing}
                  className="w-full btn-oldschool py-3 font-serif text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing DNA...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> Extract {analysisMode === 'style' ? 'Style' : analysisMode === 'ui-ux' ? 'UI/UX' : 'Motion'} DNA</>
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
                          <div className="aspect-square mb-3 bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center">
                            {style.images && style.images.length > 0 ? (
                              <img src={style.images[0]} alt="Style thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                <Search className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs font-sans">URL Analysis</span>
                              </div>
                            )}
                          </div>
                          <div className="font-serif font-medium text-black truncate text-sm">
                            {getStyleTitle(style).split('.')[0]}
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
                          {style.images && style.images.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                              {style.images.map((img, i) => (
                                <div key={i} className="h-48 border border-gray-200 p-2 bg-white shadow-sm shrink-0 snap-center">
                                  <img src={img} alt="Reference" className="h-full w-auto object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                          {style.url && (
                            <div className="mb-6 bg-gray-50 p-3 rounded-md border border-gray-200">
                              <span className="text-sm font-medium text-gray-700 mr-2">Source URL:</span>
                              <a href={style.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                {style.url}
                              </a>
                            </div>
                          )}
                          <AnalysisDisplay 
                            analysis={style.analysis} 
                            onUpdate={(newAnalysis) => {
                              const updatedStyle = { ...style, analysis: newAnalysis };
                              saveSingleStyle(updatedStyle);
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
                        {getStyleTitle(style).substring(0, 50)}...
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
  const colors = analysis?.colorRules?.colors?.filter((c: any) => c && c.hex) || [];
  const isUIUX = analysis.analysisType === 'ui-ux';
  const isMotion = analysis.analysisType === 'motion';

  // Pad colors to 6 for older saved styles
  useEffect(() => {
    if (!onUpdate) return;
    
    if (!isMotion && (!analysis?.colorRules || colors.length < 6)) {
      const paddedColors = [...colors];
      while (paddedColors.length < 6) {
        paddedColors.push({
          hex: '#808080',
          role: 'Supplementary Color',
          description: 'Added to meet the 6-color minimum requirement.'
        });
      }
      onUpdate({
        ...analysis,
        colorRules: { 
          rules: analysis?.colorRules?.rules || 'Standard 6-color palette.', 
          colors: paddedColors 
        }
      });
    }
  }, [colors.length, analysis, onUpdate, isMotion]);

  const exportToMarkdown = () => {
    let md = '';
    if (isMotion) {
      md = `# 🎬 Motion Design DNA

## 1. Page Load Choreography
${analysis.pageLoadChoreography || 'N/A'}

## 2. Scroll-Driven Motion
${analysis.scrollDrivenMotion || 'N/A'}

## 3. Hover & Micro-Interactions
${analysis.hoverMicroInteractions || 'N/A'}

## 4. Transition & Navigation Motion
${analysis.transitionNavigationMotion || 'N/A'}

## 5. Looping & Ambient Motion
${analysis.loopingAmbientMotion || 'N/A'}

## 6. Typography Motion
${analysis.typographyMotion || 'N/A'}

## 7. Special Effects & Shaders
${analysis.specialEffectsShaders || 'N/A'}

## 8. Responsive Motion Adaptation
${analysis.responsiveMotionAdaptation || 'N/A'}

## 9. Self-Contained Replication Prompt
\`\`\`markdown
${analysis.selfContainedReplicationPrompt || 'N/A'}
\`\`\`

---
*Generated by Prism Style Library*
`;
    } else if (isUIUX) {
      md = `# 📱 UI/UX Design System DNA

## 1. Design Philosophy & Positioning
> ${analysis.designPhilosophy || 'N/A'}

## 2. Layout Architecture
${analysis.layoutArchitecture || 'N/A'}

## 3. Typography System
${analysis.typographySystem || 'N/A'}

## 4. Color System
**Rules:** ${analysis.colorSystem?.rules || ''}

${(analysis.colorSystem?.colors || []).map((c: any) => `- **${c.tokenName}** (\`${c.hex}\` / \`${c.hsl}\`): ${c.role} - ${c.usageContext} ${c.opacityVariants ? `(Opacity: ${c.opacityVariants})` : ''}`).join('\n')}

## 5. Component Library
${analysis.componentLibrary || 'N/A'}

## 6. Iconography & Visual Assets
${analysis.iconographyAndAssets || 'N/A'}

## 7. Depth & Elevation System
${analysis.depthAndElevation || 'N/A'}

## 8. Surface & Material Quality
${analysis.surfaceAndMaterial || 'N/A'}

## 9. Border & Divider System
${analysis.borderAndDivider || 'N/A'}

## 10. Interactive Affordances & State Design
${analysis.interactiveAffordances || 'N/A'}

## 11. Content Patterns & Information Density
${analysis.contentPatterns || 'N/A'}

## 12. Negative Constraints
${analysis.negativeConstraints || 'N/A'}

## 13. CSS Custom Properties
\`\`\`css
${analysis.cssCustomProperties || 'N/A'}
\`\`\`

---
*Generated by Prism Style Library*
`;
    } else {
      md = `# 🎨 Visual Style DNA

## 1. Core Vibe & Emotional Tone
> ${analysis.coreVibe}

## 2. Medium & Technique
${analysis.mediumAndTechnique}

## 3. Color Rules & Constraints
**Rules:** ${analysis.colorRules?.rules || ''}

${colors.map((c: any) => `- **${c.role}** (\`${c.hex}\`): ${c.description}`).join('\n')}

## 4. Lighting Direction & Quality
${analysis.lightingDirectionQuality || 'N/A'}

## 5. Level of Detail & Texture
${analysis.detailAndTexture}

## 6. Composition & Spatial Logic
${analysis.compositionSpatialLogic || 'N/A'}

## 7. Shape Language & Visual Treatment
- **Shape:** ${analysis.shapeLanguage?.shape}
- **Depth & Lighting:** ${analysis.shapeLanguage?.depthLighting}

## 8. Semantic Keywords
- **Medium / Technical:** ${analysis.keywords?.medium?.join(', ') || analysis.keywords?.literal?.join(', ')}
- **Mood / Atmospheric:** ${analysis.keywords?.mood?.join(', ') || analysis.keywords?.abstract?.join(', ')}
- **Anti-Keywords:** ${analysis.keywords?.antiKeywords?.join(', ') || 'N/A'}

## 9. What This Is NOT
${analysis.whatThisIsNot || 'N/A'}

## 10. Style Replication Prompt
\`\`\`text
${analysis.styleReplicationPrompt || 'N/A'}
\`\`\`

---
*Generated by Prism Style Library*
`;
    }

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
        {isMotion ? (
          <>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">1. Page Load Choreography</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.pageLoadChoreography}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">2. Scroll-Driven Motion</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.scrollDrivenMotion}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">3. Hover & Micro-Interactions</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.hoverMicroInteractions}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">4. Transition & Navigation Motion</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.transitionNavigationMotion}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">5. Looping & Ambient Motion</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.loopingAmbientMotion}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">6. Typography Motion</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.typographyMotion}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">7. Special Effects & Shaders</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.specialEffectsShaders}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">8. Responsive Motion Adaptation</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.responsiveMotionAdaptation}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">9. Self-Contained Replication Prompt</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {analysis?.selfContainedReplicationPrompt}
              </div>
            </div>
          </>
        ) : isUIUX ? (
          <>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">1. Design Philosophy & Positioning</h3>
              <p className="text-gray-700 leading-relaxed font-serif text-lg italic">{analysis?.designPhilosophy}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">2. Layout Architecture</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.layoutArchitecture}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">3. Typography System</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.typographySystem}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">4. Color System</h3>
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                <span className="text-black font-medium">Rules:</span> {analysis?.colorSystem?.rules}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(analysis?.colorSystem?.colors || []).map((color: any, idx: number) => (
                  <div key={idx} className="group flex gap-3 items-start bg-gray-50 p-3 rounded-md border border-gray-100 relative hover:border-gray-300 transition-colors">
                    <div 
                      className="shrink-0 w-10 h-10 rounded shadow-inner border border-black/10" 
                      style={{ backgroundColor: color.hex }} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-black font-medium text-sm truncate">{color.tokenName}</span>
                        <span className="text-[10px] font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 uppercase">{color.hex}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Role:</span> {color.role}</p>
                      <p className="text-xs text-gray-600 line-clamp-2"><span className="font-medium">Context:</span> {color.usageContext}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">5. Component Library</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.componentLibrary}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">6. Iconography & Visual Assets</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.iconographyAndAssets}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">7. Depth & Elevation System</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.depthAndElevation}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">8. Surface & Material Quality</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.surfaceAndMaterial}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">9. Border & Divider System</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.borderAndDivider}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">10. Interactive Affordances & State Design</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.interactiveAffordances}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">11. Content Patterns & Information Density</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.contentPatterns}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">12. Negative Constraints</h3>
              <p className="text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">{analysis?.negativeConstraints}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">13. CSS Custom Properties</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                {analysis?.cssCustomProperties}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">1. Core Vibe & Emotional Tone</h3>
              <p className="text-gray-700 leading-relaxed font-serif text-lg italic">{analysis?.coreVibe}</p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">2. Medium & Technique</h3>
              <p className="text-gray-700 leading-relaxed font-sans">{analysis?.mediumAndTechnique}</p>
            </div>
          </>
        )}

        {/* Colors (Only for Style Analysis now, UI/UX has its own above) */}
        {!isUIUX && !isMotion && (
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
              <h3 className="font-serif text-xl font-semibold text-black">3. Color Rules & Constraints</h3>
            {onUpdate && colors.length < 15 && (
              <button
                onClick={() => {
                  const newColors = [...colors, { hex: '#000000', role: 'Custom', description: 'Added manually' }];
                  onUpdate({
                    ...analysis,
                    colorRules: { ...analysis.colorRules, rules: analysis.colorRules?.rules || '', colors: newColors }
                  });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                title="Add a new color (up to 15)"
              >
                <Plus className="w-3.5 h-3.5" /> Add Color
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="text-black font-medium">Rules:</span> {analysis?.colorRules?.rules}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colors.map((color: any, idx: number) => (
              <div key={idx} className="group flex gap-3 items-start bg-gray-50 p-3 rounded-md border border-gray-100 relative hover:border-gray-300 transition-colors">
                <label className="relative shrink-0 group/picker cursor-pointer block w-10 h-10">
                  {/* Native Color Picker Input */}
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => {
                      if (!onUpdate) return;
                      const newColors = [...colors];
                      newColors[idx] = { ...newColors[idx], hex: e.target.value };
                      onUpdate({
                        ...analysis,
                        colorRules: { ...analysis.colorRules, rules: analysis.colorRules?.rules || '', colors: newColors }
                      });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                    title="Click to change color"
                  />
                  <div 
                    className="absolute inset-0 rounded shadow-inner border border-black/10 transition-transform group-hover/picker:scale-105 pointer-events-none" 
                    style={{ backgroundColor: color.hex }} 
                  />
                  {/* EyeDropper Icon (Visual only, label triggers input) */}
                  {onUpdate && (
                    <div 
                      className="absolute -bottom-1.5 -right-1.5 z-20 bg-white border border-gray-300 rounded-full p-1 shadow-sm group-hover/picker:bg-gray-100 text-gray-700 transition-colors pointer-events-none"
                      title="Pick color"
                    >
                      <Pipette className="w-3.5 h-3.5" />
                    </div>
                  )}
                </label>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-black font-medium text-sm truncate">{color.role}</span>
                    <span className="text-[10px] font-mono text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 uppercase">{color.hex}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{color.description}</p>
                </div>
                {/* Remove Color Button */}
                {onUpdate && colors.length > 6 && (
                  <button
                    onClick={() => {
                      const newColors = colors.filter((_, i) => i !== idx);
                      onUpdate({
                        ...analysis,
                        colorRules: { ...analysis.colorRules, rules: analysis.colorRules?.rules || '', colors: newColors }
                      });
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Remove color"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {!isUIUX && !isMotion && (
          <>
            {/* Lighting */}
            {analysis?.lightingDirectionQuality && (
              <div>
                <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">4. Lighting Direction & Quality</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{analysis.lightingDirectionQuality}</p>
              </div>
            )}

            {/* Detail & Texture */}
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">5. Level of Detail & Texture</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{analysis?.detailAndTexture}</p>
            </div>

            {/* Composition */}
            {analysis?.compositionSpatialLogic && (
              <div>
                <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">6. Composition & Spatial Logic</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{analysis.compositionSpatialLogic}</p>
              </div>
            )}

            {/* Shape */}
            <div>
              <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">7. Shape Language & Visual Treatment</h3>
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
          </>
        )}

        {/* Keywords (Only for Style Analysis now) */}
        {!isUIUX && !isMotion && (
          <div>
            <h3 className="font-serif text-xl font-semibold text-black mb-4 border-b border-gray-200 pb-2">8. Semantic Keywords</h3>
            <div className="space-y-4">
              <>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 block font-semibold">Medium / Technical</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysis?.keywords?.medium || analysis?.keywords?.literal || []).map((kw: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 shadow-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 block font-semibold">Mood / Atmospheric</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysis?.keywords?.mood || analysis?.keywords?.abstract || []).map((kw: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 shadow-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                {analysis?.keywords?.antiKeywords && analysis.keywords.antiKeywords.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 block font-semibold">Anti-Keywords (Negative Prompt)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywords.antiKeywords.map((kw: any, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-red-50 border border-red-100 rounded text-xs text-red-700 shadow-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            </div>
          </div>
        )}

        {!isUIUX && !isMotion && analysis?.whatThisIsNot && (
          <div>
            <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">9. What This Is NOT</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{analysis.whatThisIsNot}</p>
          </div>
        )}

        {!isUIUX && !isMotion && analysis?.styleReplicationPrompt && (
          <div>
            <h3 className="font-serif text-xl font-semibold text-black mb-3 border-b border-gray-200 pb-2">10. Style Replication Prompt</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap">
              {analysis.styleReplicationPrompt}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
