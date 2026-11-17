import { ALL_SERVICES, CAPS } from '@/content';

const COLUMNS = ['Collabify', 'Separate agencies', 'Freelancers', 'In-house team'];

const ROWS = [
  [
    'Who is accountable',
    'One project lead for everything',
    'One contact per agency',
    'You coordinate each person',
    'Your managers',
  ],
  [
    'Range of skills',
    `${CAPS.length} capabilities, ${ALL_SERVICES.length} services`,
    'Depends on how many you hire',
    'One skill each',
    'Limited to the roles you hire',
  ],
  [
    'Getting started',
    'One discovery call and one proposal',
    'Separate briefs and onboarding for each',
    'Finding and vetting each person',
    'Recruiting each role',
  ],
  [
    'Your management time',
    'One lead coordinates for you',
    'You keep agencies aligned',
    'You manage each freelancer',
    'You manage the team',
  ],
  [
    'How you pay',
    'Projects or retainers, scoped in writing',
    'Several contracts and retainers',
    'Per task or hourly',
    'Salaries, benefits and tools',
  ],
  [
    'Scaling up or down',
    'Add or pause capabilities',
    'Renegotiate each contract',
    'Find new people',
    'Hire or let people go',
  ],
];

export function ComparisonTable() {
  return (
    <div className="tbl-wrap compare">
      <table>
        <caption className="sr-only">
          How Collabify compares with other ways to get growth work done
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Criteria</span>
            </th>
            {COLUMNS.map((c, idx) => (
              <th key={c} scope="col" className={idx === 0 ? 'us' : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r[0]}>
              <th scope="row">{r[0]}</th>
              {r.slice(1).map((val, idx) => (
                <td key={idx} className={idx === 0 ? 'us' : undefined}>
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

