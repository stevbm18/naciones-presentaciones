import { useEffect, useState } from 'react';

export default function Projection() {
  const [payload, setPayload] = useState<ProjectionPayload>({ type: 'clear' });
  useEffect(() => window.naciones.onProjectionUpdate(setPayload), []);
  if (payload.type === 'black' || payload.type === 'clear') return <main className="projection black" />;
  if (payload.type === 'image' && payload.src) return <main className="projection"><img src={payload.src} /></main>;
  if (payload.type === 'video' && payload.src) return <main className="projection"><video src={payload.src} autoPlay controls={false} /></main>;
  if (payload.type === 'text') return <main className="projection lyric"><div>{payload.text}</div></main>;
  return <main className="projection black" />;
}
