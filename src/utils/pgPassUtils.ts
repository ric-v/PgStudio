/**
 * pgPassUtils.ts
 *
 * Explicit, OS-aware reader for PostgreSQL's password file (.pgpass / pgpass.conf).
 *
 * Why this exists
 * ---------------
 * The `pg` library calls the `pgpass` npm package internally to look up
 * passwords, but only AFTER the client is constructed and only when password
 * is null/undefined.  If the lookup returns undefined (file missing, wrong
 * path, no matching entry) the password stays null, and SCRAM-SHA-256
 * authentication throws:
 *
 *   "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"
 *
 * This module lets callers resolve the password **before** constructing the
 * pg Client, so we can:
 *   1. Pass the resolved password explicitly → pg never reaches the null case.
 *   2. Surface a clear, actionable error message that includes the expected
 *      file path for the user's OS when no password can be found.
 *
 * File locations (mirrors libpq / pgpass npm package behaviour)
 * -------------------------------------------------------------
 *   PGPASSFILE env var  →  whatever it points to (any OS)
 *   Windows (win32)     →  %APPDATA%\postgresql\pgpass.conf
 *   Unix / macOS        →  ~/.pgpass
 *
 * File format (RFC-like)
 * ----------------------
 *   hostname:port:database:username:password
 *   - Each line is one entry.
 *   - Lines starting with # are comments.
 *   - Each of the first four fields may be a literal value or * (wildcard).
 *   - Colons and backslashes inside field values must be escaped as \: and \\.
 *   - The password field is everything after the 4th colon (may contain colons).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the pgpass file that would be consulted on the
 * current machine.  Useful for generating actionable error messages.
 */
export function getPgPassFilePath(): string {
    if (process.env.PGPASSFILE) {
        return process.env.PGPASSFILE;
    }
    if (process.platform === 'win32') {
        // %APPDATA% is normally set on Windows; fall back to home dir if not.
        const appData = process.env.APPDATA || os.homedir();
        return path.join(appData, 'postgresql', 'pgpass.conf');
    }
    return path.join(os.homedir(), '.pgpass');
}

/**
 * Look up a password in the pgpass file for the given connection parameters.
 *
 * @returns The matching password string, or `undefined` if no entry matched
 *          (file absent, unreadable, or no entry for those parameters).
 */
export function resolvePgPassPassword(
    host: string,
    port: number | string,
    database: string,
    user: string,
): string | undefined {
    const filePath = getPgPassFilePath();

    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch {
        // File absent or unreadable — not an error in itself.
        return undefined;
    }

    const portStr = String(port);

    // Normalise line endings (Windows files inside a cross-platform repo may
    // use CRLF even when the runtime is Linux, and vice-versa on Windows).
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Skip blank lines and comments.
        if (!line || line.startsWith('#')) {
            continue;
        }

        const fields = splitPgPassLine(line);
        if (fields === null) {
            // Malformed line (fewer than 5 fields) — skip.
            continue;
        }

        const [pgHost, pgPort, pgDatabase, pgUser, ...passwordParts] = fields;
        // The password is everything after the 4th colon (already unescaped by
        // splitPgPassLine), re-joined with ':' in case colons were escaped in
        // the original but we've already unescaped them as individual chars.
        const pgPassword = passwordParts.join(':');

        if (
            fieldMatches(pgHost, host) &&
            fieldMatches(pgPort, portStr) &&
            fieldMatches(pgDatabase, database) &&
            fieldMatches(pgUser, user)
        ) {
            return pgPassword;
        }
    }

    return undefined;
}

/**
 * Same as `resolvePgPassPassword` but wrapped in a Promise for callers that
 * prefer async/await.  The underlying file read is synchronous (pgpass files
 * are tiny), so this is just a convenience wrapper.
 */
export async function resolvePgPassPasswordAsync(
    host: string,
    port: number | string,
    database: string,
    user: string,
): Promise<string | undefined> {
    return resolvePgPassPassword(host, port, database, user);
}

/**
 * Returns a human-readable description of the pgpass file location for the
 * current OS — suitable for embedding in error messages shown to the user.
 *
 * Example outputs:
 *   Windows  →  "C:\Users\alice\AppData\Roaming\postgresql\pgpass.conf"
 *   Unix     →  "/home/alice/.pgpass"
 *   Custom   →  "/custom/path/pgpass" (via PGPASSFILE env var)
 */
export function pgPassFileDescription(): string {
    const filePath = getPgPassFilePath();
    if (process.env.PGPASSFILE) {
        return `${filePath} (set by PGPASSFILE environment variable)`;
    }
    if (process.platform === 'win32') {
        return `${filePath}  (Windows: %%APPDATA%%\\postgresql\\pgpass.conf)`;
    }
    return `${filePath}  (Unix/macOS: ~/.pgpass)`;
}

/**
 * Returns true when the pgpass file exists and is readable.
 */
export function pgPassFileExists(): boolean {
    try {
        fs.accessSync(getPgPassFilePath(), fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Split one pgpass line into its (already-unescaped) fields.
 *
 * Returns null if the line has fewer than 5 fields after parsing.
 *
 * Escaping rules (from libpq docs):
 *   \\  →  \
 *   \:  →  :
 * Any other \X sequence is left as-is (backslash dropped, X kept) to match
 * the behaviour of the reference pgpass npm package.
 */
function splitPgPassLine(line: string): string[] | null {
    const fields: string[] = [];
    let current = '';
    let i = 0;

    while (i < line.length) {
        const ch = line[i];

        if (ch === '\\' && i + 1 < line.length) {
            // Consume the backslash and treat the next character literally.
            current += line[i + 1];
            i += 2;
        } else if (ch === ':') {
            fields.push(current);
            current = '';
            i++;
        } else {
            current += ch;
            i++;
        }
    }

    // Push the last field (the password, which may contain colons that have
    // already been unescaped above).
    fields.push(current);

    return fields.length >= 5 ? fields : null;
}

/**
 * Return true when pgpass `pattern` matches the connection `value`.
 * A pattern of `*` matches any value.
 */
function fieldMatches(pattern: string, value: string): boolean {
    return pattern === '*' || pattern === value;
}
