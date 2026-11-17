import { PAL } from '@/content';

const ITEMS = [
  'Brand strategy',
  'Websites',
  'Mobile apps',
  'Podcasts',
  'Founder content',
  'Digital PR',
  'CRM and automation',
  'Hiring support',
  'Event production',
  'Ticketing',
  'Creator distribution',
  'Brand activations',
  'AI integration',
  'Performance marketing',
];

const COLS = [PAL.o, PAL.i, PAL.t, PAL.p, PAL.b].filter(Boolean);

export function CapabilityMarquee() {
  const renderRun = (prefix: string) =>
    ITEMS.map((item, idx) => (
      <span key={`${prefix}-${idx}`} className="marquee-item">
        {item}
        <b style={{ background: COLS[idx % COLS.length] || '#FF9D3E' }} />
      </span>
    ));

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {renderRun('a')}
        {renderRun('b')}
      </div>
    </div>
  );
}

