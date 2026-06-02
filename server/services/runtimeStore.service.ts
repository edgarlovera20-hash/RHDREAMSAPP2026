import fs from "fs/promises";
import path from "path";

const runtimeDir = path.join(process.cwd(), ".sessions", "runtime");

export async function ensureRuntimeDir() {
  await fs.mkdir(runtimeDir, { recursive: true, mode: 0o700 });
}

export function runtimePath(fileName: string) {
  return path.join(runtimeDir, fileName);
}

export async function readRuntimeCollection<T>(fileName: string): Promise<T[]> {
  await ensureRuntimeDir();

  try {
    const raw = await fs.readFile(runtimePath(fileName), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeRuntimeCollection<T>(fileName: string, records: T[]) {
  await ensureRuntimeDir();
  await fs.writeFile(runtimePath(fileName), JSON.stringify(records, null, 2), {
    mode: 0o600,
  });
}

