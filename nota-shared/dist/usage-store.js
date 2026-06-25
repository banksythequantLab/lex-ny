/**
 * Disk-backed ring buffer for usage trackers (Bright Data, Groq, etc).
 *
 * Survives Next.js dev server restarts and process recycling, so the
 * /stats and /api/{provider}-stats endpoints reflect actual lifetime
 * counters rather than "calls since the last hot reload".
 *
 * File format: JSON Lines (one JSON-stringified entry per line) under
 * LEX_USAGE_DIR (defaults to process.cwd()/data). Append-only on each
 * record(), capped at MAX_DISK_ENTRIES with a one-shot rotation when
 * the file grows past 2x that.
 *
 * Concurrency: Next.js dev hot-reloads can momentarily have two server
 * processes alive. JSON Lines is safe under concurrent appends on
 * Windows/Linux/macOS because each fs.appendFileSync is a single
 * syscall and we never read-modify-write. Worst case is two records
 * land in non-deterministic order, which is fine for a usage log.
 */
import * as fs from "node:fs";
import * as path from "node:path";
const USAGE_DIR = process.env.LEX_USAGE_DIR ||
    path.join(process.cwd(), "data");
const MAX_DISK_ENTRIES = 5000;
const ROTATE_AT = MAX_DISK_ENTRIES * 2;
function ensureDir() {
    try {
        fs.mkdirSync(USAGE_DIR, { recursive: true });
    }
    catch (e) {
        // Directory creation can race; ignore EEXIST
        const err = e;
        if (err.code !== "EEXIST") {
            console.warn(`[usage-store] mkdir ${USAGE_DIR} failed:`, err.message);
        }
    }
}
function filePath(name) {
    // Sanitize - only [a-z0-9-] allowed in tracker names
    const safe = name.replace(/[^a-z0-9-]/gi, "_");
    return path.join(USAGE_DIR, `${safe}.jsonl`);
}
/**
 * Load the last `limit` entries from disk. Returns [] if the file
 * doesn't exist yet (first run) or is unreadable.
 */
export function loadFromDisk(name, limit) {
    ensureDir();
    const fp = filePath(name);
    if (!fs.existsSync(fp))
        return [];
    try {
        const raw = fs.readFileSync(fp, "utf-8");
        const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
        // Return the last `limit` entries, oldest first
        const tail = lines.slice(-limit);
        const out = [];
        for (const line of tail) {
            try {
                out.push(JSON.parse(line));
            }
            catch {
                // Skip malformed lines (truncated writes from a crash, etc.)
            }
        }
        return out;
    }
    catch (e) {
        console.warn(`[usage-store] loadFromDisk(${name}) failed:`, e.message);
        return [];
    }
}
/**
 * Append one entry to disk. Rotates the file when it grows past
 * ROTATE_AT entries (keeps the last MAX_DISK_ENTRIES).
 */
export function appendToDisk(name, entry) {
    ensureDir();
    const fp = filePath(name);
    try {
        fs.appendFileSync(fp, JSON.stringify(entry) + "\n", "utf-8");
        // Cheap rotation: check size every ~50 appends
        if (Math.random() < 0.02) {
            maybeRotate(fp);
        }
    }
    catch (e) {
        console.warn(`[usage-store] appendToDisk(${name}) failed:`, e.message);
    }
}
function maybeRotate(fp) {
    try {
        const stat = fs.statSync(fp);
        // Rough estimate: average JSON entry ~200 bytes. Rotate when file
        // exceeds 2 * MAX_DISK_ENTRIES * 200 bytes ~= 2MB.
        if (stat.size < 2_000_000)
            return;
        const raw = fs.readFileSync(fp, "utf-8");
        const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
        if (lines.length < ROTATE_AT)
            return;
        const keep = lines.slice(-MAX_DISK_ENTRIES).join("\n") + "\n";
        fs.writeFileSync(fp, keep, "utf-8");
        console.log(`[usage-store] rotated ${fp}: kept last ${MAX_DISK_ENTRIES} of ${lines.length}`);
    }
    catch (e) {
        console.warn(`[usage-store] maybeRotate(${fp}) failed:`, e.message);
    }
}
/**
 * Delete the on-disk log for a tracker. Used by tests; not exposed
 * to runtime callers under normal operation.
 */
export function clearDisk(name) {
    const fp = filePath(name);
    try {
        if (fs.existsSync(fp))
            fs.unlinkSync(fp);
    }
    catch (e) {
        console.warn(`[usage-store] clearDisk(${name}) failed:`, e.message);
    }
}
//# sourceMappingURL=usage-store.js.map