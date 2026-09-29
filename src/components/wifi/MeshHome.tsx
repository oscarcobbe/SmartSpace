/**
 * The Wi-Fi hub's picture: a two storey house in section, the router in one
 * room and two mesh units placed so every room is inside a ring. Drawn rather
 * than photographed, so it shows no product and names no brand.
 */
export default function MeshHome({ className = "" }: { className?: string }) {
  const units = [
    { x: 118, y: 282, router: true },
    { x: 300, y: 282, router: false },
    { x: 214, y: 186, router: false },
  ];
  const rooms = [
    { x: 92, y: 236 },
    { x: 332, y: 236 },
    { x: 92, y: 146 },
    { x: 332, y: 146 },
  ];
  return (
    <svg viewBox="0 0 420 330" className={className} role="img" aria-label="A two storey house with a router and two access points, every room inside a Wi-Fi ring">
      <defs>
        <radialGradient id="mesh-ring" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F48222" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#F48222" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F48222" stopOpacity="0" />
        </radialGradient>
        <clipPath id="mesh-house">
          <path d="M60 120 L210 34 L360 120 L360 312 L60 312 Z" />
        </clipPath>
      </defs>

      {/* House */}
      <path d="M60 120 L210 34 L360 120 L360 312 L60 312 Z" fill="#FFFFFF" />
      <g clipPath="url(#mesh-house)">
        {units.map((u) => (
          <circle key={`g${u.x}`} cx={u.x} cy={u.y} r={112} fill="url(#mesh-ring)" />
        ))}
        {units.map((u) =>
          [34, 58, 82].map((r) => (
            <circle key={`r${u.x}-${r}`} cx={u.x} cy={u.y} r={r} fill="none" stroke="#F48222" strokeOpacity={0.35 - r / 400} strokeWidth={1.4} strokeDasharray="3 5" />
          )),
        )}
      </g>
      <path d="M44 128 L210 26 L376 128" fill="none" stroke="#1C1A18" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 120 L60 312 L360 312 L360 120" fill="none" stroke="#1C1A18" strokeWidth={4} strokeLinejoin="round" />
      <line x1={60} y1={214} x2={360} y2={214} stroke="#1C1A18" strokeWidth={3} />
      <line x1={210} y1={214} x2={210} y2={312} stroke="#1C1A18" strokeWidth={2.5} strokeDasharray="0" />
      <line x1={20} y1={312} x2={400} y2={312} stroke="#C9C3BA" strokeWidth={2} strokeLinecap="round" />

      {/* Mesh links */}
      <path d={`M${units[0].x} ${units[0].y - 10} Q 214 250 ${units[2].x} ${units[2].y + 10}`} fill="none" stroke="#F48222" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
      <path d={`M${units[1].x} ${units[1].y - 10} Q 260 250 ${units[2].x + 4} ${units[2].y + 10}`} fill="none" stroke="#F48222" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
      <path d={`M${units[0].x + 16} ${units[0].y} L ${units[1].x - 16} ${units[1].y}`} fill="none" stroke="#F48222" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />

      {/* Units */}
      {units.map((u) =>
        u.router ? (
          <g key={`u${u.x}`}>
            <rect x={u.x - 16} y={u.y - 9} width={32} height={18} rx={5} fill="#1C1A18" />
            <line x1={u.x - 9} y1={u.y - 9} x2={u.x - 12} y2={u.y - 21} stroke="#1C1A18" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={u.x + 9} y1={u.y - 9} x2={u.x + 12} y2={u.y - 21} stroke="#1C1A18" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={u.x - 6} cy={u.y} r={2} fill="#16A34A" />
            <circle cx={u.x + 1} cy={u.y} r={2} fill="#F48222" />
          </g>
        ) : (
          <g key={`u${u.x}`}>
            <rect x={u.x - 11} y={u.y - 15} width={22} height={30} rx={9} fill="#FFFFFF" stroke="#1C1A18" strokeWidth={2.5} />
            <circle cx={u.x} cy={u.y - 4} r={3} fill="#F48222" />
          </g>
        ),
      )}

      {/* Every room ticked */}
      {rooms.map((r) => (
        <g key={`k${r.x}-${r.y}`}>
          <circle cx={r.x} cy={r.y} r={10} fill="#16A34A" />
          <path d={`M${r.x - 4.5} ${r.y} l3 3 l6 -6.5`} fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}

      {/* The monitoring unit beside the router */}
      <g>
        <rect x={150} y={290} width={20} height={13} rx={3} fill="#5A524C" />
        <circle cx={156} cy={296.5} r={1.8} fill="#16A34A" />
      </g>
    </svg>
  );
}
