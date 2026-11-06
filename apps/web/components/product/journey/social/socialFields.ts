import type {
  PresentationSocialPost,
  SocialAttemptSnapshot,
  SocialDraft,
} from '../../../../demo/poc/api/flow-contract';

/** Editable social copy, kept as plain strings so the form is trivially dirty-checkable. */
export interface SocialFields {
  caption: string;
  cta: string;
  hashtags: string;
}

export function fieldsFromDraft(draft: SocialDraft): SocialFields {
  return { caption: draft.caption, cta: draft.cta, hashtags: draft.hashtags.join(' ') };
}

export function fieldsFromPreset(preset: PresentationSocialPost): SocialFields {
  return { caption: preset.caption, cta: preset.cta, hashtags: preset.hashtags.join(' ') };
}

export function fieldsFromSnapshot(snapshot: SocialAttemptSnapshot): SocialFields {
  return { caption: snapshot.caption, cta: snapshot.cta, hashtags: snapshot.hashtags.join(' ') };
}

/**
 * Hashtags stay as typed; the MockApi stores the exact strings. Commas/space
 * separate chips, and a missing leading '#' is normalised so preview and saved
 * content match the Instagram-style presentation.
 */
export function parseHashtags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token) => (token.startsWith('#') ? token : `#${token}`));
}

export function fieldsEqual(left: SocialFields | null, right: SocialFields | null): boolean {
  if (!left || !right) return left === right;
  return left.caption === right.caption && left.cta === right.cta && left.hashtags === right.hashtags;
}
