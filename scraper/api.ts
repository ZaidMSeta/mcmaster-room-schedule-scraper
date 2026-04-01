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
// Resolve a human readable course code into the internal
// identifiers required by /api/class-data:
// - cnKey: internal course key
// - va: value the backend expects alongside cnKey (not sure what it represents)
//
// The endpoint returns JSON and takes the first match.

// Reads the term selection cards on the criteria page and picks the most recent term.
// Respects TERM_ID / TERM_LINK_TEXT env vars as hard overrides,
// and TERM_SEASON (e.g. "Winter", "Fall") to prefer a specific season.
export async function detectTerm(page: Page): Promise<{ termId: string; termLinkText: string }> {
  if (process.env.TERM_ID && process.env.TERM_LINK_TEXT) {
    return { termId: process.env.TERM_ID, termLinkText: process.env.TERM_LINK_TEXT };
  }

  await page.goto('https://mytimetable.mcmaster.ca/criteria.jsp');
  const termLinks = page.locator('a.term-card-title');
  await termLinks.first().waitFor({ state: 'visible' });

  const terms = await termLinks.evaluateAll((els) => {
    return els
      .map((a) => {
        const label = (a.textContent ?? '').trim();
        const href = (a as HTMLAnchorElement).getAttribute('href') ?? '';
        const m = href.match(/caseTermContinue\((\d+)\)/);
        const id = m ? m[1] : null;
        return id && label ? { id, label } : null;
      })
      .filter(Boolean) as { id: string; label: string }[];
  });

  if (!terms.length) throw new Error('No term cards found on criteria.jsp');

  const yearFrom = (label: string) => { const m = label.match(/(20\d\d)/); return m ? Number(m[1]) : 0; };
  const seasonRank = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('winter')) return 1;
    if (l.includes('spring') || l.includes('summer')) return 2;
    if (l.includes('fall')) return 3;
    return 0;
  };

  const preferSeason = (process.env.TERM_SEASON ?? '').toLowerCase().trim();
  const filtered = preferSeason ? terms.filter((t) => t.label.toLowerCase().includes(preferSeason)) : terms;

  const picked = [...(filtered.length ? filtered : terms)].sort((a, b) => {
    const yearDiff = yearFrom(b.label) - yearFrom(a.label);
    return yearDiff !== 0 ? yearDiff : seasonRank(b.label) - seasonRank(a.label);
  })[0];

  return { termId: picked.id, termLinkText: picked.label };
}

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
