"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The network hub's picture: a two-storey house in section that tells the
 * service in the headline's three beats.
 *
 *   Measured: each room is read in turn. Strong by the router in the hall,
 *   weaker in the kitchen and on the landing, weak upstairs.
 *   Trialled: powerline adapters carry the connection over the house's own
 *   wiring, inside the walls and the floor, to an access point in the office
 *   upstairs and one in the kitchen.
 *   Fixed: every room reads strong, and the monitoring unit under the router
 *   keeps watch.
 *
 * Drawn rather than photographed, so it shows no product and names no brand;
 * the monitoring unit is a plain box. The speeds are examples and say so.
 *
 * It plays once when it scrolls into view, then idles: coverage rings pulse,
 * data runs along the wiring, lights blink. Replay starts it again. With
 * reduced motion, or without JavaScript, it shows the finished house and
 * nothing moves: every element's own style is its final state, and the
 * keyframes only describe how it got there.
 *
 * Every coordinate is a literal, not computed, so the server and the browser
 * draw the same numbers and hydration cannot disagree over a rounding digit.
 */

type Light = "green" | "amber" | "red";
const INK = "#1C1A18";
const COLOUR: Record<Light, { dot: string; text: string; ring: string }> = {
  green: { dot: "#16A34A", text: "#15803D", ring: "#BBF7D0" },
  amber: { dot: "#F59E0B", text: "#B45309", ring: "#FDE68A" },
  red: { dot: "#DC2626", text: "#B91C1C", ring: "#FECACA" },
};

/* The story's timetable, in seconds from the moment it starts playing. */
const T = {
  measure: [0.9, 1.35, 1.8, 2.25, 2.7, 3.15],
  step2: 4.0,
  adapters: 4.05,
  wiring: 4.35,
  points: 5.55,
  coverage: 5.75,
  pointRings: 6.1,
  flow: 5.8,
  fix: 6.9,
  monitored: 8.1,
};

const ROOMS: {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  before: { mbps: number; light: Light };
  after?: number;
}[] = [
  { name: "Hall", x: 94, y: 306, w: 125, h: 122, before: { mbps: 240, light: "green" } },
  { name: "Living room", x: 225, y: 306, w: 164, h: 122, before: { mbps: 162, light: "green" } },
  { name: "Kitchen", x: 395, y: 306, w: 111, h: 122, before: { mbps: 31, light: "amber" }, after: 205 },
  { name: "Landing", x: 94, y: 176, w: 125, h: 122, before: { mbps: 58, light: "amber" }, after: 188 },
  { name: "Bedroom", x: 225, y: 176, w: 144, h: 122, before: { mbps: 12, light: "red" }, after: 176 },
  { name: "Office", x: 375, y: 176, w: 131, h: 122, before: { mbps: 7, light: "red" }, after: 214 },
];

/* Devices a household notices first: each carries a status light. */
const DEVICES: { x: number; y: number; before: Light }[] = [
  { x: 72, y: 368, before: "green" }, // doorbell camera, beside the router
  { x: 70, y: 184, before: "red" }, // camera on the upstairs corner
  { x: 128, y: 356, before: "green" }, // thermostat in the hall
  { x: 380, y: 338, before: "amber" }, // television
  { x: 426, y: 374, before: "amber" }, // kitchen speaker
  { x: 306, y: 248, before: "red" }, // phone on the bed
  { x: 470, y: 232, before: "red" }, // laptop in the office
];

