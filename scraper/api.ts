/**
 * api.ts
 * 
 * Client for MyTimetables API endpoints to use for scraping
 * 
 * - creates an xml parser with consistent settings
 * - call api/courses/suggestions to get a valid course to generate t/e tokens for template
 * - call /api/string-to-filter to resolve ccourse codes
 */

import type { Page } from '@playwright/test';
import { XMLParser } from 'fast-xml-parser';
import type { ResolveResult, ScrapeConfig } from './types';

export function makeXmlParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });
}
// Build the suggestions endpoint URL.
// returns XML containing course suggestion labels used by the UI dropdown.

export async function getSuggestionLabels(page: Page, cfg: ScrapeConfig, xmlParser: XMLParser): Promise<string[]> {
  const suggestionsUrl =
    `https://mytimetable.mcmaster.ca/api/courses/suggestions` +
    `?term=${cfg.termId}` +
    `&cams=${cfg.cams}` +
    `&course_add=a` +
    `&page_num=0&sco=0&sio=1&already=` +
    `&_=${Date.now()}`;

  const res = await page.request.get(suggestionsUrl, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });

  if (res.status() !== 200) {
    throw new Error(`suggestions endpoint returned HTTP ${res.status()}`);
  }

  const xml = await res.text();
  const obj = xmlParser.parse(xml);

  const rs = obj?.add_suggest?.results?.rs;
  const items = Array.isArray(rs) ? rs : rs ? [rs] : [];
  return items.map((it: any) => it['#text']).filter(Boolean);
}
// MyTimetable encodes dates as days since 2007-12-31 (e.g. d1="6819" -> 2026-09-01).
const MT_EPOCH_MS = Date.UTC(2007, 11, 31);
function todayMtDay(): number {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - MT_EPOCH_MS) / 86_400_000);
}

type TermInfo = { id: string; name: string; d1: number; d2: number };

// criteria.jsp embeds every available term as EE.initEntrance({ "<termId>": { name, d1, d2, ... } }).
async function listTerms(page: Page): Promise<TermInfo[]> {
  const res = await page.request.get('https://mytimetable.mcmaster.ca/criteria.jsp');
  const html = await res.text();
  const marker = 'EE.initEntrance(';
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error('Could not find EE.initEntrance() in criteria.jsp');

  // Walk braces to extract the JSON object argument
  const start = idx + marker.length;
  let depth = 0;
  let end = start;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) { end = i + 1; break; }
  }
  const data = JSON.parse(html.slice(start, end)) as Record<string, { name?: string; d1?: string; d2?: string }>;

  return Object.entries(data)
    .filter(([id, info]) => id && info?.name)
    .map(([id, info]) => ({ id, name: info.name!, d1: Number(info.d1), d2: Number(info.d2) }))
    .sort((a, b) => a.d1 - b.d1);
}

// Picks the term that is in session today (or the next one to start).
// Respects TERM_ID / TERM_LINK_TEXT env vars as hard overrides,
// and TERM_SEASON (e.g. "Winter", "Fall") to prefer a specific season.
export async function detectTerm(page: Page): Promise<{ termId: string; termLinkText: string }> {
  if (process.env.TERM_ID && process.env.TERM_LINK_TEXT) {
    return { termId: process.env.TERM_ID, termLinkText: process.env.TERM_LINK_TEXT };
  }

  const terms = await listTerms(page);
  if (!terms.length) throw new Error('No terms found on criteria.jsp');

  if (process.env.TERM_ID) {
    const match = terms.find((t) => t.id === process.env.TERM_ID);
    if (!match) throw new Error(`TERM_ID=${process.env.TERM_ID} not found; available: ${terms.map((t) => `${t.id} (${t.name})`).join(', ')}`);
    return { termId: match.id, termLinkText: match.name };
  }

  const preferSeason = (process.env.TERM_SEASON ?? '').toLowerCase().trim();
  const candidates = preferSeason ? terms.filter((t) => t.name.toLowerCase().includes(preferSeason)) : terms;
  if (!candidates.length) throw new Error(`No term matching TERM_SEASON="${preferSeason}"`);

  const today = todayMtDay();
  const picked =
    candidates.find((t) => t.d1 <= today && today <= t.d2) ??
    candidates.find((t) => t.d1 > today) ??
    candidates[candidates.length - 1];

  return { termId: picked.id, termLinkText: picked.name };
}

// Resolve a human readable course code into the internal
// identifiers required by /api/class-data:
// - cnKey: internal course key
// - va: value the backend expects alongside cnKey (not sure what it represents)
//
// The endpoint returns JSON and takes the first match.
export async function resolveCourse(page: Page, cfg: ScrapeConfig, humanCourse: string): Promise<ResolveResult> {
  const res = await page.request.post('https://mytimetable.mcmaster.ca/api/string-to-filter', {
    form: {
      term: cfg.termId,
      validations: '',
      itemnames: humanCourse,
      input: humanCourse.toLowerCase(),
      reason: 'CODE_NUMBER',
      current: '',
      isimport: '0',
      strict: '0',
    },
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });

  const arr = await res.json();
  const first = arr?.[0];

  if (!first) return { ok: false, error: 'No resolver result' };
  if (first.error) return { ok: false, error: String(first.error) };

  return { ok: true, cnKey: String(first.cnKey), va: String(first.va) };
}
