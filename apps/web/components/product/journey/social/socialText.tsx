'use client';

import { Fragment, type ReactNode } from 'react';

/**
 * Renders Arabic copy while keeping Latin model names (e.g. SERENITY) isolated
 * with their own bidi direction, so the Arabic sentence keeps its natural RTL
 * flow and the product name is not reordered. For LTR copy the text is returned
 * unchanged.
 */
const LATIN_TOKEN = /([A-Za-z0-9][A-Za-z0-9'’&._+#-]*)/g;

export function IsolatedText({ text, isolateLatin = false }: { text: string; isolateLatin?: boolean }): ReactNode {
  if (!isolateLatin) return text;
  const parts: Array<{ value: string; latin: boolean }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(LATIN_TOKEN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ value: text.slice(lastIndex, index), latin: false });
    parts.push({ value: match[0], latin: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ value: text.slice(lastIndex), latin: false });
  return (
    <>
      {parts.map((part, index) => (part.latin ? (
        <bdi key={`latin-${index}`} lang="en" dir="ltr">{part.value}</bdi>
      ) : (
        <Fragment key={`text-${index}`}>{part.value}</Fragment>
      )))}
    </>
  );
}

/** Short, single-line excerpt of the exact caption saved on a snapshot. */
export function captionExcerpt(caption: string, maxLength = 96): string {
  const clean = caption.replace(/\s+/g, ' ').trim();
  const characters = [...clean];
  if (characters.length <= maxLength) return clean;
  return `${characters.slice(0, maxLength - 1).join('')}…`;
}
