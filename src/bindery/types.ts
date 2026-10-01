import type { CoverColorName, CoverPattern, LanguageCode, StickerName } from './constants';

export interface BookDetails {
  title: string;
  author: string;
  language: LanguageCode;
  description: string;
}

export interface CoverSettings {
  color: CoverColorName;
  pattern: CoverPattern;
  sticker: StickerName;
  /** Object URL of an uploaded picture, or '' to use the generated cover. */
  imageUrl: string;
}

export interface ChapterContent {
  title: string;
  /** XHTML body of the chapter, already sanitised. */
  html: string;
  words: number;
}

export interface Chapter extends ChapterContent {
  id: number;
}

/** The readable parts of an EPUB that was opened in the converter. */
export interface OpenedEpub {
  title: string;
  author: string;
  /** One `<body>` per spine item, in reading order. */
  sections: HTMLElement[];
}

export type ConversionState =
  | { status: 'loading'; filename: string }
  | { status: 'error'; filename: string; message: string }
  | ({ status: 'ready'; filename: string } & OpenedEpub);

export type TextFormat = 'plain' | 'markdown';
