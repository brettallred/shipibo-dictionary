import { useState } from "react";
import {
  KeneDiamondGrid,
  KeneBorderZigzag as KeneBorder,
  KeneBackground,
} from "./kene-patterns";

const tokens = {
  color: {
    burgundy: { 50: "#faf5f5", 100: "#f2e4e4", 200: "#e3c5c5", 300: "#d09e9e", 400: "#b87070", 500: "#9c4a4a", 600: "#7a3333", 700: "#5e2828", 800: "#432020", 900: "#2e1616", 950: "#1a0d0d" },
    earth: { 50: "#faf8f5", 100: "#f0ebe3", 200: "#e0d5c5", 300: "#c9b89e", 400: "#b09776", 500: "#967854", 600: "#7a5f3f", 700: "#5e4930", 800: "#433425", 900: "#2e241a", 950: "#1a1510" },
    sage: { 50: "#f5f7f5", 100: "#e4ebe4", 200: "#c5d5c5", 300: "#9eb89e", 400: "#769776", 500: "#547854", 600: "#3f5f3f", 700: "#304930", 800: "#253425", 900: "#1a241a", 950: "#101510" },
    plum: { 50: "#f8f5fa", 100: "#ebe3f0", 200: "#d5c5e0", 300: "#b89ec9", 400: "#9776b0", 500: "#785496", 600: "#5f3f7a", 700: "#49305e", 800: "#342543", 900: "#241a2e", 950: "#15101a" },
    neutral: { 0: "#ffffff", 50: "#f9f8f7", 100: "#f0eee9", 200: "#e0ddd4", 300: "#c9c5b8", 400: "#a8a392", 500: "#8a8474", 600: "#6b6658", 700: "#504c42", 800: "#383530", 900: "#242220", 950: "#141312" },
  },
};

/* KenePattern — wrapper around KeneDiamondGrid for backward compatibility in this file */
function KenePattern({ opacity = 0.06, color = "#7a3333", size = 60 }) {
  return (
    <KeneDiamondGrid
      width="100%"
      height="100%"
      cellSize={size}
      color={color}
      opacity={opacity}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}

/* ── Section Header ── */
function SectionHeader({ number, title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 14, color: "#7a3333", fontWeight: 400, letterSpacing: "0.1em", textTransform: "uppercase" }}>{number}</span>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: "#242220", margin: 0, fontWeight: 400 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ color: "#6b6658", fontSize: 15, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>}
      <div style={{ marginTop: 16 }}><KeneBorder /></div>
    </div>
  );
}

/* ── Color Swatch ── */
function Swatch({ hex, label, size = 48, showLabel = true }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        width: size, height: size, borderRadius: 8, backgroundColor: hex,
        border: hex === "#ffffff" ? "1px solid #e0ddd4" : "none",
        boxShadow: hov ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
        transition: "box-shadow 0.2s ease", cursor: "pointer"
      }} />
      {showLabel && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#6b6658", fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 9, color: "#a8a392", fontFamily: "monospace" }}>{hex}</div>
        </div>
      )}
    </div>
  );
}

/* ── Color Palette Row ── */
function PaletteRow({ name, colors }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#242220", marginBottom: 10, textTransform: "capitalize", letterSpacing: "0.03em" }}>{name}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {Object.entries(colors).map(([k, v]) => <Swatch key={k} hex={v} label={k} size={44} />)}
      </div>
    </div>
  );
}

