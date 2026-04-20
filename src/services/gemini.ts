const API_BASE = import.meta.env.VITE_CAPTURE_SERVICE_URL || '';

export async function analyzeInspiration(
  imagesBase64: { mimeType: string; data: string }[],
  type: 'style' | 'ui-ux' | 'motion' = 'style',
  url?: string
) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: imagesBase64, type, url }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Analysis failed');
  }

  return res.json();
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Image generation failed');
  }

  const data = await res.json();
  return data.imageDataUrl;
}
