import fs from 'fs';
import path from 'path';

let cachedDataDir: string | null = null;

export function getWritableDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  const candidates = [
    path.resolve(process.cwd(), '.data'),
    path.join('/tmp', 'tomoyo-data'),
  ];

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const probe = path.join(dir, '.write-check');
      fs.writeFileSync(probe, 'ok', 'utf-8');
      fs.unlinkSync(probe);
      cachedDataDir = dir;
      return dir;
    } catch {
      // Try next candidate
    }
  }

  cachedDataDir = candidates[1];
  return cachedDataDir;
}

export function readJsonData<T>(filename: string, fallback: T): T {
  try {
    const dir = getWritableDataDir();
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonData<T>(filename: string, value: T): boolean {
  try {
    const dir = getWritableDataDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}
