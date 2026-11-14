import { useId } from 'react';

/**
 * Spacious official-style "Get it from Microsoft" Store CTA button.
 * Uses semantic HTML typography + inline vector Store bag icon so text stays crisp at all DPIs
 * and pairs cleanly beside Quick Pill's primary CTA buttons without cramped SVG wrapping.
 */
export default function MicrosoftStoreBadge({
  href,
  id,
  title = 'Get Quick Pill from Microsoft Store',
  ariaLabel = 'Get Quick Pill from Microsoft Store',
  className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const gradA = `${uid}-ms-a`;
  const gradB = `${uid}-ms-b`;
  const gradC = `${uid}-ms-c`;
  const badgeClasses = ['ms-store-cta', className].filter(Boolean).join(' ');

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      id={id}
      className={badgeClasses}
      title={title}
      aria-label={ariaLabel}
    >
      <svg
        className="ms-store-cta__icon"
        width="34"
        height="34"
        viewBox="-4 -4 520 520"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradA}
            x1="-339.756"
            x2="-338.098"
            y1="695.866"
            y2="594.059"
            gradientTransform="matrix(4.8452 0 0 -4.8452 1899.61 3470.538)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#0669bc" />
            <stop offset=".5" stopColor="#15528e" />
            <stop offset="1" stopColor="#243a5f" />
          </linearGradient>
          <linearGradient
            id={gradB}
            x1="-420.195"
            x2="-420.195"
            y1="643.765"
            y2="630.08"
            gradientTransform="matrix(4.8452 0 0 -4.8452 2291.455 3167.526)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#30daff" />
            <stop offset=".5" stopColor="#18b7ea" />
            <stop offset="1" stopColor="#0094d4" />
          </linearGradient>
          <linearGradient
            id={gradC}
            x1="-456.468"
            x2="-456.468"
            y1="654.936"
            y2="644.154"
            gradientTransform="matrix(4.8452 0 0 -4.8452 2467.21 3167.541)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#22bcff" />
            <stop offset=".5" stopColor="#11a2f8" />
            <stop offset="1" stopColor="#0088f0" />
          </linearGradient>
        </defs>
        <path
          d="M480 74H42c-31.1 0-31.1 18.1-31.1 18.1v324.5c0 89.4 94.4 95.4 94.4 95.4h291.3c108.5 0 104.5-89.4 104.5-89.4V97.1C501.1 69 480 74 480 74"
          fill={`url(#${gradA})`}
        />
        <path d="M244.8 181.5h-96.1v96.1h96.1z" fill="#f25022" />
        <path d="M362.3 181.5h-96.1v96.1h96.1z" fill="#7fba00" />
        <path d="M362.3 298.9h-96.1V395h96.1z" fill="#ffb900" />
        <path d="M244.8 298.9h-96.1V395h96.1z" fill="#00a4ef" />
        <path
          d="M106.1 96.1c0 11.8 9.6 21.4 21.4 21.4s21.3-9.6 21.3-21.4zm256.2 0c0 11.8 9.6 21.4 21.3 21.4 11.8 0 21.4-9.6 21.4-21.4zm-213.5 0V42.7h-42.7v53.4zm0-53.4h213.5V0H148.8zm213.5 0v53.4H405V42.7zm0 0H405C405 19.1 385.8 0 362.3 0zm-213.5 0V0c-23.6 0-42.7 19.1-42.7 42.7z"
          fillRule="evenodd"
          clipRule="evenodd"
          fill={`url(#${gradB})`}
        />
        <path d="M148.8 0h213.5v42.7H148.8z" fill={`url(#${gradC})`} />
      </svg>

      <span className="ms-store-cta__copy">
        <span className="ms-store-cta__eyebrow">Get it from</span>
        <span className="ms-store-cta__brand">Microsoft</span>
      </span>
    </a>
  );
}
