import type { Note } from '../types';

/**
 * Finds the important words in notes and which notes are about the same things,
 * with no AI or internet: words that are common in a note but rare across all your
 * notes count most (TF-IDF), and highlighted, bold, heading and title words count extra.
 */

const STOPWORDS = new Set(
  `a about above after again against all also although always am among an and another any are around as at back be
  because been before being below between both but by can cannot could did does doing done down during each either
  else enough even ever every few for from further get gets getting give given go goes going gone got had has have
  having he her here hers herself him himself his how however i if in into is it its itself just keep know known
  last least less let like likely made make makes making many may maybe me might mine more most much must my myself
  need never new next no none nor not nothing now of off often on once one only onto or other others otherwise our
  ours out over own part per perhaps please put quite rather really said same say says see seen seem seems several
  shall she should show since so some something sometimes still such take than that the their theirs them themselves
  then there these they thing things this those though through thus to too toward under until up upon us use used
  uses using very via want was way we well were what whatever when where whether which while who whom whose why will
  with within without would yes yet you your yours yourself also etc eg ie vs note notes todo done today tomorrow
  yesterday week chapter page pages example examples question questions answer answers summary key idea ideas tip
  memo remember important careful quote first second third lot lots kind kinds sort type types
  lecture lesson class week unit topic module semester homework assignment study guide hold made`.split(/\s+/),
);

/** Markdown and HTML bits that aren't words. */
function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[!\w+\]/g, ' ')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_link, target: string, shown?: string) => ` ${shown ?? target} `)
    .replace(/\]\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
}

/** A rough singular, so "cells" and "cell" count as the same word. */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('es') && /(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** The meaningful words in some text, lower-cased and singular. */
export function words(text: string): string[] {
  return (plainText(text).toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [])
    .map((word) => stem(word.replace(/^'+|'+$/g, '').replace(/'s$/, '')))
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

/** Text the writer marked as important: highlights, bold, headings and card titles. */
function emphasised(body: string): string {
  const parts: string[] = [];
  for (const match of body.matchAll(/==([^=\n]+)==|<mark[^>]*>([^<\n]+)<\/mark>|\*\*([^*\n]+)\*\*/g)) parts.push(match[1] ?? match[2] ?? match[3]);
  for (const match of body.matchAll(/^#{1,6}\s+(.+)$/gm)) parts.push(match[1]);
  for (const match of body.matchAll(/^>\s*\[!\w+\]\s*(.+)$/gm)) parts.push(match[1]);
  return parts.join(' ');
}

/** How often each word appears in a note, with emphasised and title words counting three times. */
function termCounts(note: Note): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (list: string[], weight: number) => list.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + weight));
  add(words(note.body), 1);
  add(words(emphasised(note.body)), 2);
  add(words(note.name), 3);
  return counts;
}

export interface KeywordIndex {
  /** Each note's words, weighted by how much they say about that note (TF-IDF). Keyed by note name. */
  vectors: Map<string, Map<string, number>>;
}

export function buildKeywordIndex(notes: readonly Note[]): KeywordIndex {
  const counts = notes.map((note) => [note.name, termCounts(note)] as const);
  const documents = new Map<string, number>();
  for (const [, terms] of counts) for (const term of terms.keys()) documents.set(term, (documents.get(term) ?? 0) + 1);

  const total = Math.max(notes.length, 1);
  const vectors = new Map<string, Map<string, number>>();
  for (const [name, terms] of counts) {
    const vector = new Map<string, number>();
    for (const [term, count] of terms) {
      // Rarer words say more; a word in every note says almost nothing.
      const rarity = Math.log(1 + total / (documents.get(term) ?? 1));
      vector.set(term, (1 + Math.log(count)) * rarity);
    }
    vectors.set(name, vector);
  }
  return { vectors };
}

/** A note's top keywords, most important first. */
export function topKeywords(index: KeywordIndex, name: string, limit = 6): string[] {
  const vector = index.vectors.get(name);
  if (!vector) return [];
  return [...vector.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

export interface Relation {
  /** How alike the two notes are, 0 to 1. */
  score: number;
  /** The words they have in common, most important first. */
  shared: string[];
}

/** How alike two notes are by their keywords (cosine similarity). */
export function relation(index: KeywordIndex, first: string, second: string): Relation {
  const a = index.vectors.get(first);
  const b = index.vectors.get(second);
  if (!a || !b || !a.size || !b.size) return { score: 0, shared: [] };
  let dot = 0;
  const shared: [string, number][] = [];
  for (const [term, weight] of a) {
    const other = b.get(term);
    if (other === undefined) continue;
    dot += weight * other;
    shared.push([term, weight * other]);
  }
  const length = (vector: Map<string, number>) => Math.sqrt([...vector.values()].reduce((sum, weight) => sum + weight * weight, 0));
  return {
    score: dot / (length(a) * length(b)),
    shared: shared.sort((x, y) => y[1] - x[1]).map(([term]) => term),
  };
}

/** Notes count as related at this score or above, sharing at least two keywords. */
export const RELATED_SCORE = 0.12;

/** Pairs of related notes: each note keeps its few closest matches, so the graph doesn't turn into a hairball. */
export function relatedPairs(notes: readonly Note[], index = buildKeywordIndex(notes), perNote = 3) {
  const best = new Map<string, { other: string; relation: Relation }[]>();
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const found = relation(index, notes[i].name, notes[j].name);
      if (found.score < RELATED_SCORE || found.shared.length < 2) continue;
      for (const [from, to] of [[notes[i].name, notes[j].name], [notes[j].name, notes[i].name]]) {
        if (!best.has(from)) best.set(from, []);
        best.get(from)!.push({ other: to, relation: found });
      }
    }
  }
  const pairs = new Map<string, { from: string; to: string; relation: Relation }>();
  for (const [from, list] of best) {
    list.sort((first, second) => second.relation.score - first.relation.score);
    for (const { other, relation: found } of list.slice(0, perNote)) {
      const key = [from, other].sort().join('\u0000');
      if (!pairs.has(key)) pairs.set(key, { from, to: other, relation: found });
    }
  }
  return [...pairs.values()];
}
