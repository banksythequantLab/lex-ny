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
/**
 * Load the last `limit` entries from disk. Returns [] if the file
 * doesn't exist yet (first run) or is unreadable.
 */
export declare function loadFromDisk<T>(name: string, limit: number): T[];
/**
 * Append one entry to disk. Rotates the file when it grows past
 * ROTATE_AT entries (keeps the last MAX_DISK_ENTRIES).
 */
export declare function appendToDisk<T>(name: string, entry: T): void;
/**
 * Delete the on-disk log for a tracker. Used by tests; not exposed
 * to runtime callers under normal operation.
 */
export declare function clearDisk(name: string): void;
//# sourceMappingURL=usage-store.d.ts.map