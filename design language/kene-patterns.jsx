/**
 * onanti Kené Pattern Library
 *
 * A collection of Shipibo kené-inspired geometric patterns for use
 * throughout the onanti app. These are abstracted, respectful interpretations
 * of traditional motifs — not reproductions of sacred designs.
 *
 * Pattern families:
 *   1. Diamond Grid (Quene Kené) — interlocking diamonds with cross accents
 *   2. River Lines (Nete Kené) — flowing, serpentine maze paths
 *   3. Border Frames (Cano Kené) — repeating linear border patterns
 *
 * Usage: Import individual patterns or the full library.
 *   import { KeneDiamondGrid, KeneRiverFlow, KeneBorderZigzag } from './kene-patterns';
 */

import { useState } from "react";

/* ── Shared Constants ── */
const COLORS = {
  primary: "#7a3333",
  primaryLight: "#b87070",
  primarySubtle: "#d09e9e",
  earth: "#967854",
  earthLight: "#c9b89e",
  plum: "#785496",
  plumLight: "#b89ec9",
  sage: "#547854",
  dark: "#2e1616",
  cream: "#f2e4e4",
};

/* ════════════════════════════════════════════════════════
   1. DIAMOND GRID PATTERNS (Quene Kené)
   Classic interlocking diamonds with cross accents
   ════════════════════════════════════════════════════════ */

/** Diamond Grid — the foundational kené motif */
export function KeneDiamondGrid({
  width = "100%",
  height = 200,
  cellSize = 40,
  color = COLORS.primary,
  opacity = 0.08,
  strokeWidth = 0.8,
  style,
}) {
  const id = `kene-diamond-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", ...style }}
    >
      <defs>
        <pattern
          id={id}
          x="0" y="0"
          width={s} height={s}
          patternUnits="userSpaceOnUse"
        >
          {/* Main diamond */}
          <path
            d={`M${s/2} 0 L${s} ${s/2} L${s/2} ${s} L0 ${s/2} Z`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          {/* Inner diamond */}
          <path
            d={`M${s/2} ${s*0.2} L${s*0.8} ${s/2} L${s/2} ${s*0.8} L${s*0.2} ${s/2} Z`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * 0.6}
            opacity={opacity * 0.7}
          />
          {/* Center cross */}
          <line x1={s/2 - 3} y1={s/2} x2={s/2 + 3} y2={s/2}
            stroke={color} strokeWidth={strokeWidth * 0.5} opacity={opacity * 0.8} />
          <line x1={s/2} y1={s/2 - 3} x2={s/2} y2={s/2 + 3}
            stroke={color} strokeWidth={strokeWidth * 0.5} opacity={opacity * 0.8} />
          {/* Corner dots */}
          <circle cx={s/2} cy={0} r={1} fill={color} opacity={opacity * 0.5} />
          <circle cx={s} cy={s/2} r={1} fill={color} opacity={opacity * 0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Diamond Lattice — a denser, woven diamond variant */
export function KeneDiamondLattice({
  width = "100%",
  height = 200,
  cellSize = 32,
  color = COLORS.primary,
  opacity = 0.08,
  style,
}) {
  const id = `kene-lattice-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          {/* Outer diamond */}
          <path
            d={`M${s/2} 0 L${s} ${s/2} L${s/2} ${s} L0 ${s/2} Z`}
            fill="none" stroke={color} strokeWidth="0.7" opacity={opacity}
          />
          {/* Horizontal bars */}
          <line x1={s*0.15} y1={s*0.35} x2={s*0.85} y2={s*0.35}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.6} />
          <line x1={s*0.15} y1={s*0.65} x2={s*0.85} y2={s*0.65}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.6} />
          {/* Vertical bars */}
          <line x1={s*0.35} y1={s*0.15} x2={s*0.35} y2={s*0.85}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.6} />
          <line x1={s*0.65} y1={s*0.15} x2={s*0.65} y2={s*0.85}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.6} />
          {/* Center diamond fill */}
          <path
            d={`M${s/2} ${s*0.35} L${s*0.65} ${s/2} L${s/2} ${s*0.65} L${s*0.35} ${s/2} Z`}
            fill={color} opacity={opacity * 0.15}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Stacked Diamonds — nested concentric diamonds */
