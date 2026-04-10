import { useId } from 'react'

/** QuickCredit mark: stylized “Q” with credit arc — scales with CSS width/height. */
export function BrandLogo({ className = '', title = 'QuickCredit', decorative = false }) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${uid}-g`} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" />
          <stop offset="0.45" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${uid}-g)`} />
      <path
        fill="#fff"
        fillOpacity="0.98"
        d="M32 18c-7.18 0-13 5.82-13 13 0 4.52 2.3 8.5 5.8 10.85L18 46.2l4.35-4.35A12.9 12.9 0 0032 44c7.18 0 13-5.82 13-13S39.18 18 32 18Zm0 4.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17Z"
      />
      <path
        fill="#c7d2fe"
        fillOpacity="0.95"
        d="M44 42c2.5 1.2 4.2 3.1 4.8 5.4.35 1.4-.05 2.85-1.1 3.9-1.5 1.5-3.95 1.65-5.65.35-1.25-.95-2.35-2.45-3.2-4.35-.55-1.25-.9-2.6-1.05-4 .35.1.7.15 1.05.15 1.85 0 3.55-.55 5.15-1.45Z"
      />
    </svg>
  )
}
