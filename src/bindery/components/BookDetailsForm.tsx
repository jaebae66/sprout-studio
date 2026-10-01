import { LANGUAGES, type LanguageCode } from '../constants';
import type { BookDetails } from '../types';
import { Field } from './Field';

interface BookDetailsFormProps {
  book: BookDetails;
  onChange: <K extends keyof BookDetails>(field: K, value: BookDetails[K]) => void;
}

export function BookDetailsForm({ book, onChange }: BookDetailsFormProps) {
  return (
    <>
      <Field id="book-title" label="Title">
        <input
          type="text"
          id="book-title"
          value={book.title}
          onChange={(event) => onChange('title', event.target.value)}
        />
      </Field>

      <div className="two">
        <Field id="book-author" label="Author">
          <input
            type="text"
            id="book-author"
            placeholder="Your name"
            value={book.author}
            onChange={(event) => onChange('author', event.target.value)}
          />
        </Field>
        <Field id="book-language" label="Language">
          <select
            id="book-language"
            value={book.language}
            onChange={(event) => onChange('language', event.target.value as LanguageCode)}
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="book-description" label="Short description (optional)">
        <input
          type="text"
          id="book-description"
          placeholder="What is this book about?"
          value={book.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </Field>
    </>
  );
}
