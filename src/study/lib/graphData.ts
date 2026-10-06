import type { Note, Subject } from '../types';
import { buildKeywordIndex, relatedPairs, topKeywords } from './keywords';
import { linkedNames, nameKey } from './notes';
import { guideName, isGuide, mentionsSubject } from './studyGuide';

export type NodeKind = 'note' | 'missing' | 'subject';
/** link: a [[link]] you wrote · related: shares keywords · subject: the note mentions a class. */
export type EdgeKind = 'link' | 'related' | 'subject';

export interface GraphNodeData {
  key: string;
  label: string;
  kind: NodeKind;
  /** The note to open when clicked; for a class, its study guide. */
  open: string;
  /** For a class, which one (so its study guide can be made if it doesn't exist yet). */
  subjectId?: string;
  /** A note's top keywords, shown when hovering. */
  keywords: string[];
}

export interface GraphEdgeData {
  from: string;
  to: string;
  kind: EdgeKind;
  /** For related notes: the keywords they share. */
  shared?: string[];
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface GraphOptions {
  links: boolean;
  related: boolean;
  subjects: boolean;
}

const subjectKey = (subject: Subject) => `subject:${subject.id}`;

/**
 * Everything the graph shows: notes, classes (standing in for their study guides),
 * and three kinds of connection that can each be turned on or off.
 */
export function buildGraphData(allNotes: readonly Note[], subjects: readonly Subject[], options: GraphOptions): GraphData {
  // Study guides link to every note in their class, so the class node stands in for them.
  const notes = allNotes.filter((note) => !isGuide(note, subjects));
  const index = buildKeywordIndex(notes);
  const nodes = new Map<string, GraphNodeData>();
  const edges: GraphEdgeData[] = [];
  const connected = new Set<string>();
  const pairKey = (a: string, b: string) => [a, b].sort().join('\u0000');

  for (const note of notes) {
    nodes.set(nameKey(note.name), { key: nameKey(note.name), label: note.name, kind: 'note', open: note.name, keywords: topKeywords(index, note.name, 4) });
  }

  if (options.links) {
    for (const note of notes) {
      const from = nameKey(note.name);
      for (const target of linkedNames(note.body)) {
        if (target === from || connected.has(pairKey(from, target))) continue;
        if (!nodes.has(target)) {
          // Linked to, but not written yet. Guides aren't drawn as notes.
          if (allNotes.some((other) => nameKey(other.name) === target)) continue;
          nodes.set(target, { key: target, label: target, kind: 'missing', open: target, keywords: [] });
        }
        connected.add(pairKey(from, target));
        edges.push({ from, to: target, kind: 'link' });
      }
    }
  }

  if (options.related) {
    for (const { from, to, relation } of relatedPairs(notes, index)) {
      const key = pairKey(nameKey(from), nameKey(to));
      if (connected.has(key)) continue;
      connected.add(key);
      edges.push({ from: nameKey(from), to: nameKey(to), kind: 'related', shared: relation.shared.slice(0, 4) });
    }
  }

  if (options.subjects) {
    for (const subject of subjects) {
      const key = subjectKey(subject);
      nodes.set(key, { key, label: subject.code || subject.name, kind: 'subject', open: guideName(subject), subjectId: subject.id, keywords: subject.code ? [subject.name] : [] });
      for (const note of notes) {
        if (mentionsSubject(note, subject)) edges.push({ from: key, to: nameKey(note.name), kind: 'subject' });
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}
