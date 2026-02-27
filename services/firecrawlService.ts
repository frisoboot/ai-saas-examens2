/**
 * Firecrawl Service
 *
 * Frontend service voor het extraheren van examenvragen uit PDF's via Firecrawl.
 * Roept de /api/firecrawl-scrape serverless functie aan.
 */

import { BulkImportQuestion, StudentLevel } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface FirecrawlScrapeResponse {
  success: boolean;
  questions: BulkImportQuestion[];
  metadata: {
    questionsFound: number;
  };
  error?: string;
}

/**
 * Extraheer examenvragen uit een PDF via Firecrawl
 * @param url - Publieke URL van de geüploade PDF (Supabase Storage)
 * @param subject - Vak
 * @param level - Niveau (VMBO-TL, HAVO, VWO)
 * @param examYear - Examenjaar
 * @param authToken - Supabase auth token (Bearer)
 * @param signal - Optional AbortController signal voor annulering
 */
export const scrapeExamFromPdf = async (
  url: string,
  subject: string,
  level: StudentLevel,
  examYear: number,
  authToken: string,
  signal?: AbortSignal
): Promise<FirecrawlScrapeResponse> => {
  const response = await fetch(`${API_BASE}/api/firecrawl-scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ url, subject, level, examYear }),
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Scrape mislukt (${response.status})`);
  }

  return data;
};
