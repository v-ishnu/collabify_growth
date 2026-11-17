import { PlusMinusIcon } from './Icons';
import { PlaceholderText } from './PlaceholderText';

export function FaqAccordion({ faqs }: { faqs: Array<[string, string]> }) {
  return (
    <div className="faq">
      {faqs.map(([question, answer], idx) => (
        <details key={idx}>
          <summary>
            <span>
              <PlaceholderText text={question} />
            </span>
            <PlusMinusIcon />
          </summary>
          <div className="ans">
            <p>
              <PlaceholderText text={answer} />
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}