const CSS = `
.nh .nh-o{transform-box:fill-box;transform-origin:center}
.nh:not(.nh-play) *{animation-play-state:paused!important}
@keyframes nh-pop{0%{opacity:0;transform:scale(.55)}70%{opacity:1;transform:scale(1.07)}100%{opacity:1;transform:scale(1)}}
@keyframes nh-in{from{opacity:0}to{opacity:1}}
@keyframes nh-out{from{opacity:1}to{opacity:0}}
@keyframes nh-glow{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
@keyframes nh-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes nh-flow{to{stroke-dashoffset:-24}}
@keyframes nh-ring{0%{opacity:0;transform:scale(.08)}12%{opacity:.55}100%{opacity:0;transform:scale(1)}}
@keyframes nh-grow{from{opacity:0;transform:scale(.35)}to{opacity:1;transform:scale(1)}}
@keyframes nh-blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes nh-beat{from{stroke-dashoffset:60}to{stroke-dashoffset:0}}
@keyframes nh-step{from{background:#fff;color:#8A837C;border-color:#ECE7E1}to{background:${INK};color:#fff;border-color:${INK}}}
@keyframes nh-num{from{background:#F1EDE8;color:#8A837C}to{background:#F48222;color:#fff}}
.nh .nh-ring{opacity:.16;animation:nh-ring 3s cubic-bezier(.2,.6,.3,1) infinite both}
.nh .nh-led{animation:nh-blink 1.6s ease-in-out infinite both}
.nh .nh-draw{stroke-dasharray:1;stroke-dashoffset:0;animation:nh-draw 1.2s cubic-bezier(.5,0,.3,1) ${T.wiring}s both}
.nh .nh-flow{stroke-dasharray:3 9;animation:nh-in .4s ${T.flow}s both,nh-flow 1.1s linear ${T.flow}s infinite}
.nh .nh-grow{animation:nh-grow 1.1s cubic-bezier(.2,.7,.3,1) ${T.coverage}s both}
.nh .nh-beat{stroke-dasharray:60;animation:nh-beat 1.8s ease-in-out ${T.monitored + 0.3}s infinite both}
.nh .nh-step{animation:nh-step .45s ease-out both}
.nh .nh-step .nh-num{animation:nh-num .45s ease-out both;animation-delay:inherit}
@media (prefers-reduced-motion:reduce){.nh *{animation:none!important}.nh .nh-ring{opacity:.16}}
`;

const pop = (at: number, dur = 0.5) => ({ animation: `nh-pop ${dur}s cubic-bezier(.3,.7,.4,1) ${at}s both` });
const out = (at: number) => ({ animation: `nh-out .35s ease-in ${at}s both`, opacity: 0 });
const glow = (at: number) => ({ animation: `nh-glow 1.3s ease-out ${at}s both`, opacity: 0 });

function Bubble({ cx, y, name, mbps, light }: { cx: number; y: number; name: string; mbps: number; light: Light }) {
  const c = COLOUR[light];
  /* Wide enough for "Living room" and three digits with a gap between. */
  const w = Math.max(104, Math.round(name.length * 6.1 + 52));
  const left = cx - w / 2;
  return (
    <g>
      <rect x={left} y={y} width={w} height={24} rx={12} fill="#FFFFFF" stroke={c.ring} strokeWidth={1.5} />
      <circle cx={left + 12} cy={y + 12} r={3.6} fill={c.dot} />
      <text x={left + 20} y={y + 16} fontSize={10.5} fill="#6B645D">
        {name}
      </text>
      <text x={left + w - 7} y={y + 16} fontSize={11} fontWeight={700} fill={c.text} textAnchor="end">
        {mbps}
      </text>
    </g>
  );
}

function StatusDot({ x, y, light }: { x: number; y: number; light: Light }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill="#FFFFFF" />
      <circle cx={x} cy={y} r={4.2} fill={COLOUR[light].dot} />
    </g>
  );
}

function AccessPoint({ x, y, at }: { x: number; y: number; at: number }) {
  return (
    <g className="nh-o" style={pop(at, 0.55)}>
      <rect x={x - 13} y={y - 7} width={26} height={14} rx={7} fill="#FFFFFF" stroke={INK} strokeWidth={2} />
      <circle className="nh-led" cx={x} cy={y} r={2.2} fill="#F48222" style={{ animationDelay: `${at + 0.6}s` }} />
    </g>
  );
}

function Adapter({ x, y, at }: { x: number; y: number; at: number }) {
  return (
    <g className="nh-o" style={pop(at, 0.45)}>
      <rect x={x - 5} y={y - 8} width={10} height={14} rx={2.5} fill="#FFFFFF" stroke={INK} strokeWidth={1.6} />
      <circle className="nh-led" cx={x} cy={y - 3} r={1.5} fill="#F48222" style={{ animationDelay: `${at + 0.4}s` }} />
    </g>
  );
}

function Socket({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 4.5} y={y - 4.5} width={9} height={9} rx={1.5} fill="#FFFFFF" stroke="#B9B1A7" strokeWidth={1.2} />
      <circle cx={x - 1.6} cy={y} r={0.9} fill="#8A837C" />
      <circle cx={x + 1.6} cy={y} r={0.9} fill="#8A837C" />
    </g>
  );
}

