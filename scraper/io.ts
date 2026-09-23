/**
 * io.ts
 * 
 * Contains all filesystem I/O for scraper
 * - create output directories
 * - read an optional course list file (COURSES_FILE) instead of the live term listing
 * - append results to NDJSON log
 * - load processed course codes from NDJSON log
 * - write raw XML responses to out/xml
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Paths } from './types';

// ensure output directories exist
export async function ensureDirs(paths: Paths) {
  await fs.mkdir(paths.xmlDir, { recursive: true });
}
// Read a course list file (one code per line) into a normalized list of course codes.
// Trims whitespace and collapses multiple spaces.
export async function loadCourses(coursesPath: string): Promise<string[]> {
  const raw = await fs.readFile(coursesPath, 'utf8');
  const courses = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, ' '));

  if (courses.length === 0) {
    throw new Error(`${coursesPath} is empty (no course codes to process).`);
  }
  return courses;
}
// Read results_<TERM_ID>.ndjson and return set of already processed courses.
export async function loadProcessed(resultsPath: string): Promise<Set<string>> {
  const processed = new Set<string>();
  try {
    const existing = await fs.readFile(resultsPath, 'utf8');
    for (const line of existing.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj?.course) processed.add(String(obj.course));
      } catch {
        // ignore malformed lines
      }
    }
  } catch {
    // no file yet
  }
  return processed;
}
// Append one record as a single NDJSON line. Append only avoids rewriting large files.
export async function appendResult(resultsPath: string, record: any) {
  await fs.appendFile(resultsPath, JSON.stringify(record) + '\n', 'utf8');
}
// Save the raw XML response for a course
export async function saveCourseXml(termId: string, cnKey: string, xml: string): Promise<{ xmlRel: string; xmlAbs: string }> {
  const safeName = cnKey.replace(/[^\w.-]+/g, '_');
  const xmlRel = path.join('out', 'xml', termId, `${safeName}.xml`);
  const xmlAbs = path.join(process.cwd(), xmlRel);
  await fs.writeFile(xmlAbs, xml, 'utf8');
  return { xmlRel, xmlAbs };
}
