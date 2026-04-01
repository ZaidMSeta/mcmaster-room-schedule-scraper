/**
 * Config.ts
 * Config for scraping, with term specific settings
 */

import path from 'node:path';
import type { Paths, ScrapeConfig } from './types';

// Returns scrape config. termId/termLinkText are left empty here so
// run.ts auto-detects them from the live UI. Override via env vars:
//   TERM_ID=3202610 TERM_LINK_TEXT="2026 Winter" TERM_SEASON=Fall
export function getDefaultConfig(): ScrapeConfig {
  return {
    termId: process.env.TERM_ID ?? '',
    termLinkText: process.env.TERM_LINK_TEXT ?? '',
    cams: 'MCMSTiOFF_MCMSTiMCMST_MCMSTiMHK_MCMSTiSNPOL_MCMSTiCON',
    delayMs: 250,
  };
}
// Computes abs path derived from config
// Writes XML to out/xml/<TERM_ID>/ and logs results to out/results_<TERM_ID>.ndjson
export function getPaths(cfg: ScrapeConfig): Paths {
  const coursesPath = path.join(process.cwd(), 'courses.txt');
  const outDir = path.join(process.cwd(), 'out');
  const xmlDir = path.join(outDir, 'xml', cfg.termId);
  const resultsPath = path.join(outDir, `results_${cfg.termId}.ndjson`);
  return { coursesPath, outDir, xmlDir, resultsPath };
}