function Rings({ x, y, r, start, stagger = 1 }: { x: number; y: number; r: number; start: number; stagger?: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className="nh-o nh-ring"
          cx={x}
          cy={y}
          r={r}
          fill="none"
          stroke="#F48222"
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
          style={{ animationDelay: `${start + i * stagger}s` }}
        />
      ))}
    </g>
  );
}

export default function NetworkHouse({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  const [take, setTake] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setPlay(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPlay(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const officeWire = "M128 410 V302 H493 V282";
  const kitchenWire = "M128 424 V425.5 H478 V396";

  return (
    <div ref={ref} className={`nh ${play ? "nh-play" : ""} ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <noscript dangerouslySetInnerHTML={{ __html: "<style>.nh *{animation:none!important}</style>" }} />

      <svg
        key={take}
        viewBox="28 52 544 404"
        className="block w-full h-auto"
        role="img"
        aria-label="A two-storey house in section. Every room is measured, powerline adapters carry the connection over the house's wiring to an access point upstairs and one in the kitchen, and every room ends up with a strong signal."
        style={{ fontFamily: "inherit" }}
      >
        <defs>
          <radialGradient id="nh-cover" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F48222" stopOpacity={0.2} />
            <stop offset="60%" stopColor="#F48222" stopOpacity={0.07} />
            <stop offset="100%" stopColor="#F48222" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="nh-screen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3A3632" />
            <stop offset="100%" stopColor="#141210" />
          </linearGradient>
          <linearGradient id="nh-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EAF3FA" />
            <stop offset="100%" stopColor="#D6E6F2" />
          </linearGradient>
          <clipPath id="nh-inside">
            <rect x={94} y={176} width={412} height={252} />
          </clipPath>
          <clipPath id="nh-roof">
            <path d="M76 174 L300 76 L524 174 Z" />
          </clipPath>
        </defs>

        {/* ── Outside ─────────────────────────────────────────────── */}
        <g>
          <ellipse cx={58} cy={434} rx={40} ry={9} fill="#E6F0DD" />
          <ellipse cx={548} cy={434} rx={38} ry={9} fill="#E6F0DD" />
          <circle cx={44} cy={420} r={13} fill="#CFE3C1" />
          <circle cx={62} cy={414} r={16} fill="#BFD9AE" />
          <circle cx={536} cy={418} r={15} fill="#BFD9AE" />
          <circle cx={556} cy={423} r={11} fill="#CFE3C1" />
          <line x1={30} y1={432} x2={570} y2={432} stroke="#CFC7BC" strokeWidth={2.5} strokeLinecap="round" />
          {/* The broadband line, coming in under the front of the house. */}
          <path d="M30 446 H112 V432" fill="none" stroke="#8A837C" strokeWidth={1.6} strokeDasharray="4 3" />
          <text x={34} y={442} fontSize={8.5} fill="#8A837C">Broadband in</text>
        </g>

        {/* ── Roof, chimney, attic ─────────────────────────────────── */}
        <rect x={402} y={98} width={26} height={44} fill="#EDE3D6" stroke={INK} strokeWidth={3.5} />
        <rect x={397} y={92} width={36} height={8} rx={2} fill={INK} />
        <path d="M76 174 L300 76 L524 174 Z" fill="#F6F1EA" />
        <g clipPath="url(#nh-roof)" stroke="#E6DCCD" strokeWidth={1.4}>
          {[96, 108, 120, 132, 144, 156, 168].map((y) => (
            <line key={y} x1={70} y1={y} x2={530} y2={y} />
          ))}
        </g>
        <circle cx={300} cy={136} r={13} fill="url(#nh-glass)" stroke={INK} strokeWidth={2.5} />
        <line x1={300} y1={123} x2={300} y2={149} stroke={INK} strokeWidth={1.5} />
        <line x1={287} y1={136} x2={313} y2={136} stroke={INK} strokeWidth={1.5} />
        <path d="M68 178 L300 72 L532 178" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />

        {/* ── Rooms ───────────────────────────────────────────────── */}
        {ROOMS.map((r, i) => (
          <rect key={r.name} x={r.x} y={r.y} width={r.w} height={r.h} fill={i % 2 ? "#FBF8F4" : "#FFFFFF"} />
        ))}

        {/* Wi-Fi coverage: the router's from the start, the access points' once they are in. */}
        <g clipPath="url(#nh-inside)">
          <circle cx={112} cy={398} r={150} fill="url(#nh-cover)" />
          <circle className="nh-o nh-grow" cx={486} cy={214} r={170} fill="url(#nh-cover)" />
          <circle className="nh-o nh-grow" cx={470} cy={350} r={150} fill="url(#nh-cover)" style={{ animationDelay: `${T.coverage + 0.2}s` }} />
          <Rings x={112} y={398} r={130} start={0.5} />
          <Rings x={486} y={214} r={140} start={T.pointRings} />
          <Rings x={470} y={350} r={120} start={T.pointRings + 0.5} />
        </g>

        {/* Each room lights up as it is measured. */}
        {ROOMS.map((r, i) => (
          <rect
            key={`glow-${r.name}`}
            x={r.x + 3}
            y={r.y + 3}
            width={r.w - 6}
            height={r.h - 6}
            rx={6}
            fill="#F48222"
            fillOpacity={0.05}
            stroke="#F48222"
            strokeWidth={2}
            style={glow(T.measure[i] - 0.2)}
          />
        ))}

        {/* ── Structure ───────────────────────────────────────────── */}
        <g fill={INK}>
          <rect x={86} y={172} width={428} height={7} rx={2} />
          <rect x={90} y={298} width={420} height={8} />
          <rect x={86} y={428} width={428} height={7} rx={2} />
          <rect x={86} y={172} width={8} height={263} />
          <rect x={506} y={172} width={8} height={263} />
          {/* Interior walls, with door openings */}
          <rect x={219} y={306} width={6} height={52} opacity={0.88} />
          <rect x={389} y={306} width={6} height={52} opacity={0.88} />
          <rect x={219} y={176} width={6} height={58} opacity={0.88} />
          <rect x={369} y={176} width={6} height={58} opacity={0.88} />
        </g>

        {/* Windows and the front door, set into the outside walls. */}
        <rect x={86} y={204} width={8} height={48} fill="url(#nh-glass)" stroke={INK} strokeWidth={1.5} />
        <rect x={506} y={204} width={8} height={48} fill="url(#nh-glass)" stroke={INK} strokeWidth={1.5} />
        <rect x={506} y={330} width={8} height={42} fill="url(#nh-glass)" stroke={INK} strokeWidth={1.5} />
        <rect x={86} y={352} width={8} height={76} fill="#B55810" stroke={INK} strokeWidth={1.5} />
        <rect x={87.5} y={360} width={5} height={16} rx={1} fill="url(#nh-glass)" />

        {/* ── Powerline: the house's own wiring, in the walls and the floor ── */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="nh-draw" d={officeWire} pathLength={1} stroke="#F48222" strokeWidth={3} />
          <path className="nh-draw" d={kitchenWire} pathLength={1} stroke="#F48222" strokeWidth={3} style={{ animationDelay: `${T.wiring + 0.15}s` }} />
          <path className="nh-flow" d={officeWire} stroke="#FFF4E8" strokeWidth={1.6} />
          <path className="nh-flow" d={kitchenWire} stroke="#FFF4E8" strokeWidth={1.6} style={{ animationDelay: `${T.flow + 0.2}s, ${T.flow + 0.2}s` }} />
        </g>

        {/* ── Hall ────────────────────────────────────────────────── */}
        <g>
          {/* Stairs up to the landing */}
          <path
            d="M138 428 V410.6 H149 V393.2 H160 V375.8 H171 V358.4 H182 V341 H193 V323.6 H204 V306.2 H216 V320 L152 428 Z"
            fill="#EFE6DA"
            stroke={INK}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <line x1={140} y1={386} x2={216} y2={266} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          {[149, 171, 193].map((x, i) => (
            <line key={x} x1={x} y1={410.6 - i * 34.8} x2={x} y2={372 - i * 34.4} stroke={INK} strokeWidth={1.2} />
          ))}
          {/* Console table, the router, the monitoring unit under it */}
          <rect x={98} y={402} width={34} height={4} rx={1} fill="#8C6A4F" />
          <line x1={101} y1={406} x2={101} y2={428} stroke="#8C6A4F" strokeWidth={2} />
          <line x1={129} y1={406} x2={129} y2={428} stroke="#8C6A4F" strokeWidth={2} />
          <line x1={105} y1={393} x2={103} y2={382} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <line x1={121} y1={393} x2={123} y2={382} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <rect x={101} y={392} width={24} height={10} rx={3} fill={INK} />
          <circle className="nh-led" cx={107} cy={397} r={1.4} fill="#4ADE80" />
          <circle className="nh-led" cx={112} cy={397} r={1.4} fill="#4ADE80" style={{ animationDelay: ".5s" }} />
          <circle className="nh-led" cx={117} cy={397} r={1.4} fill="#F48222" style={{ animationDelay: ".9s" }} />
          <rect x={104} y={416} width={17} height={11} rx={2.5} fill="#5A524C" />
          <circle className="nh-led" cx={109} cy={421.5} r={1.4} fill="#4ADE80" style={{ animationDuration: "2.4s" }} />
          <Socket x={128} y={416} />
          <Adapter x={128} y={418} at={T.adapters} />
          {/* Thermostat and a coat hook */}
          <circle cx={118} cy={362} r={7} fill="#FFFFFF" stroke={INK} strokeWidth={1.6} />
          <circle cx={118} cy={362} r={3} fill="#F48222" />
          <path d="M103 336 v6 q0 4 4 4" fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </g>

        {/* ── Living room ─────────────────────────────────────────── */}
        <g>
          <rect x={246} y={338} width={40} height={26} rx={2} fill="#F3EDE4" stroke={INK} strokeWidth={1.4} />
          <path d="M250 358 l9 -9 l7 6 l6 -5 l10 8" fill="none" stroke="#C9B89F" strokeWidth={1.4} />
          <rect x={232} y={390} width={70} height={16} rx={6} fill="#E7DDD0" stroke={INK} strokeWidth={1.6} />
          <rect x={236} y={404} width={62} height={14} rx={4} fill="#F4EBDF" stroke={INK} strokeWidth={1.6} />
          <rect x={229} y={396} width={9} height={24} rx={4} fill="#E7DDD0" stroke={INK} strokeWidth={1.6} />
          <rect x={296} y={396} width={9} height={24} rx={4} fill="#E7DDD0" stroke={INK} strokeWidth={1.6} />
          <line x1={236} y1={420} x2={236} y2={428} stroke={INK} strokeWidth={2} />
          <line x1={298} y1={420} x2={298} y2={428} stroke={INK} strokeWidth={2} />
          <line x1={312} y1={428} x2={312} y2={378} stroke={INK} strokeWidth={1.6} />
          <path d="M304 378 L320 378 L316 366 L308 366 Z" fill="#FDE5D0" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
          <rect x={322} y={342} width={60} height={34} rx={3} fill="url(#nh-screen)" stroke={INK} strokeWidth={1.6} />
          <line x1={352} y1={376} x2={352} y2={384} stroke={INK} strokeWidth={1.6} />
          <rect x={320} y={410} width={64} height={18} rx={2} fill="#EFE6DA" stroke={INK} strokeWidth={1.6} />
          <line x1={352} y1={410} x2={352} y2={428} stroke={INK} strokeWidth={1.2} />
        </g>

        {/* ── Kitchen ─────────────────────────────────────────────── */}
        <g>
          <rect x={398} y={396} width={105} height={5} rx={1} fill="#8C6A4F" />
          <rect x={400} y={401} width={101} height={27} fill="#F4EEE6" stroke={INK} strokeWidth={1.4} />
          <line x1={434} y1={401} x2={434} y2={428} stroke={INK} strokeWidth={1.2} />
          <line x1={468} y1={401} x2={468} y2={428} stroke={INK} strokeWidth={1.2} />
          {[417, 451, 485].map((x) => (
            <line key={x} x1={x - 4} y1={408} x2={x + 4} y2={408} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          ))}
          <rect x={410} y={378} width={12} height={18} rx={5} fill={INK} />
          <circle cx={416} cy={383} r={1.5} fill="#F48222" />
          <path d="M442 396 v-12 q0 -5 5 -5 h8 q5 0 5 5 v12 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.5} />
          <path d="M460 384 q5 0 5 5" fill="none" stroke={INK} strokeWidth={1.5} />
          <rect x={489} y={386} width={10} height={10} rx={1.5} fill="#E7DDD0" stroke={INK} strokeWidth={1.3} />
          <path d="M494 386 q-6 -10 -2 -16 M494 386 q6 -9 3 -15 M494 386 q0 -10 0 -14" fill="none" stroke="#6BAF5E" strokeWidth={1.6} strokeLinecap="round" />
          <Socket x={478} y={388} />
          <Adapter x={478} y={390} at={T.adapters + 0.2} />
          <line className="nh-draw" x1={478} y1={380} x2={478} y2={357} pathLength={1} stroke={INK} strokeWidth={1.4} style={{ animationDelay: `${T.points - 0.25}s`, animationDuration: ".3s" }} />
          <AccessPoint x={470} y={350} at={T.points + 0.15} />
        </g>

        {/* ── Landing ─────────────────────────────────────────────── */}
        <g>
          <rect x={120} y={216} width={24} height={18} rx={1.5} fill="#F3EDE4" stroke={INK} strokeWidth={1.4} />
          <circle cx={132} cy={225} r={4} fill="#FACBA1" />
          <line x1={150} y1={268} x2={218} y2={268} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          {[156, 170, 184, 198, 212].map((x) => (
            <line key={x} x1={x} y1={268} x2={x} y2={298} stroke={INK} strokeWidth={1.2} />
          ))}
        </g>

        {/* ── Bedroom ─────────────────────────────────────────────── */}
        <g>
          <circle cx={297} cy={222} r={9} fill="#FFFFFF" stroke={INK} strokeWidth={1.5} />
          <path d="M297 216 V222 L301 225" fill="none" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
          <rect x={231} y={244} width={8} height={54} rx={3} fill="#C9A98A" stroke={INK} strokeWidth={1.5} />
          <rect x={238} y={268} width={94} height={20} rx={3} fill="#FFFFFF" stroke={INK} strokeWidth={1.5} />
          <rect x={243} y={259} width={24} height={11} rx={5} fill="#FFFFFF" stroke={INK} strokeWidth={1.4} />
          <path d="M266 266 H327 Q332 266 332 271 V288 H266 Z" fill="#FDE5D0" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
          <line x1={240} y1={288} x2={240} y2={298} stroke={INK} strokeWidth={2} />
          <line x1={330} y1={288} x2={330} y2={298} stroke={INK} strokeWidth={2} />
          <rect x={292} y={256} width={12} height={7} rx={1.5} fill={INK} />
          <rect x={338} y={274} width={24} height={24} rx={2} fill="#EFE6DA" stroke={INK} strokeWidth={1.4} />
          <line x1={350} y1={274} x2={350} y2={262} stroke={INK} strokeWidth={1.4} />
          <path d="M343 262 L357 262 L354 252 L346 252 Z" fill="#FDE5D0" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
        </g>

        {/* ── Office ──────────────────────────────────────────────── */}
        <g>
          <rect x={404} y={258} width={88} height={4} rx={1} fill="#8C6A4F" />
          <line x1={408} y1={262} x2={408} y2={298} stroke="#8C6A4F" strokeWidth={2} />
          <line x1={488} y1={262} x2={488} y2={298} stroke="#8C6A4F" strokeWidth={2} />
          <rect x={440} y={238} width={30} height={19} rx={2} fill="url(#nh-screen)" stroke={INK} strokeWidth={1.4} />
          <rect x={434} y={256} width={42} height={3} rx={1} fill={INK} />
          <rect x={384} y={268} width={20} height={5} rx={2} fill="#E7DDD0" stroke={INK} strokeWidth={1.3} />
          <rect x={382} y={246} width={5} height={27} rx={2} fill="#E7DDD0" stroke={INK} strokeWidth={1.3} />
          <line x1={394} y1={273} x2={394} y2={292} stroke={INK} strokeWidth={1.6} />
          <line x1={386} y1={296} x2={402} y2={296} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          <rect x={420} y={212} width={30} height={3} rx={1} fill="#8C6A4F" />
          <rect x={423} y={200} width={5} height={12} fill="#F48222" opacity={0.8} />
          <rect x={429} y={202} width={5} height={10} fill="#6BAF5E" opacity={0.8} />
          <rect x={435} y={199} width={5} height={13} fill="#5A524C" opacity={0.8} />
          <Socket x={493} y={286} />
          <Adapter x={493} y={288} at={T.adapters + 0.1} />
          <line className="nh-draw" x1={493} y1={278} x2={493} y2={221} pathLength={1} stroke={INK} strokeWidth={1.4} style={{ animationDelay: `${T.points - 0.3}s`, animationDuration: ".3s" }} />
          <AccessPoint x={486} y={214} at={T.points} />
        </g>

        {/* ── Cameras outside ─────────────────────────────────────── */}
        <g>
          <rect x={78} y={374} width={8} height={15} rx={3} fill={INK} />
          <circle cx={82} cy={379} r={1.8} fill="#9AD1F5" />
          <path d="M86 192 H76 L70 200 H80 Z" fill={INK} />
          <circle cx={73} cy={198} r={1.6} fill="#9AD1F5" />
          <line x1={86} y1={192} x2={80} y2={192} stroke={INK} strokeWidth={2} />
        </g>

        {/* ── Readings, room by room ──────────────────────────────── */}
        {ROOMS.map((r, i) => {
          const cx = r.x + r.w / 2;
          const y = r.y + 9;
          return (
            <g key={`read-${r.name}`}>
              <g className="nh-o" style={pop(T.measure[i])}>
                <g style={r.after ? out(T.fix + (i - 2) * 0.12) : undefined}>
                  <Bubble cx={cx} y={y} name={r.name} mbps={r.before.mbps} light={r.before.light} />
                </g>
              </g>
              {r.after && (
                <g className="nh-o" style={pop(T.fix + 0.2 + (i - 2) * 0.12)}>
                  <Bubble cx={cx} y={y} name={r.name} mbps={r.after} light="green" />
                </g>
              )}
            </g>
          );
        })}

        {/* ── Every device's light: amber and red turn green ──────── */}
        {DEVICES.map((d, i) =>
          d.before === "green" ? (
            <StatusDot key={`dev-${i}`} x={d.x} y={d.y} light="green" />
          ) : (
            <g key={`dev-${i}`}>
              <g style={out(T.fix + 0.1 + i * 0.08)}>
                <StatusDot x={d.x} y={d.y} light={d.before} />
              </g>
              <g className="nh-o" style={pop(T.fix + 0.2 + i * 0.08, 0.4)}>
                <StatusDot x={d.x} y={d.y} light="green" />
              </g>
            </g>
          ),
        )}

        {/* ── Labels in the sky ───────────────────────────────────── */}
        <g>
          <rect x={40} y={62} width={142} height={22} rx={11} fill="#F4EFE8" />
          <text x={52} y={77} fontSize={10.5} fill="#6B645D">
            Example readings, Mbps
          </text>
        </g>
        <g className="nh-o" style={pop(T.monitored, 0.55)}>
          <rect x={436} y={62} width={130} height={26} rx={13} fill="#FFFFFF" stroke="#BBF7D0" strokeWidth={1.5} />
          <circle className="nh-led" cx={451} cy={75} r={4} fill="#16A34A" style={{ animationDuration: "2.2s" }} />
          <text x={461} y={79} fontSize={11} fontWeight={700} fill="#15803D">
            Monitored
          </text>
          <path className="nh-beat" d="M532 75 h5 l3 -6 l4 12 l3 -6 h7" fill="none" stroke="#16A34A" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      <div key={`steps-${take}`} className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <ol className="flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "Measured", at: 0.6 },
            { label: "Trialled", at: T.step2 },
            { label: "Fixed", at: T.fix },
          ].map((s, i) => (
            <li
              key={s.label}
              className="nh-step inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ animationDelay: `${s.at}s`, background: INK, color: "#fff", borderColor: INK }}
            >
              <span
                className="nh-num inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.7rem]"
                style={{ background: "#F48222", color: "#fff" }}
              >
                {i + 1}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            setTake((n) => n + 1);
            setPlay(true);
          }}
          className="text-xs font-semibold text-ink-soft underline decoration-gray-300 underline-offset-4 hover:text-ink"
        >
          Replay
        </button>
      </div>
    </div>
  );
}