export function KeneStackedDiamonds({
  width = "100%",
  height = 200,
  cellSize = 56,
  color = COLORS.primary,
  opacity = 0.08,
  style,
}) {
  const id = `kene-stacked-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          {[1, 0.72, 0.44, 0.2].map((scale, i) => (
            <path
              key={i}
              d={`M${s/2} ${s*(1-scale)/2}
                  L${s/2 + s*scale/2} ${s/2}
                  L${s/2} ${s/2 + s*scale/2}
                  L${s/2 - s*scale/2} ${s/2} Z`}
              fill="none"
              stroke={color}
              strokeWidth={0.8 - i * 0.15}
              opacity={opacity * (1 - i * 0.15)}
            />
          ))}
          {/* Tiny center dot */}
          <circle cx={s/2} cy={s/2} r={1.2} fill={color} opacity={opacity * 0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}


/* ════════════════════════════════════════════════════════
   2. RIVER LINE PATTERNS (Nete Kené)
   Flowing, serpentine maze-like paths
   ════════════════════════════════════════════════════════ */

/** River Flow — undulating horizontal waves */
export function KeneRiverFlow({
  width = "100%",
  height = 200,
  cellSize = 48,
  color = COLORS.primary,
  opacity = 0.08,
  style,
}) {
  const id = `kene-river-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  const h = s / 2;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          {/* Primary wave */}
          <path
            d={`M0 ${h} Q${s*0.25} ${h - s*0.3} ${s/2} ${h} Q${s*0.75} ${h + s*0.3} ${s} ${h}`}
            fill="none" stroke={color} strokeWidth="0.8" opacity={opacity}
          />
          {/* Parallel offset wave */}
          <path
            d={`M0 ${h + 6} Q${s*0.25} ${h + 6 - s*0.3} ${s/2} ${h + 6} Q${s*0.75} ${h + 6 + s*0.3} ${s} ${h + 6}`}
            fill="none" stroke={color} strokeWidth="0.5" opacity={opacity * 0.6}
          />
          {/* Step marks between waves */}
          {[0.2, 0.4, 0.6, 0.8].map((frac, i) => (
            <line key={i}
              x1={s * frac} y1={h - 2} x2={s * frac} y2={h + 8}
              stroke={color} strokeWidth="0.3" opacity={opacity * 0.4}
            />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Maze Path — interlocking right-angle meander */
export function KeneMazePath({
  width = "100%",
  height = 200,
  cellSize = 36,
  color = COLORS.primary,
  opacity = 0.08,
  style,
}) {
  const id = `kene-maze-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width={s * 2} height={s} patternUnits="userSpaceOnUse">
          {/* Meander path */}
          <path
            d={`M0 ${s*0.25}
                H${s*0.75} V${s*0.75} H${s*0.25} V${s}
                M${s} 0 V${s*0.25}
                H${s*1.75} V${s*0.75} H${s*1.25} V${s}`}
            fill="none"
            stroke={color}
            strokeWidth="0.7"
            opacity={opacity}
          />
          {/* Connecting dots at turns */}
          <circle cx={s * 0.75} cy={s * 0.25} r={1} fill={color} opacity={opacity * 0.5} />
          <circle cx={s * 0.25} cy={s * 0.75} r={1} fill={color} opacity={opacity * 0.5} />
          <circle cx={s * 1.75} cy={s * 0.25} r={1} fill={color} opacity={opacity * 0.5} />
          <circle cx={s * 1.25} cy={s * 0.75} r={1} fill={color} opacity={opacity * 0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Spiral Vine — organic spiral curves */
export function KeneSpiralVine({
  width = "100%",
  height = 200,
  cellSize = 50,
  color = COLORS.primary,
  opacity = 0.08,
  style,
}) {
  const id = `kene-spiral-${Math.random().toString(36).slice(2, 7)}`;
  const s = cellSize;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width={s} height={s} patternUnits="userSpaceOnUse">
          {/* Main spiral arc */}
          <path
            d={`M${s*0.1} ${s*0.5}
                C${s*0.1} ${s*0.15}, ${s*0.5} ${s*0.05}, ${s*0.5} ${s*0.3}
                C${s*0.5} ${s*0.5}, ${s*0.3} ${s*0.55}, ${s*0.3} ${s*0.45}`}
            fill="none" stroke={color} strokeWidth="0.7" opacity={opacity}
          />
          {/* Mirror spiral */}
          <path
            d={`M${s*0.9} ${s*0.5}
                C${s*0.9} ${s*0.85}, ${s*0.5} ${s*0.95}, ${s*0.5} ${s*0.7}
                C${s*0.5} ${s*0.5}, ${s*0.7} ${s*0.45}, ${s*0.7} ${s*0.55}`}
            fill="none" stroke={color} strokeWidth="0.7" opacity={opacity}
          />
          {/* Connecting line */}
          <line x1={s*0.3} y1={s*0.5} x2={s*0.7} y2={s*0.5}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.5}
            strokeDasharray="2 2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}


/* ════════════════════════════════════════════════════════
   3. BORDER / FRAME PATTERNS (Cano Kené)
   Repeating linear borders for dividers and frames
   ════════════════════════════════════════════════════════ */

/** Zigzag Border — classic zigzag divider with diamond accents */
export function KeneBorderZigzag({
  width = "100%",
  height = 20,
  color = COLORS.primary,
  opacity = 0.3,
  style,
}) {
  const id = `kene-zig-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width="24" height={height} patternUnits="userSpaceOnUse">
          {/* Zigzag */}
          <path
            d={`M0 ${height/2} L6 ${height*0.2} L12 ${height/2} L18 ${height*0.8} L24 ${height/2}`}
            fill="none" stroke={color} strokeWidth="1" opacity={opacity}
          />
          {/* Diamond accent */}
          <path
            d={`M12 ${height/2 - 3} L15 ${height/2} L12 ${height/2 + 3} L9 ${height/2} Z`}
            fill={color} opacity={opacity * 0.4}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Step Border — geometric stepped meander band */
export function KeneBorderStep({
  width = "100%",
  height = 24,
  color = COLORS.primary,
  opacity = 0.3,
  style,
}) {
  const id = `kene-step-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg width={width} height={height} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width="32" height={height} patternUnits="userSpaceOnUse">
          {/* Upper step */}
          <path
            d={`M0 ${height/2}
                H8 V${height*0.2}
                H16 V${height/2}
                H24 V${height*0.8}
                H32 V${height/2}`}
            fill="none" stroke={color} strokeWidth="0.8" opacity={opacity}
          />
          {/* Lower parallel */}
          <path
            d={`M0 ${height/2 + 3}
                H8 V${height*0.2 + 3}
                H16 V${height/2 + 3}
                H24 V${height*0.8 + 3}
                H32 V${height/2 + 3}`}
            fill="none" stroke={color} strokeWidth="0.4" opacity={opacity * 0.5}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Wave Border — smooth sinusoidal wave band */
export function KeneBorderWave({
  width = "100%",
  height = 20,
  color = COLORS.primary,
  opacity = 0.3,
  style,
}) {
  const id = `kene-wave-${Math.random().toString(36).slice(2, 7)}`;
  const h = height;
  return (
    <svg width={width} height={h} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width="40" height={h} patternUnits="userSpaceOnUse">
          {/* Primary wave */}
          <path
            d={`M0 ${h/2} Q10 ${h*0.15} 20 ${h/2} Q30 ${h*0.85} 40 ${h/2}`}
            fill="none" stroke={color} strokeWidth="1" opacity={opacity}
          />
          {/* Secondary thinner wave */}
          <path
            d={`M0 ${h/2} Q10 ${h*0.3} 20 ${h/2} Q30 ${h*0.7} 40 ${h/2}`}
            fill="none" stroke={color} strokeWidth="0.5" opacity={opacity * 0.5}
          />
          {/* Dots at peaks/troughs */}
          <circle cx="10" cy={h * 0.15} r="1.2" fill={color} opacity={opacity * 0.6} />
          <circle cx="30" cy={h * 0.85} r="1.2" fill={color} opacity={opacity * 0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Cross Chain Border — linked cross motifs */
export function KeneBorderCrossChain({
  width = "100%",
  height = 18,
  color = COLORS.primary,
  opacity = 0.3,
  style,
}) {
  const id = `kene-cross-${Math.random().toString(36).slice(2, 7)}`;
  const h = height;
  return (
    <svg width={width} height={h} style={{ display: "block", ...style }}>
      <defs>
        <pattern id={id} x="0" y="0" width="28" height={h} patternUnits="userSpaceOnUse">
          {/* Cross */}
          <line x1="10" y1={h * 0.15} x2="10" y2={h * 0.85}
            stroke={color} strokeWidth="0.7" opacity={opacity} />
          <line x1="4" y1={h / 2} x2="16" y2={h / 2}
            stroke={color} strokeWidth="0.7" opacity={opacity} />
          {/* Diamond link */}
          <path
            d={`M20 ${h*0.3} L24 ${h/2} L20 ${h*0.7} L16 ${h/2} Z`}
            fill="none" stroke={color} strokeWidth="0.6" opacity={opacity * 0.7}
          />
          {/* Connecting line */}
          <line x1="24" y1={h / 2} x2="28" y2={h / 2}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.4} />
          <line x1="0" y1={h / 2} x2="4" y2={h / 2}
            stroke={color} strokeWidth="0.4" opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}


/* ════════════════════════════════════════════════════════
   4. COMPOSITE / UTILITY
   Higher-level components combining patterns with UI
   ════════════════════════════════════════════════════════ */

/** Pattern Background — wraps any pattern as an absolute-positioned background layer */
export function KeneBackground({ pattern = "diamond", color, opacity, cellSize, children, style }) {
  const patternMap = {
    diamond: KeneDiamondGrid,
    lattice: KeneDiamondLattice,
    stacked: KeneStackedDiamonds,
    river: KeneRiverFlow,
    maze: KeneMazePath,
    spiral: KeneSpiralVine,
  };
  const PatternComponent = patternMap[pattern] || KeneDiamondGrid;

  return (
    <div style={{ position: "relative", overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <PatternComponent
          width="100%"
          height="100%"
          color={color}
          opacity={opacity}
          cellSize={cellSize}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/** Section Divider — a decorative border between sections */
export function KeneDivider({
  variant = "zigzag",
  color = COLORS.primary,
  opacity = 0.3,
  width = "100%",
  style,
}) {
  const borderMap = {
    zigzag: KeneBorderZigzag,
    step: KeneBorderStep,
    wave: KeneBorderWave,
    cross: KeneBorderCrossChain,
  };
  const BorderComponent = borderMap[variant] || KeneBorderZigzag;
  return <BorderComponent width={width} color={color} opacity={opacity} style={style} />;
}

/** Card Frame — a card with a kené border accent */
export function KeneFramedCard({ children, borderVariant = "zigzag", borderColor = COLORS.primary, style }) {
  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 12,
      border: "1px solid #e0ddd4",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(36,34,32,0.08)",
      ...style,
    }}>
      <KeneDivider variant={borderVariant} color={borderColor} opacity={0.25} />
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   SHOWCASE / CATALOG
   Interactive demo of the full pattern library
   ════════════════════════════════════════════════════════ */

export default function KenePatternCatalog() {
  const [activeColor, setActiveColor] = useState(COLORS.primary);
  const [activeOpacity, setActiveOpacity] = useState(0.1);

  const colorOptions = [
    { label: "Burgundy", value: COLORS.primary },
    { label: "Earth", value: COLORS.earth },
    { label: "Plum", value: COLORS.plum },
    { label: "Sage", value: COLORS.sage },
  ];

  const opacityOptions = [
    { label: "5%", value: 0.05 },
    { label: "8%", value: 0.08 },
    { label: "12%", value: 0.12 },
    { label: "20%", value: 0.2 },
  ];

  function PatternCard({ title, description, children }) {
    return (
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        border: "1px solid #e0ddd4",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(36,34,32,0.08)",
      }}>
        <div style={{
          height: 140,
          position: "relative",
          backgroundColor: "#2e1616",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}>
          {children}
        </div>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#6b6658", lineHeight: 1.5 }}>{description}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f9f8f7", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #2e1616 0%, #432020 40%, #7a3333 100%)",
        padding: "48px 40px 40px",
      }}>
        <KeneDiamondGrid width="100%" height="100%" color="#d09e9e" opacity={0.06} cellSize={44}
          style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", color: "#d09e9e", textTransform: "uppercase", marginBottom: 8 }}>
            onanti Pattern Library
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 42, color: "#fff", margin: 0, fontWeight: 400 }}>
            Kene Patterns
          </h1>
          <p style={{ fontSize: 15, color: "#e3c5c5", marginTop: 10, maxWidth: 560, lineHeight: 1.6 }}>
            Abstracted Shipibo kene-inspired geometric patterns for backgrounds, dividers, and decorative accents.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px 80px" }}>

        {/* ── Controls ── */}
        <div style={{ display: "flex", gap: 32, marginBottom: 36, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a392", letterSpacing: "0.05em", marginBottom: 8 }}>COLOR</div>
            <div style={{ display: "flex", gap: 6 }}>
              {colorOptions.map((c) => (
                <button key={c.value} onClick={() => setActiveColor(c.value)} style={{
                  padding: "5px 12px", fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                  border: activeColor === c.value ? `2px solid ${c.value}` : "1.5px solid #e0ddd4",
                  backgroundColor: activeColor === c.value ? c.value + "15" : "#fff",
                  color: activeColor === c.value ? c.value : "#6b6658",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a392", letterSpacing: "0.05em", marginBottom: 8 }}>OPACITY</div>
            <div style={{ display: "flex", gap: 6 }}>
              {opacityOptions.map((o) => (
                <button key={o.value} onClick={() => setActiveOpacity(o.value)} style={{
                  padding: "5px 12px", fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                  border: activeOpacity === o.value ? `2px solid #7a3333` : "1.5px solid #e0ddd4",
                  backgroundColor: activeOpacity === o.value ? "#f2e4e4" : "#fff",
                  color: activeOpacity === o.value ? "#7a3333" : "#6b6658",
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Diamond Patterns ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: "#242220", margin: "0 0 6px", fontWeight: 400 }}>Diamond Grid Patterns</h2>
          <p style={{ fontSize: 13, color: "#6b6658", margin: "0 0 20px" }}>Classic interlocking diamond motifs. Use for hero backgrounds and feature sections.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <PatternCard title="Diamond Grid" description="The foundational kene motif. Interlocking diamonds with cross accents at intersections.">
              <KeneDiamondGrid width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={36} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
            <PatternCard title="Diamond Lattice" description="Denser woven variant with horizontal and vertical bars creating a textile-like grid.">
              <KeneDiamondLattice width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={30} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
            <PatternCard title="Stacked Diamonds" description="Nested concentric diamonds creating depth and focus. Good for empty states.">
              <KeneStackedDiamonds width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={52} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
          </div>
        </div>

        {/* ── River Patterns ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: "#242220", margin: "0 0 6px", fontWeight: 400 }}>River Line Patterns</h2>
          <p style={{ fontSize: 13, color: "#6b6658", margin: "0 0 20px" }}>Flowing, serpentine paths inspired by Amazonian rivers. Use for organic backgrounds and transitions.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <PatternCard title="River Flow" description="Undulating parallel waves with rhythmic vertical marks between crests.">
              <KeneRiverFlow width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={44} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
            <PatternCard title="Maze Path" description="Right-angle meander pattern evoking ceremonial pathways and labyrinthine visions.">
              <KeneMazePath width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={32} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
            <PatternCard title="Spiral Vine" description="Organic spiraling curves paired in symmetry, like vines growing along the ayahuasca path.">
              <KeneSpiralVine width="100%" height={140} color={activeColor} opacity={activeOpacity} cellSize={46} style={{ position: "absolute", inset: 0 }} />
            </PatternCard>
          </div>
        </div>

        {/* ── Border Patterns ── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: "#242220", margin: "0 0 6px", fontWeight: 400 }}>Border Patterns</h2>
          <p style={{ fontSize: 13, color: "#6b6658", margin: "0 0 20px" }}>Repeating linear patterns for section dividers, card accents, and navigation decoration.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { name: "Zigzag", desc: "Classic zigzag with diamond accents at each peak. The primary section divider.", Component: KeneBorderZigzag },
              { name: "Step", desc: "Geometric stepped meander with parallel track lines. Use for navigation areas.", Component: KeneBorderStep },
              { name: "Wave", desc: "Smooth sinusoidal waves with dot accents. Softer feel for content sections.", Component: KeneBorderWave },
              { name: "Cross Chain", desc: "Linked cross-and-diamond chain. Use for framing cards or highlighting sections.", Component: KeneBorderCrossChain },
            ].map(({ name, desc, Component }) => (
              <div key={name} style={{
                backgroundColor: "#fff", borderRadius: 10, border: "1px solid #e0ddd4",
                padding: 20, boxShadow: "0 1px 4px rgba(36,34,32,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#242220" }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#6b6658", marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
                {/* Light background demo */}
                <div style={{ backgroundColor: "#f9f8f7", borderRadius: 6, padding: "12px 0", marginBottom: 10 }}>
                  <Component color={activeColor} opacity={0.35} />
                </div>
                {/* Dark background demo */}
                <div style={{ backgroundColor: "#2e1616", borderRadius: 6, padding: "12px 0" }}>
                  <Component color="#d09e9e" opacity={0.4} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Usage Examples ── */}
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: "#242220", margin: "0 0 6px", fontWeight: 400 }}>Usage Examples</h2>
          <p style={{ fontSize: 13, color: "#6b6658", margin: "0 0 20px" }}>How patterns integrate into onanti UI components.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Card with border accent */}
            <KeneFramedCard borderVariant="wave" borderColor={activeColor}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7a3333", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Lesson Card</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#242220", marginBottom: 4 }}>Icaro de Sanacion</div>
              <div style={{ fontSize: 13, color: "#6b6658" }}>Continue from Verse 3</div>
            </KeneFramedCard>

            {/* Card with border accent */}
            <KeneFramedCard borderVariant="cross" borderColor={COLORS.plum}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#785496", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Achievement</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#242220", marginBottom: 4 }}>7-Day Streak</div>
              <div style={{ fontSize: 13, color: "#6b6658" }}>You've practiced every day this week</div>
            </KeneFramedCard>

            {/* Hero with pattern bg */}
            <div style={{ gridColumn: "1 / -1" }}>
              <KeneBackground
                pattern="stacked"
                color="#d09e9e"
                opacity={0.06}
                style={{
                  background: "linear-gradient(135deg, #2e1616, #432020 50%, #5e2828)",
                  borderRadius: 12,
                  padding: "36px 32px",
                  color: "#fff",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", color: "#d09e9e", textTransform: "uppercase", marginBottom: 6 }}>
                  Welcome back, Brett
                </div>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, marginBottom: 6 }}>
                  Continue Your Journey
                </div>
                <div style={{ fontSize: 14, color: "#e3c5c5", maxWidth: 400 }}>
                  You have 12 flashcards due and 1 new lesson available.
                </div>
              </KeneBackground>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