/* ── Button Component ── */
function Button({ variant = "primary", size = "md", children, icon, disabled = false }) {
  const [hov, setHov] = useState(false);
  const [pressed, setPressed] = useState(false);

  const sizeMap = {
    sm: { px: 14, py: 7, fs: 13, r: 8 },
    md: { px: 20, py: 10, fs: 14, r: 10 },
    lg: { px: 28, py: 13, fs: 16, r: 12 },
  };

  const variantMap = {
    primary: { bg: pressed ? "#432020" : hov ? "#5e2828" : "#7a3333", color: "#fff", border: "none" },
    secondary: { bg: pressed ? "#e0d5c5" : hov ? "#f0ebe3" : "#faf8f5", color: "#5e4930", border: "1.5px solid #c9b89e" },
    ghost: { bg: pressed ? "#f0eee9" : hov ? "#f9f8f7" : "transparent", color: "#6b6658", border: "none" },
    accent: { bg: pressed ? "#49305e" : hov ? "#5f3f7a" : "#785496", color: "#fff", border: "none" },
    danger: { bg: pressed ? "#8a2222" : hov ? "#a03030" : "#b83d3d", color: "#fff", border: "none" },
  };

  const s = sizeMap[size];
  const v = variantMap[variant];

  return (
    <button
      onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer",
        padding: `${s.py}px ${s.px}px`, fontSize: s.fs, fontWeight: 500, borderRadius: s.r,
        backgroundColor: disabled ? "#e0ddd4" : v.bg, color: disabled ? "#a8a392" : v.color,
        border: v.border, fontFamily: "'Inter', system-ui, sans-serif",
        transition: "all 150ms ease", letterSpacing: "0.01em",
        opacity: disabled ? 0.6 : 1, lineHeight: 1.2,
      }}
    >
      {icon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
      {children}
    </button>
  );
}

/* ── Input Component ── */
function Input({ label, placeholder, helper, error, type = "text" }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#b83d3d" : focused ? "#7a3333" : "#e0ddd4";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: "#242220" }}>{label}</label>}
      <input
        type={type} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          padding: "10px 14px", fontSize: 14, borderRadius: 10,
          border: `1.5px solid ${borderColor}`, outline: "none",
          backgroundColor: "#fff", color: "#242220",
          fontFamily: "'Inter', system-ui, sans-serif",
          transition: "border-color 150ms ease",
          boxShadow: focused ? `0 0 0 3px rgba(122, 51, 51, 0.1)` : "none",
        }}
      />
      {(helper || error) && (
        <span style={{ fontSize: 12, color: error ? "#b83d3d" : "#a8a392" }}>{error || helper}</span>
      )}
    </div>
  );
}

/* ── Card Component ── */
function Card({ children, padding = 24, hover = true, style: extraStyle }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: "#fff", borderRadius: 12,
        border: "1px solid #e0ddd4", padding,
        boxShadow: hov && hover ? "0 8px 24px rgba(36,34,32,0.12)" : "0 2px 8px rgba(36,34,32,0.08)",
        transition: "box-shadow 250ms ease, transform 250ms ease",
        transform: hov && hover ? "translateY(-2px)" : "none",
        ...extraStyle,
      }}
    >
      {children}
    </div>
  );
}

