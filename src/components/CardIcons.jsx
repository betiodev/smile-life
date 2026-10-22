// Icônes simples (dessin original) pour les cartes sans illustration
const PATHS = {
  cap: (
    <>
      <path d="M4 20 32 8l28 12-28 12z" />
      <path d="M16 26v12c0 4 7 8 16 8s16-4 16-8V26" />
      <path d="M58 21v16" />
      <circle cx="58" cy="40" r="2.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="6" y="18" width="52" height="36" rx="6" />
      <path d="M22 18v-5a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v5" />
      <path d="M6 33h52M28 33v6h8v-6" />
    </>
  ),
  bill: (
    <>
      <rect x="4" y="16" width="56" height="32" rx="4" />
      <circle cx="32" cy="32" r="8" />
      <path d="M12 24v16M52 24v16" />
    </>
  ),
  heart: <path d="M32 54S6 39 6 22a12 12 0 0 1 26-6 12 12 0 0 1 26 6c0 17-26 32-26 32z" />,
  rings: (
    <>
      <circle cx="23" cy="38" r="14" />
      <circle cx="41" cy="38" r="14" />
      <path d="m36 12 5-6 5 6-5 6z" />
    </>
  ),
  mask: (
    <>
      <path d="M6 22c8-6 18-6 26 0 8-6 18-6 26 0 0 14-6 22-13 22-6 0-9-6-13-6s-7 6-13 6C12 44 6 36 6 22z" />
      <ellipse cx="19" cy="28" rx="5" ry="3" />
      <ellipse cx="45" cy="28" rx="5" ry="3" />
    </>
  ),
  baby: (
    <>
      <circle cx="32" cy="34" r="20" />
      <path d="M28 14c0-4 3-6 6-6" />
      <circle cx="25" cy="32" r="1.8" />
      <circle cx="39" cy="32" r="1.8" />
      <path d="M26 42c4 3 8 3 12 0" />
    </>
  ),
  bolt: <path d="M36 4 12 36h16l-4 24 26-34H34z" />,
  star: <path d="m32 6 7.6 16.4L58 24.6 44.6 37l3.4 18L32 46.4 16 55l3.4-18L6 24.6l18.4-2.2z" />,
  medal: (
    <>
      <path d="M20 4l8 18M44 4l-8 18" />
      <circle cx="32" cy="40" r="16" />
      <path d="m32 31 3 6 6.5.8-4.8 4.4 1.3 6.4L32 45.4l-6 3.2 1.3-6.4-4.8-4.4 6.5-.8z" />
    </>
  ),
  paw: (
    <>
      <path d="M32 34c-9 0-16 9-16 15 0 5 5 7 9 5 4-2 10-2 14 0 4 2 9 0 9-5 0-6-7-15-16-15z" />
      <ellipse cx="16" cy="26" rx="5" ry="7" />
      <ellipse cx="26" cy="15" rx="5" ry="7" />
      <ellipse cx="38" cy="15" rx="5" ry="7" />
      <ellipse cx="48" cy="26" rx="5" ry="7" />
    </>
  ),
  plane: <path d="M60 10c-2-2-6-1-9 2L41 22 12 14l-5 5 23 13-9 11-8-1-4 4 10 5 5 10 4-4-1-8 11-9 13 23 5-5-8-29 10-10c3-3 4-7 2-9z" />,
  house: (
    <>
      <path d="M6 30 32 8l26 22" />
      <path d="M12 26v30h40V26" />
      <path d="M26 56V40h12v16" />
    </>
  ),
}

export default function CardIcon({ name, className = '', style }) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor"
      strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] ?? PATHS.star}
    </svg>
  )
}
