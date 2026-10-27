/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedGuestItem {
  name: string;
  organization: string;
  pax: number;
  hasDegree?: boolean;
}

// Regex for common Indonesian and international academic titles & professional degrees
// e.g. S.Pd., M.T., S.Kom., M.Kom., S.E., M.M., S.Si., M.Si., S.H., M.H., S.Sos., S.Psi.,
// S.Ked., Sp.A., Dr., Prof., Ir., Ph.D., M.Sc., B.A., M.A., Gr., Lc., etc.
const DEGREE_PATTERNS = [
  // S1 degrees: S.Pd, S.T, S.Kom, S.E, S.Si, S.H, S.Sos, S.Psi, S.Ked, S.Ag, S.Sn, S.Stat, S.Farm, S.IP, S.AP, S.Tr.T, etc.
  /^S\.[A-Za-z.]{1,9}\.?$/i,
  // S2 degrees: M.Pd, M.T, M.Kom, M.M, M.Si, M.H, M.Sos, M.Psi, M.Ag, M.Sn, M.Stat, M.Farm, M.Sc, M.A, M.Eng, M.Kn, M.Hum, etc.
  /^M\.[A-Za-z.]{1,9}\.?$/i,
  // S3 / Doctor degrees: Dr., Ph.D, D.Sc, Ed.D
  /^D\.[A-Za-z.]{1,8}\.?$/i,
  /^Ph\.?D\.?$/i,
  // Diploma degrees: A.Md, A.Ma
  /^A\.[A-Za-z.]{1,8}\.?$/i,
  // Bachelor / Master international: B.A., B.Sc., B.Ed., LL.B., LL.M.
  /^B\.[A-Za-z.]{1,8}\.?$/i,
  /^LL\.[BM]\.?$/i,
  // Medical specialties: Sp.A, Sp.PD, Sp.OG, Sp.B, Sp.M, Sp.THT, Sp.An, Sp.JP, Sp.KJ, Sp.Rad, etc.
  /^Sp\.[A-Za-z.]{1,8}\.?$/i,
  // Indonesian Teacher / Professional accreditation & abbreviations
  /^(Gr|Gr\.|IPU|IPM|CPA|CFA|Ak|Ak\.|MBA|MM|MT|MPd|SPd|SKom|MKom|Lc|Lc\.|Apt|Apt\.|Ns|Ns\.)$/i,
];

/**
 * Check if a token looks like an academic degree or professional certification
 */
export function isAcademicDegree(token: string): boolean {
  const clean = token.trim().replace(/[.,;]+$/, (match) => match); // keep dots
  const stripped = clean.trim();
  if (!stripped) return false;

  // Direct pattern checks
  for (const pattern of DEGREE_PATTERNS) {
    if (pattern.test(stripped)) {
      return true;
    }
  }

  // Also catch tokens that consist of 1-3 letters dot 1-4 letters dot (like S.Pd. or S.Pd)
  if (/^[A-Z][a-z]?\.[A-Z][a-z.]*$/i.test(stripped)) {
    return true;
  }

  return false;
}

export type ParseMode = 'smart' | 'name_only' | 'tab' | 'semicolon' | 'dash' | 'pipe';

/**
 * Parse bulk text input into guest items with special handling for academic titles
 */
