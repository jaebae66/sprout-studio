export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="bar">
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
