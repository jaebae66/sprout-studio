import { Panel } from '../../shared/components/Panel';
import { FREE_LIBRARIES } from '../constants';

export function FreeBookShelf() {
  return (
    <Panel title="📚 Find free books">
      <p className="muted">
        These libraries let you download EPUBs legally and for free, mostly classics whose copyright has ended. Open a
        book there, choose the EPUB download, then bring it here or straight to your e-reader.
      </p>
      <div className="shelf">
        {FREE_LIBRARIES.map(({ name, description, url }) => (
          <a key={name} href={url} target="_blank" rel="noopener">
            <b>{name}</b>
            <span>{description}</span>
          </a>
        ))}
      </div>
    </Panel>
  );
}