export function parseBulkGuestInput(
  rawText: string,
  mode: ParseMode = 'smart'
): ParsedGuestItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const results: ParsedGuestItem[] = [];

  for (const line of lines) {
    // Skip common table headers if copied with header
    const lower = line.toLowerCase();
    if (
      (lower.startsWith('nama') || lower.startsWith('name')) &&
      (lower.includes('instansi') || lower.includes('perusahaan') || lower.includes('pax') || lower.includes('jumlah'))
    ) {
      continue;
    }

    // MODE: Name Only (1 baris = 1 tamu utuh, koma gelar dijamin aman 100%)
    if (mode === 'name_only') {
      const cleanName = line.replace(/^["']|["']$/g, '').trim();
      if (cleanName) {
        results.push({
          name: cleanName,
          organization: '',
          pax: 1,
          hasDegree: cleanName.includes(',') && cleanName.split(',').slice(1).some(isAcademicDegree),
        });
      }
      continue;
    }

    // Explicit separator modes
    if (mode === 'tab') {
      results.push(parseSeparatedLine(line.split('\t')));
      continue;
    }
    if (mode === 'semicolon') {
      results.push(parseSeparatedLine(line.split(';')));
      continue;
    }
    if (mode === 'dash') {
      results.push(parseSeparatedLine(line.split(' - ')));
      continue;
    }
    if (mode === 'pipe') {
      results.push(parseSeparatedLine(line.split('|')));
      continue;
    }

    // MODE: 'smart' (AI / Regex Intelligent Auto-detection)
    // 1. If tab is present (user copied from Excel or Google Sheets)
    if (line.includes('\t')) {
      results.push(parseSeparatedLine(line.split('\t')));
      continue;
    }

    // 2. If pipe is present (e.g. Tukiman, S.Pd. | SMPN 1 | 2)
    if (line.includes('|')) {
      results.push(parseSeparatedLine(line.split('|')));
      continue;
    }

    // 3. If semicolon is present (e.g. Tukiman, S.Pd., M.T. ; SMPN 1 ; 2)
    if (line.includes(';')) {
      results.push(parseSeparatedLine(line.split(';')));
      continue;
    }

    // 4. If dash with spaces is present (e.g. Tukiman, S.Pd., M.T. - SMPN 1)
    if (line.includes(' - ')) {
      results.push(parseSeparatedLine(line.split(' - ')));
      continue;
    }

    // 5. Handling comma and academic degrees:
    // When a line contains commas, we must differentiate between:
    // Case A: Comma inside an academic title: "Tukiman, S.Pd., M.T."
    // Case B: Comma separating name with degrees and organization: "Tukiman, S.Pd., M.T., SMPN 1 Bandung, 2"
    // Case C: Standard CSV with quotes: '"Tukiman, S.Pd., M.T.", "SMPN 1 Bandung", 2'
    if (line.includes(',')) {
      const parsedFromComma = parseSmartCommaLine(line);
      if (parsedFromComma) {
        results.push(parsedFromComma);
        continue;
      }
    }

    // 6. Fallback: single name without delimiters
    const clean = line.replace(/^["']|["']$/g, '').trim();
    if (clean) {
      results.push({
        name: clean,
        organization: '',
        pax: 1,
      });
    }
  }

  return results.filter((item) => item.name && item.name.trim().length > 0);
}

/**
 * Helper to parse a line that has already been split by a trusted delimiter (tab, semicolon, pipe, dash)
 */
function parseSeparatedLine(parts: string[]): ParsedGuestItem {
  const cleanParts = parts.map((p) => p.trim().replace(/^["']|["']$/g, ''));
  const name = cleanParts[0] || '';
  const org = cleanParts[1] || '';
  const rawPax = cleanParts[2] || '';
  const parsedPax = parseInt(rawPax, 10);
  const pax = isNaN(parsedPax) || parsedPax < 1 ? 1 : parsedPax;

  const hasDegree = name.includes(',') && name.split(',').slice(1).some(isAcademicDegree);

  return {
    name,
    organization: org,
    pax,
    hasDegree,
  };
}

/**
 * Intelligent parser for lines with commas, respecting Indonesian academic titles (S.Pd., M.T., etc.)
 */
function parseSmartCommaLine(line: string): ParsedGuestItem | null {
  // If line uses CSV quotes, handle quoted fields first:
  // e.g. "Tukiman, S.Pd., M.T.", "SMPN 1", 2
  if (line.includes('"')) {
    const quoteRegex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    const matches: string[] = [];
    let match;
    const csvRegex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    while ((match = csvRegex.exec(line)) !== null) {
      let val = match[1];
      if (val !== undefined && val.length > 0) {
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        matches.push(val.trim());
      }
      if (match.index === csvRegex.lastIndex) {
        csvRegex.lastIndex++;
      }
    }
    if (matches.length > 0) {
      return parseSeparatedLine(matches);
    }
  }

  // Tokenize by comma
  const rawChunks = line.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
  if (rawChunks.length === 0) return null;

  if (rawChunks.length === 1) {
    return {
      name: rawChunks[0],
      organization: '',
      pax: 1,
    };
  }

  // Chunk 0 is the beginning of the name (e.g. "Tukiman" or "Drs. H. Tukiman")
  let nameParts: string[] = [rawChunks[0]];
  let org = '';
  let pax = 1;
  let degreeDetected = false;

  let i = 1;
  // Accumulate all consecutive chunks that match academic titles or professional degrees
  while (i < rawChunks.length) {
    const chunk = rawChunks[i];
    if (isAcademicDegree(chunk)) {
      nameParts.push(chunk);
      degreeDetected = true;
      i++;
    } else {
      break;
    }
  }

  // Now, check remaining chunks (if any)
  if (i < rawChunks.length) {
    const remaining = rawChunks.slice(i);
    // If the last remaining chunk is a pure integer, it's pax!
    const lastChunk = remaining[remaining.length - 1];
    const maybePax = parseInt(lastChunk, 10);

    if (!isNaN(maybePax) && /^\d+$/.test(lastChunk)) {
      pax = maybePax > 0 ? maybePax : 1;
      remaining.pop();
    }

    // Any remaining non-numeric chunks are institution/organization
    if (remaining.length > 0) {
      org = remaining.join(', ');
    }
  }

  const fullName = nameParts.join(', ');

  return {
    name: fullName,
    organization: org,
    pax,
    hasDegree: degreeDetected,
  };
}
