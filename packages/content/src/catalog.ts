import type { ContentDocument } from './validate-content.js';

/**
 * Production content catalog. T003 keeps it intentionally empty until content
 * tickets add milestone data. Partial catalogs are valid when every included
 * reference resolves inside the same catalog.
 */
export const CURRENT_CONTENT_DOCUMENTS: readonly ContentDocument[] = [];
