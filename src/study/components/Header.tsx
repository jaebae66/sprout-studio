import { TIPS } from '../constants';
import { useStudy } from '../StudyContext';

export function Header() {
  const { data, icon } = useStudy();
  const tip = TIPS[new Date().getDate() % TIPS.length];

  return (
    <header className="top panel">
      <div className="mascot" aria-hidden="true">
        {icon('mascot')}
      </div>
      <div className="hello">
        <div className="qual">{data.course || 'Your study space'}</div>
        <h1>{data.name ? `Hi, ${data.name}` : 'Hi there'}</h1>
        <p>{tip}</p>
      </div>
    </header>
  );
}
