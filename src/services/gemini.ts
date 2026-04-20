import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeInspiration(imagesBase64: { mimeType: string, data: string }[], type: 'style' | 'ui-ux' | 'motion' = 'style', url?: string) {
  const ai = getAi();
  
  let systemInstruction = "";
  let responseSchema: any = {};

  if (type === 'style') {
    systemInstruction = `You are a visionary Art Director and AI Prompt Engineer. Your goal is to analyze the attached inspiration image(s) and translate its visual DNA into a flexible, actionable design direction, specifically optimized for generating new images in the EXACT SAME VISUAL STYLE.
CRITICAL INSTRUCTION: DO NOT hallucinate or invent elements that are not present in the image. If there are no outlines, do not mention outlines. If there are no geometric shapes, do not mention them. Be extremely literal and precise about what actually exists in the image. If the image is just blurred color blobs, state that clearly without adding imaginary line-work.

Output the following structured analysis:
1. Core Vibe & Emotional Tone
Describe the overarching aesthetic and emotional resonance in 2-3 sentences. What does this image feel like? What world does it belong to?
2. Medium & Technique (CRITICAL FOR STYLE MATCHING)
Be extremely specific about the artistic medium and technique. Is it a photograph, 3D render, flat vector illustration, watercolor, digital gradient mesh, or something else? Name specific techniques ONLY if clearly visible (e.g., "extreme Gaussian blur", "halftone shading", "thick impasto strokes"). If you cannot confidently identify a technique, say "uncertain — appears to be [best guess]."
3. Color Rules & Constraints
Extract the PRIMARY palette of colors visible in the image (MAX 6). 
CRITICAL: Only extract colors that are REALLY present. If the image has only 2 colors, provide only 2. DO NOT pad with gray or extrapolate. ZERO TOLERANCE for hallucinating purple or generic "SaaS" colors if they are not in the pixels. If the brand is Orange, extraction MUST show Orange. Never invert colors (e.g. don't output dark mode if input is light mode). If the image has many colors, pick the 6 most dominant and stylistically significant ones.
For each color provide:
HEX code
Role (e.g., dominant background, primary accent)
1-sentence description of behavior.
4. Lighting Direction & Quality
Describe the lighting as its own dimension. Address:
Source direction (top-left, ambient, none, etc.)
Quality (harsh/soft/diffused/flat)
Whether highlights and shadows are present, and how they behave
Any glow, bloom, or atmospheric light effects
5. Level of Detail & Texture
Describe the complexity and surface quality. Is it noisy, grainy, clean, flat, glossy, matte? Is there visible texture (paper grain, digital noise, brush strokes) or is the surface perfectly smooth? State the level of detail on a spectrum: hyper-detailed → moderate → minimal → abstract.
6. Composition & Spatial Logic
Describe how elements are arranged:
Layout pattern (centered, asymmetric, rule-of-thirds, edge-bleeding, scattered)
Use of negative space (heavy, moderate, none)
Scale & proportion of elements (large cropped forms vs. small floating elements)
Depth (flat plane, layered, atmospheric perspective)
Visual hierarchy — what does the eye land on first, second, third?
7. Shape Language & Visual Treatment
Describe the physical forms and shapes. Are they soft blurred blobs? Sharp geometric polygons? Organic curves? Hard-edged flat fills? Address:
Edge quality (crisp, feathered, blurred, irregular)
Whether forms overlap, blend, or sit in isolation
Any shadows, reflections, or dimensionality effects
8. Semantic Keywords
Provide three keyword categories:
(a) Medium Keywords (for AI image generation models — describe the technical style): e.g., "digital painting", "soft gradient mesh", "out-of-focus photography"
(b) Mood Keywords (emotional and atmospheric tone): e.g., "dreamlike", "clinical", "nostalgic warmth"
(c) Anti-Keywords (what this style is explicitly NOT — use for negative prompts): e.g., "NOT photorealistic", "NOT line-art", "NOT high-contrast"
9. What This Is NOT
In 2-3 sentences, explicitly describe what this visual style should be distinguished from. Name the closest adjacent styles and explain what makes this image different. This section is designed to prevent style drift during generation.
10. Style Replication Prompt
Synthesize everything above into a single, ready-to-use image generation prompt (150-250 words). This prompt should be copy-pasteable into Midjourney, DALL·E, or Stable Diffusion and produce an image that feels like it belongs to the same visual family as the reference — regardless of subject matter. Use the format: [medium and technique], [subject placeholder], [color and lighting], [texture and detail], [composition], [mood]. [anti-keywords as negative prompt]`;

    responseSchema = {
      type: Type.OBJECT,
      properties: {
        coreVibe: { type: Type.STRING },
        mediumAndTechnique: { type: Type.STRING },
        colorRules: {
          type: Type.OBJECT,
          properties: {
            rules: { type: Type.STRING },
            colors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hex: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["hex", "role", "description"]
              }
            }
          },
          required: ["rules", "colors"]
        },
        lightingDirectionQuality: { type: Type.STRING },
        detailAndTexture: { type: Type.STRING },
        compositionSpatialLogic: { type: Type.STRING },
        shapeLanguage: {
          type: Type.OBJECT,
          properties: {
            shape: { type: Type.STRING },
            depthLighting: { type: Type.STRING }
          }
        },
        keywords: {
          type: Type.OBJECT,
          properties: {
            medium: { type: Type.ARRAY, items: { type: Type.STRING } },
            mood: { type: Type.ARRAY, items: { type: Type.STRING } },
            antiKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        whatThisIsNot: { type: Type.STRING },
        styleReplicationPrompt: { type: Type.STRING }
      },
      required: [
        "coreVibe", "mediumAndTechnique", "colorRules", "lightingDirectionQuality",
        "detailAndTexture", "compositionSpatialLogic", "shapeLanguage", "keywords",
        "whatThisIsNot", "styleReplicationPrompt"
      ]
    };
  } else if (type === 'ui-ux') {
    systemInstruction = `You are a Senior Design Systems Architect with 15 years of experience reverse-engineering production interfaces. You think in design tokens, not adjectives. You output specifications, not impressions.

Your goal is to analyze the attached UI reference image and extract a forensically precise Design System specification. The output must be detailed enough that a developer who has NEVER seen the original can rebuild it pixel-for-pixel using only your spec.

CRITICAL RULES:
1. NUMERICAL VALUES ONLY. Never say "slightly rounded" — say \`border-radius: 8px\`. Never say "generous padding" — say \`padding: 24px 32px\`. If you cannot determine exact pixels, provide your best estimate with a confidence tag: \`~12px (estimated)\`.
2. DO NOT hallucinate UI elements. If there is no visible shadow, do not describe shadows. If there is no border, do not invent one. Describe ONLY what is observable.
3. Every component gets a complete token set. A button is NOT just a generic component — it must use the EXACT colors and dimensions found in the image. DO NOT use generic SaaS colors (like #2563EB or purple) if they are not present.
4. Think in relationships, not absolutes. The spacing between a heading and its paragraph matters more than either spacing in isolation. Capture ratios and rhythmic patterns.
5. FIDELITY TO VISUAL EVIDENCE. The provided inspiration images are the HIGHEST AUTHORITY. If the screenshots show a white background with light-colored elements (like the Spiral brand), your analysis MUST reflect that exactly. Do not speculate or hallucinate a generic "Dark Mode" or "Purple SaaS theme" just because it is a common AI design pattern. Identify background tokens based on the DOMINANT surface area. If the site is light-themed, \`bg-primary\` must be the light color observed. Do not confuse foreground elements (like black text) with background tokens.
6. Distinguish states. Every interactive element has at minimum: default, hover, active, disabled. Describe observable states; flag states you are inferring.

Output the following structured analysis:

1. Design Philosophy & Positioning
One-sentence essence, density spectrum (Ultra-airy to Ultra-dense), aesthetic lineage, and target platform feel.

2. Layout Architecture
Grid system (columns, max-width, gutters, padding), vertical rhythm (base unit, gaps), alignment patterns, and breakpoint behavior.

3. Typography System
For EACH typographic level observed (Display, H1, H2, Body, etc.), extract: Font Family, Font Weight, Font Size, Line Height, Letter Spacing, Text Transform, and Color. Note font pairing strategy and hierarchy contrast.

4. Color System
Extract the PRIMARY colors (MAX 8). For each: Token Name, HEX Value, HSL Value, Role, Usage Context. 
CRITICAL: Only extract colors that are REALLY present in the pixels of the provided images. DO NOT default to common UI frameworks (like Shadcn, Tailwind Slate, or Linear's palette). If the input image is Light Mode with an Orange brand (like Spiral), your output MUST reflect that. If you output a Dark Mode palette for a Light Mode image, you have failed. Pick the exact unique brand colors (e.g. various shades of the dominant Brand Orange). DO NOT pad with extra grays. Note focus on real observed tokens, not generated filler.

5. Component Library
For EACH visible UI component (Buttons, Cards, Inputs, Navigation, Tags, etc.), provide a complete specification including height, padding, border-radius, background, border, font details, shadows, and hover states.

6. Iconography & Visual Assets
Icon style, weight, size tokens, color. Image treatments and decorative elements.

7. Depth & Elevation System
Shadow tokens (--shadow-sm, etc.), backdrop effects (blur), layer ordering, and border-as-depth.

8. Surface & Material Quality
Primary surface material, background treatment, surface-to-surface contrast, transparency usage, and texture/noise.

9. Border & Divider System
Border color tokens, width, style, divider usage, and border radius scale (--radius-sm to --radius-full).

10. Interactive Affordances & State Design
Hover philosophy, active/pressed states, focus indicators, selection states, loading states, and transition defaults.

11. Content Patterns & Information Density
Text block max-width, list styles, data display patterns, empty states, and truncation rules.

12. Negative Constraints
List what this design explicitly DOES NOT use (e.g., "No drop shadows anywhere", "No gradients on buttons").

13. CSS Custom Properties
Synthesize everything into a CSS Custom Properties block (:root { ... }) that a developer can drop into any project. Include Typography, Type Scale, Colors, Spacing, Radii, Shadows, Transitions, and Layout variables.`;

    responseSchema = {
      type: Type.OBJECT,
      properties: {
        designPhilosophy: { type: Type.STRING },
        layoutArchitecture: { type: Type.STRING },
        typographySystem: { type: Type.STRING },
        colorSystem: {
          type: Type.OBJECT,
          properties: {
            rules: { type: Type.STRING },
            colors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tokenName: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  hsl: { type: Type.STRING },
                  role: { type: Type.STRING },
                  usageContext: { type: Type.STRING },
                  opacityVariants: { type: Type.STRING }
                },
                required: ["tokenName", "hex", "hsl", "role", "usageContext"]
              }
            }
          },
          required: ["rules", "colors"]
        },
        componentLibrary: { type: Type.STRING },
        iconographyAndAssets: { type: Type.STRING },
        depthAndElevation: { type: Type.STRING },
        surfaceAndMaterial: { type: Type.STRING },
        borderAndDivider: { type: Type.STRING },
        interactiveAffordances: { type: Type.STRING },
        contentPatterns: { type: Type.STRING },
        negativeConstraints: { type: Type.STRING },
        cssCustomProperties: { type: Type.STRING }
      },
      required: [
        "designPhilosophy", "layoutArchitecture", "typographySystem", "colorSystem",
        "componentLibrary", "iconographyAndAssets", "depthAndElevation", "surfaceAndMaterial",
        "borderAndDivider", "interactiveAffordances", "contentPatterns", "negativeConstraints",
        "cssCustomProperties"
      ]
    };
  } else if (type === 'motion') {
    const sequentialFramePreamble = imagesBase64.length > 1
      ? `IMPORTANT CONTEXT: The user has provided ${imagesBase64.length} sequential screenshots captured from a live browser session. These frames are TIME-ORDERED and show: (1) page load animation sequence at timed intervals, (2) scroll positions revealing scroll-triggered/linked animations, (3) hover state changes showing micro-interactions (before/after pairs). Compare adjacent frames carefully to identify what MOVED, FADED, SCALED, or TRANSFORMED between them. The delta between frames IS the animation data. Each frame is labeled with its capture context.\n\n`
      : '';
    systemInstruction = `${sequentialFramePreamble}You are a Senior Motion Design Engineer and Technical Art Director. Your job is to reverse-engineer the complete animation system of a given website and produce a prompt that achieves 1:1 motion replication — not an approximation, not "inspired by," but a forensic reproduction.

CRITICAL RULES:
1. DO NOT hallucinate motion that isn't there. If the page is static, say "No animation detected." If you can only see a screenshot, explicitly state which motions you are inferring vs. observing.
2. Every value must be numerical. Never say "smooth ease-in" — say \`ease-in, 0.6s, cubic-bezier(0.4, 0, 0.2, 1)\`. Never say "slides up" — say \`translateY(24px) → translateY(0)\`.
3. Describe choreography, not just individual animations. The sequence and stagger timing between elements is often more important than any single animation.
4. Separate CSS-only motion from JS-driven motion. CSS keyframes/transitions are fundamentally different from scroll-triggered, intersection-observer, or physics-based animations. Identify which engine drives each effect.
5. Distinguish scroll-linked from scroll-triggered. Scroll-linked means animation progress is directly bound to scroll position (e.g., scrub, parallax). Scroll-triggered means scroll position fires a one-shot animation. These require entirely different implementations.
6. Use spring parameters for physics-based motion. Never approximate spring animations with cubic-bezier. Record \`{ tension, friction, mass }\` or \`{ stiffness, damping, mass }\` depending on the library convention.
7. Model interactions as state machines, not isolated events. A button isn't just "has a hover effect" — it has idle → hover → active → focus → disabled states, each with defined transitions between them.

Output the following structured analysis:
Layer 0: Motion Architecture (Engine, global strategy)
Layer 1: Page Load Choreography
Layer 2: Scroll-Driven Motion (Linked vs Triggered)
Layer 3: Hover & Micro-Interactions (State machines)
Layer 4: Layout Animation (FLIP, morphs)
Layer 5: Transition & Navigation Motion
Layer 6: Looping & Ambient Motion
Layer 7: Typography Motion
Layer 8: Data-Driven & Reactive Animation
Layer 9: Special Effects & Shaders
Layer 10: Responsive Motion Adaptation
Layer 11: Self-Contained Replication Prompt (Complete tech docs)`;

    responseSchema = {
      type: Type.OBJECT,
      properties: {
        motionArchitecture: { type: Type.STRING },
        pageLoadChoreography: { type: Type.STRING },
        scrollDrivenMotion: { type: Type.STRING },
        hoverMicroInteractions: { type: Type.STRING },
        layoutAnimation: { type: Type.STRING },
        transitionNavigationMotion: { type: Type.STRING },
        loopingAmbientMotion: { type: Type.STRING },
        typographyMotion: { type: Type.STRING },
        dataDrivenAnimation: { type: Type.STRING },
        specialEffectsShaders: { type: Type.STRING },
        responsiveMotionAdaptation: { type: Type.STRING },
        selfContainedReplicationPrompt: { type: Type.STRING }
      },
      required: [
        "motionArchitecture", "pageLoadChoreography", "scrollDrivenMotion", "hoverMicroInteractions",
        "layoutAnimation", "transitionNavigationMotion", "loopingAmbientMotion", "typographyMotion",
        "dataDrivenAnimation", "specialEffectsShaders", "responsiveMotionAdaptation", "selfContainedReplicationPrompt"
      ]
    };
  }

  const parts: any[] = [];
  if (url) {
    parts.push({ text: `Analyze the website at this URL: ${url}` });
  }
  if (imagesBase64.length > 0) {
    parts.push(...imagesBase64.map(img => ({ inlineData: img })));
    parts.push({ text: "Analyze these inspiration images according to the system instructions to extract the exact style DNA. CRITICAL: The pixels in these images are the source of truth. Prioritize the colors and layouts visible in these images over anything you might find at the URL if they differ." });
  } else if (url) {
    parts.push({ text: "Analyze the provided website URL according to the system instructions to extract the exact style DNA." });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      tools: url ? [{ urlContext: {} }] : undefined
    }
  });
  
  const parsed = JSON.parse(response.text || "{}");
  parsed.analysisType = type;
  
  return parsed;
}

export async function generateImage(prompt: string): Promise<string> {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

