// Saved progress for the Leonida Platinum tracker: localStorage plus export/import.
// The file the app exports is plain JSON: { "earned": ["Trophy Name", ...] }.
export const STORAGE_KEY = 'leonida-platinum-earned-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    return new Set(Array.isArray(names) ? names.filter((n) => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned], savedAt: new Date().toISOString() }));
}

export function exportProgress(earned) {
  const blob = new Blob([JSON.stringify({ earned: [...earned], exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProgressFile(file, validNames) {
  const parsed = JSON.parse(await file.text());
  const names = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(names)) throw new Error('That file has no earned list.');
  const kept = names.filter((n) => validNames.has(n));
  if (kept.length === 0) throw new Error('That file names no trophy from this list.');
  return new Set(kept);
}