/* ── Audio Player Component ── */
function AudioPlayer() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [speed, setSpeed] = useState("1x");
  const speeds = ["0.5x", "0.75x", "1x", "1.5x"];

  return (
    <Card padding={0} hover={false}>
      <div style={{ padding: "20px 24px" }}>
        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 2 }}>Icaro de Proteccion</div>
            <div style={{ fontSize: 13, color: "#6b6658" }}>Maestro Ricardo Amaringo</div>
          </div>
          <div style={{ padding: "3px 10px", borderRadius: 20, backgroundColor: "#f2e4e4", fontSize: 11, fontWeight: 600, color: "#7a3333" }}>
            Learning
          </div>
        </div>

        {/* Waveform / Progress */}
        <div style={{ position: "relative", height: 48, marginBottom: 12, cursor: "pointer" }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setProgress(Math.round((e.clientX - rect.left) / rect.width * 100));
          }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 2 }}>
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 8 + Math.sin(i * 0.5) * 14 + Math.random() * 8;
              const filled = i / 60 * 100 < progress;
              return (
                <div key={i} style={{
                  flex: 1, height: h, borderRadius: 2,
                  backgroundColor: filled ? "#7a3333" : "#e0ddd4",
                  transition: "background-color 100ms ease",
                }} />
              );
            })}
          </div>
        </div>

        {/* Time + Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#a8a392", fontFamily: "monospace" }}>1:23 / 3:47</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Speed */}
            <div style={{ display: "flex", gap: 2 }}>
              {speeds.map((s) => (
                <button key={s} onClick={() => setSpeed(s)}
                  style={{
                    padding: "3px 8px", fontSize: 11, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer",
                    backgroundColor: speed === s ? "#7a3333" : "transparent",
                    color: speed === s ? "#fff" : "#a8a392",
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Play/Pause */}
            <button onClick={() => setPlaying(!playing)} style={{
              width: 40, height: 40, borderRadius: 20, border: "none", cursor: "pointer",
              backgroundColor: "#7a3333", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "background-color 150ms ease",
            }}>
              {playing ? "❚❚" : "▶"}
            </button>
          </div>
        </div>
      </div>

      {/* Lyrics Section */}
      <div style={{ borderTop: "1px solid #e0ddd4", padding: "16px 24px", backgroundColor: "#faf8f5" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, color: "#242220", lineHeight: 1.8, letterSpacing: "0.025em", fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
              <span style={{ backgroundColor: "#f2e4e4", padding: "2px 6px", borderRadius: 4 }}>Nai nai nai naibo</span>{" "}
              <span style={{ color: "#a8a392" }}>iki iki iki</span>
            </div>
            <div style={{ fontSize: 14, color: "#6b6658", marginTop: 4, lineHeight: 1.6 }}>
              I come, I come, I come singing
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, color: "#a8a392", lineHeight: 1.8, letterSpacing: "0.025em", fontFamily: "'Noto Sans', 'Inter', sans-serif" }}>
              Jakon jonibaon birishtibo
            </div>
            <div style={{ fontSize: 14, color: "#c9c5b8", marginTop: 4, lineHeight: 1.6 }}>
              With the beautiful designs of good people
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Flashcard Component ── */
function Flashcard() {
  const [flipped, setFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          perspective: "1000px", cursor: "pointer",
          height: 220, position: "relative",
        }}
      >
        <div style={{
          position: "absolute", inset: 0,
          transition: "transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
        }}>
          {/* Front */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            backgroundColor: "#fff", borderRadius: 16, border: "1.5px solid #e0ddd4",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, boxShadow: "0 2px 8px rgba(36,34,32,0.08)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#7a3333", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Shipibo</div>
            <div style={{ fontSize: 28, fontWeight: 400, color: "#242220", fontFamily: "'Noto Sans', 'Inter', sans-serif", textAlign: "center", letterSpacing: "0.03em" }}>
              Jiwi
            </div>
            <div style={{ fontSize: 13, color: "#a8a392", marginTop: 24 }}>Tap to reveal</div>
          </div>
          {/* Back */}
          <div style={{
            position: "absolute", inset: 0, backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            backgroundColor: "#faf8f5", borderRadius: 16, border: "1.5px solid #c9b89e",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, boxShadow: "0 2px 8px rgba(36,34,32,0.08)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#967854", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Translation</div>
            <div style={{ fontSize: 26, fontWeight: 400, color: "#242220", textAlign: "center" }}>
              Bird
            </div>
            <div style={{ fontSize: 14, color: "#6b6658", marginTop: 8, fontStyle: "italic" }}>
              "hee-wee"
            </div>
          </div>
        </div>
      </div>

      {/* Difficulty Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "Again", sub: "< 1 min", color: "#b83d3d", bg: "#fdf0f0" },
          { label: "Hard", sub: "6 min", color: "#c4882f", bg: "#fdf5e8" },
          { label: "Good", sub: "10 min", color: "#547854", bg: "#e4ebe4" },
          { label: "Easy", sub: "4 days", color: "#7a3333", bg: "#f2e4e4" },
        ].map((d) => (
          <button key={d.label} onClick={() => setDifficulty(d.label)}
            style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
              border: difficulty === d.label ? `2px solid ${d.color}` : "1.5px solid #e0ddd4",
              backgroundColor: difficulty === d.label ? d.bg : "#fff",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              fontFamily: "'Inter', system-ui, sans-serif", transition: "all 150ms ease",
            }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: d.color }}>{d.label}</span>
            <span style={{ fontSize: 10, color: "#a8a392" }}>{d.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Progress Bar ── */
function ProgressBar({ value = 65, label = "Course Progress", color = "#7a3333" }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#242220" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, backgroundColor: "#f0eee9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${value}%`, backgroundColor: color,
          borderRadius: 4, transition: "width 500ms ease",
        }} />
      </div>
    </div>
  );
}

/* ── Badge / Tag ── */
function Badge({ children, variant = "primary" }) {
  const map = {
    primary: { bg: "#f2e4e4", color: "#7a3333" },
    secondary: { bg: "#f0ebe3", color: "#5e4930" },
    accent: { bg: "#ebe3f0", color: "#5f3f7a" },
    success: { bg: "#e4ebe4", color: "#3f5f3f" },
    neutral: { bg: "#f0eee9", color: "#504c42" },
  };
  const v = map[variant];
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
      backgroundColor: v.bg, color: v.color,
    }}>
      {children}
    </span>
  );
}

/* ── Nav Tab Bar (Mobile) ── */
function TabBar() {
  const [active, setActive] = useState(0);
  const tabs = [
    { label: "Learn", icon: "📖" },
    { label: "Practice", icon: "🔄" },
    { label: "Library", icon: "🎵" },
    { label: "Profile", icon: "👤" },
  ];
  return (
    <div style={{
      display: "flex", backgroundColor: "#fff", borderTop: "1px solid #e0ddd4",
      padding: "8px 0 4px", borderRadius: "0 0 12px 12px",
    }}>
      {tabs.map((t, i) => (
        <button key={t.label} onClick={() => setActive(i)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          border: "none", background: "none", cursor: "pointer", padding: "4px 0",
        }}>
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{
            fontSize: 10, fontWeight: active === i ? 600 : 400,
            color: active === i ? "#7a3333" : "#a8a392",
            transition: "color 150ms ease",
          }}>{t.label}</span>
          {active === i && (
            <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#7a3333", marginTop: 1 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Streak / Stat widget ── */
function StatWidget() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {[
        { label: "Day Streak", value: "14", accent: "#7a3333" },
        { label: "Icaros Learned", value: "8", accent: "#785496" },
        { label: "Cards Today", value: "32", accent: "#547854" },
      ].map((s) => (
        <Card key={s.label} padding={16} hover={false} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: s.accent, fontFamily: "'DM Serif Display', Georgia, serif" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "#6b6658", marginTop: 4, fontWeight: 500 }}>{s.label}</div>
        </Card>
      ))}
    </div>
  );
}

/* ── Typography Showcase ── */
function TypographyShowcase() {
  const styles = [
    { name: "Display", el: "h1", font: "'DM Serif Display', Georgia, serif", size: 48, weight: 400, sample: "onanti" },
    { name: "H1", el: "h1", font: "'DM Serif Display', Georgia, serif", size: 36, weight: 400, sample: "Healing Songs" },
    { name: "H2", el: "h2", font: "'DM Serif Display', Georgia, serif", size: 30, weight: 400, sample: "Learn the Tradition" },
    { name: "H3", el: "h3", font: "'DM Serif Display', Georgia, serif", size: 24, weight: 400, sample: "Icaro Collection" },
    { name: "H4", el: "h4", font: "'Inter', system-ui, sans-serif", size: 20, weight: 600, sample: "Practice Session" },
    { name: "Body Large", el: "p", font: "'Inter', system-ui, sans-serif", size: 18, weight: 400, sample: "The Shipibo people encode healing melodies in geometric patterns." },
    { name: "Body", el: "p", font: "'Inter', system-ui, sans-serif", size: 16, weight: 400, sample: "Each icaro carries specific healing intentions passed through generations of maestros." },
    { name: "Body Small", el: "p", font: "'Inter', system-ui, sans-serif", size: 14, weight: 400, sample: "Review 5 flashcards to complete today's practice." },
    { name: "Caption", el: "span", font: "'Inter', system-ui, sans-serif", size: 12, weight: 500, sample: "LAST PRACTICED 2 HOURS AGO" },
    { name: "Icaro Text", el: "p", font: "'Noto Sans', 'Inter', sans-serif", size: 20, weight: 400, sample: "Nai nai nai naibo iki iki iki", extra: { letterSpacing: "0.025em", lineHeight: 1.8 } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {styles.map((s) => (
        <div key={s.name} style={{ display: "flex", gap: 20, alignItems: "baseline", borderBottom: "1px solid #f0eee9", paddingBottom: 16 }}>
          <div style={{ width: 100, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#7a3333", letterSpacing: "0.05em" }}>{s.name}</div>
            <div style={{ fontSize: 10, color: "#a8a392", marginTop: 2 }}>{s.size}px / {s.weight}</div>
          </div>
          <div style={{ fontFamily: s.font, fontSize: s.size, fontWeight: s.weight, color: "#242220", lineHeight: 1.3, ...s.extra }}>
            {s.sample}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Spacing Showcase ── */
function SpacingShowcase() {
  const spaces = [
    { name: "1", val: 4 }, { name: "2", val: 8 }, { name: "3", val: 12 }, { name: "4", val: 16 },
    { name: "6", val: 24 }, { name: "8", val: 32 }, { name: "12", val: 48 }, { name: "16", val: 64 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {spaces.map((s) => (
        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 60, fontSize: 12, color: "#6b6658", fontFamily: "monospace", textAlign: "right" }}>
            --space-{s.name}
          </div>
          <div style={{ width: s.val, height: 20, backgroundColor: "#7a3333", borderRadius: 3, opacity: 0.7 }} />
          <div style={{ fontSize: 11, color: "#a8a392" }}>{s.val}px</div>
        </div>
      ))}
    </div>
  );
}

/* ── Radius Showcase ── */
function RadiusShowcase() {
  const radii = [
    { name: "sm", val: 4 }, { name: "md", val: 8 }, { name: "lg", val: 12 },
    { name: "xl", val: 16 }, { name: "2xl", val: 24 }, { name: "full", val: 9999 },
  ];
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {radii.map((r) => (
        <div key={r.name} style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: r.val,
            border: "2px solid #7a3333", backgroundColor: "#faf5f5",
          }} />
          <div style={{ fontSize: 11, color: "#6b6658", marginTop: 6, fontWeight: 500 }}>{r.name}</div>
          <div style={{ fontSize: 10, color: "#a8a392" }}>{r.val === 9999 ? "full" : `${r.val}px`}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Shadow Showcase ── */
function ShadowShowcase() {
  const shadows = [
    { name: "xs", val: "0 1px 2px rgba(36,34,32,0.05)" },
    { name: "sm", val: "0 1px 3px rgba(36,34,32,0.1), 0 1px 2px rgba(36,34,32,0.06)" },
    { name: "md", val: "0 4px 6px rgba(36,34,32,0.07), 0 2px 4px rgba(36,34,32,0.06)" },
    { name: "lg", val: "0 10px 15px rgba(36,34,32,0.08), 0 4px 6px rgba(36,34,32,0.05)" },
    { name: "xl", val: "0 20px 25px rgba(36,34,32,0.1), 0 8px 10px rgba(36,34,32,0.04)" },
  ];
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {shadows.map((s) => (
        <div key={s.name} style={{ textAlign: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 12,
            backgroundColor: "#fff", boxShadow: s.val,
          }} />
          <div style={{ fontSize: 11, color: "#6b6658", marginTop: 8, fontWeight: 500 }}>{s.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Mobile Screen Preview ── */
function MobilePreview() {
  return (
    <div style={{
      width: 320, borderRadius: 24, overflow: "hidden",
      border: "2px solid #e0ddd4", boxShadow: "0 20px 40px rgba(36,34,32,0.12)",
      backgroundColor: "#f9f8f7",
    }}>
      {/* Status Bar */}
      <div style={{ backgroundColor: "#fff", padding: "10px 20px", display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#242220" }}>
        <span>9:41</span>
        <span style={{ letterSpacing: 2 }}>···</span>
      </div>

      {/* Header */}
      <div style={{ backgroundColor: "#fff", padding: "12px 20px 16px", borderBottom: "1px solid #e0ddd4" }}>
        <div style={{ fontSize: 11, color: "#a8a392", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>Welcome back</div>
        <div style={{ fontSize: 24, fontFamily: "'DM Serif Display', Georgia, serif", color: "#242220", marginTop: 2 }}>Your Journey</div>
      </div>

      {/* Content */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <StatWidget />
        <ProgressBar value={65} label="Icaro de Sanacion" />
        <ProgressBar value={30} label="Icaro de Proteccion" color="#785496" />

        {/* Next Lesson Card */}
        <Card padding={16} hover={false}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7a3333", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Continue</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#242220" }}>Icaro de Mareo</div>
              <div style={{ fontSize: 12, color: "#a8a392", marginTop: 2 }}>Lesson 3 of 12</div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: "#7a3333",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 18,
            }}>▶</div>
          </div>
        </Card>
      </div>

      {/* Tab Bar */}
      <TabBar />
    </div>
  );
}

/* ── Main Design Language Document ── */
export default function OnAntiDesignLanguage() {
  const [activeSection, setActiveSection] = useState("all");

  const sections = [
    { id: "all", label: "All" },
    { id: "principles", label: "Principles" },
    { id: "colors", label: "Colors" },
    { id: "type", label: "Typography" },
    { id: "spacing", label: "Spacing" },
    { id: "components", label: "Components" },
    { id: "screens", label: "Screens" },
  ];

  const show = (id) => activeSection === "all" || activeSection === id;

  return (
    <div style={{ backgroundColor: "#f9f8f7", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Hero Header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg, #2e1616 0%, #432020 30%, #7a3333 60%, #5e4930 100%)",
        padding: "64px 48px 56px", color: "#fff",
      }}>
        <KenePattern opacity={0.08} color="#d09e9e" size={50} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 800 }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "#d09e9e", marginBottom: 12 }}>
            Design Language v1.0
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 56, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
            onanti
          </h1>
          <p style={{ fontSize: 18, color: "#e3c5c5", marginTop: 16, maxWidth: 560, lineHeight: 1.6, fontWeight: 300 }}>
            A design system for learning Shipibo icaros. Rooted in tradition, built for clarity and function.
          </p>
        </div>
      </div>

      {/* ── Section Nav ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        backgroundColor: "#fff", borderBottom: "1px solid #e0ddd4",
        padding: "0 48px", display: "flex", gap: 4, overflowX: "auto",
      }}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            padding: "14px 16px", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: activeSection === s.id ? 600 : 400,
            color: activeSection === s.id ? "#7a3333" : "#6b6658",
            backgroundColor: "transparent",
            borderBottom: activeSection === s.id ? "2px solid #7a3333" : "2px solid transparent",
            fontFamily: "'Inter', system-ui, sans-serif",
            transition: "all 150ms ease",
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px 96px" }}>

        {/* ── Principles ── */}
        {show("principles") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="01" title="Design Principles" subtitle="The foundational values that guide every design decision in onanti." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { title: "Function First", desc: "Learning is the priority. Every element serves a clear purpose. The interface should be invisible when the student is focused." },
                { title: "Cultural Respect", desc: "Shipibo kené patterns appear as subtle accents — never decorative noise. The tradition deserves understated reverence." },
                { title: "Warm Clarity", desc: "Earth tones and ample whitespace create a calm learning environment. Typography is highly legible with generous line height for lyric display." },
                { title: "Progressive Depth", desc: "New users see a simple, welcoming interface. Advanced features reveal themselves as the learner progresses." },
              ].map((p) => (
                <Card key={p.title} padding={24} hover={false}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 8, fontFamily: "'DM Serif Display', Georgia, serif" }}>{p.title}</div>
                  <div style={{ fontSize: 14, color: "#6b6658", lineHeight: 1.6 }}>{p.desc}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Colors ── */}
        {show("colors") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="02" title="Color System" subtitle="A palette inspired by Amazonian earth tones — mahogany bark, river clay, and forest canopy." />

            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Primitive Scales</h3>
            {Object.entries(tokens.color).map(([name, scale]) => (
              <PaletteRow key={name} name={name} colors={scale} />
            ))}

            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", margin: "32px 0 16px" }}>Semantic Roles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Primary", hex: "#7a3333", desc: "Actions, links, focus" },
                { label: "Secondary", hex: "#967854", desc: "Supporting UI" },
                { label: "Accent", hex: "#785496", desc: "Highlights, tags" },
                { label: "Success", hex: "#547854", desc: "Completed, correct" },
                { label: "Warning", hex: "#c4882f", desc: "Caution states" },
                { label: "Error", hex: "#b83d3d", desc: "Errors, destructive" },
                { label: "Surface", hex: "#f9f8f7", desc: "Page background" },
                { label: "Text", hex: "#242220", desc: "Primary body text" },
              ].map((c) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.hex, border: c.hex === "#f9f8f7" ? "1px solid #e0ddd4" : "none" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#242220" }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: "#a8a392" }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Typography ── */}
        {show("type") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="03" title="Typography" subtitle="DM Serif Display for headings, Inter for body text, Noto Sans for icaro lyrics." />
            <TypographyShowcase />

            <div style={{ marginTop: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 12 }}>Font Stack</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { role: "Headings", family: "DM Serif Display", fallback: "Georgia, serif", why: "Elegant serif with cultural warmth" },
                  { role: "Body", family: "Inter", fallback: "system-ui, sans-serif", why: "Highly legible at all sizes" },
                  { role: "Icaro Lyrics", family: "Noto Sans", fallback: "Inter, sans-serif", why: "Broad Unicode support for diacritics" },
                  { role: "Code / Data", family: "JetBrains Mono", fallback: "SF Mono, monospace", why: "Timestamps, metadata" },
                ].map((f) => (
                  <div key={f.role} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid #f0eee9" }}>
                    <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: "#7a3333" }}>{f.role}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#242220" }}>{f.family}</span>
                      <span style={{ fontSize: 12, color: "#a8a392" }}> → {f.fallback}</span>
                      <div style={{ fontSize: 11, color: "#6b6658", marginTop: 2 }}>{f.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Spacing & Layout ── */}
        {show("spacing") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="04" title="Spacing, Radius & Shadow" subtitle="A 4px base grid with warm, natural shadow tones." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Spacing Scale</h3>
                <SpacingShowcase />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Border Radius</h3>
                <RadiusShowcase />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#242220", margin: "32px 0 16px" }}>Elevation</h3>
                <ShadowShowcase />
              </div>
            </div>
          </section>
        )}

        {/* ── Components ── */}
        {show("components") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="05" title="Components" subtitle="Core interactive elements designed for the learning experience." />

            {/* Buttons */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Buttons</h3>
            <Card padding={32} hover={false} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a392", letterSpacing: "0.05em", marginBottom: 10 }}>VARIANTS</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="accent">Accent</Button>
                    <Button variant="danger">Danger</Button>
                    <Button disabled>Disabled</Button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a392", letterSpacing: "0.05em", marginBottom: 10 }}>SIZES</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Inputs */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Form Inputs</h3>
            <Card padding={32} hover={false} style={{ marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                <Input label="Search Icaros" placeholder="Type a name..." helper="Search by title or maestro" />
                <Input label="Email" placeholder="you@example.com" />
                <Input label="Password" placeholder="Enter password" type="password" error="Must be at least 8 characters" />
              </div>
            </Card>

            {/* Badges */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Badges & Tags</h3>
            <Card padding={32} hover={false} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge variant="primary">Beginner</Badge>
                <Badge variant="secondary">Intermediate</Badge>
                <Badge variant="accent">Advanced</Badge>
                <Badge variant="success">Completed</Badge>
                <Badge variant="neutral">Archived</Badge>
              </div>
            </Card>

            {/* Progress */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Progress</h3>
            <Card padding={32} hover={false} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <ProgressBar value={85} label="Icaro de Sanacion" />
                <ProgressBar value={45} label="Icaro de Proteccion" color="#785496" />
                <ProgressBar value={20} label="Icaro de Mareo" color="#547854" />
              </div>
            </Card>

            {/* Audio Player */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Audio Player with Lyrics</h3>
            <div style={{ maxWidth: 480, marginBottom: 24 }}>
              <AudioPlayer />
            </div>

            {/* Flashcard */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Flashcard</h3>
            <div style={{ maxWidth: 360, marginBottom: 24 }}>
              <Flashcard />
            </div>

            {/* Stats */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#242220", marginBottom: 16 }}>Stat Widgets</h3>
            <div style={{ maxWidth: 480 }}>
              <StatWidget />
            </div>
          </section>
        )}

        {/* ── Screen Previews ── */}
        {show("screens") && (
          <section style={{ marginBottom: 64 }}>
            <SectionHeader number="06" title="Screen Previews" subtitle="Sample layouts showing how the design language comes together." />
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#242220", marginBottom: 12, textAlign: "center" }}>Mobile — Home</div>
                <MobilePreview />
              </div>
              <div style={{ flex: 1, minWidth: 400 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#242220", marginBottom: 12 }}>Desktop — Lesson View</div>
                <Card padding={0} hover={false} style={{ overflow: "hidden" }}>
                  {/* Desktop Nav */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", backgroundColor: "#fff", borderBottom: "1px solid #e0ddd4" }}>
                    <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, color: "#7a3333" }}>onanti</div>
                    <div style={{ display: "flex", gap: 24 }}>
                      {["Library", "Practice", "Progress"].map((item) => (
                        <span key={item} style={{ fontSize: 14, color: "#6b6658", fontWeight: 500, cursor: "pointer" }}>{item}</span>
                      ))}
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f2e4e4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#7a3333", fontWeight: 600 }}>B</div>
                  </div>
                  {/* Desktop Content */}
                  <div style={{ display: "flex" }}>
                    {/* Sidebar */}
                    <div style={{ width: 220, borderRight: "1px solid #e0ddd4", padding: 16, backgroundColor: "#faf8f5" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#a8a392", letterSpacing: "0.05em", marginBottom: 12 }}>LESSONS</div>
                      {["Introduction", "Verse 1", "Verse 2", "Chorus", "Practice"].map((l, i) => (
                        <div key={l} style={{
                          padding: "10px 12px", borderRadius: 8, fontSize: 13,
                          backgroundColor: i === 1 ? "#f2e4e4" : "transparent",
                          color: i === 1 ? "#7a3333" : "#6b6658",
                          fontWeight: i === 1 ? 600 : 400, marginBottom: 4,
                          cursor: "pointer",
                        }}>
                          {l}
                          {i < 1 && <span style={{ float: "right", color: "#547854" }}>✓</span>}
                        </div>
                      ))}
                    </div>
                    {/* Main */}
                    <div style={{ flex: 1, padding: 24, backgroundColor: "#f9f8f7" }}>
                      <div style={{ marginBottom: 20 }}>
                        <Badge variant="primary">Lesson 2 of 5</Badge>
                        <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, margin: "12px 0 4px", color: "#242220" }}>Verse 1</h3>
                        <p style={{ fontSize: 14, color: "#6b6658", margin: 0 }}>Listen carefully and follow along with the text below.</p>
                      </div>
                      <div style={{ maxWidth: 420 }}>
                        <AudioPlayer />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </section>
        )}

        {/* ── Kené Usage Guide ── */}
        {show("principles") && (
          <section>
            <SectionHeader number="07" title="Kené Pattern Usage" subtitle="Guidelines for incorporating Shipibo-inspired geometric accents." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card padding={24} hover={false}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 8 }}>Where to Use</div>
                <div style={{ fontSize: 13, color: "#6b6658", lineHeight: 1.7 }}>
                  Hero backgrounds at very low opacity (5-8%). Section dividers as decorative borders between content areas. Empty states and loading placeholders. Onboarding screens and achievement celebrations.
                </div>
              </Card>
              <Card padding={24} hover={false}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 8 }}>Where Not to Use</div>
                <div style={{ fontSize: 13, color: "#6b6658", lineHeight: 1.7 }}>
                  Behind text-heavy content where it reduces readability. On interactive elements like buttons or inputs. As purely decorative filler — every use should feel intentional. Never as a busy, all-over pattern that competes with content.
                </div>
              </Card>
            </div>
            <div style={{ marginTop: 24 }}>
              <Card padding={32} hover={false}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#242220", marginBottom: 12 }}>Live Example — Pattern at 6% Opacity</div>
                <div style={{
                  position: "relative", height: 120, borderRadius: 12, overflow: "hidden",
                  backgroundColor: "#2e1616", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <KenePattern opacity={0.08} color="#d09e9e" size={40} />
                  <div style={{ position: "relative", zIndex: 1, color: "#fff", textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24 }}>Pattern Background</div>
                    <div style={{ fontSize: 13, color: "#e3c5c5", marginTop: 4 }}>Subtle texture that adds depth without distraction</div>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
