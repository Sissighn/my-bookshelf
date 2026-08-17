const Star = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
    <path
      d="M10 1.6l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.88l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      opacity={filled ? 1 : 0.32}
    />
  </svg>
)

export default function Stars({ rating, label }) {
  const rounded = Math.round(rating)
  return (
    <span
      className="inline-flex items-center gap-1 text-ink"
      role="img"
      aria-label={`${label}: ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rounded} />
      ))}
    </span>
  )
}
