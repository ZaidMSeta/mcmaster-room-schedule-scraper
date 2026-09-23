/**
 * Config.ts
 * Config for scraping, with term specific settings
 */

import path from 'node:path';
import type { Paths, ScrapeConfig } from './types';

// Returns scrape config. termId/termLinkText are left empty here so
// run.ts auto-detects the term currently in session. Override via env vars:
//   TERM_ID=3202710            (name looked up automatically)
//   TERM_SEASON=Winter         (next/current term of that season)
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
  const outDir = path.join(process.cwd(), 'out');
  const xmlDir = path.join(outDir, 'xml', cfg.termId);
  const resultsPath = path.join(outDir, `results_${cfg.termId}.ndjson`);
  return { outDir, xmlDir, resultsPath };
}
