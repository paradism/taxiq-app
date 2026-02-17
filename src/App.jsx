import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/*
 * TaxIQ v12 — Freemium with onboarding + clean empty states
 * New: Guided onboarding, persistent profiles, no fake portfolio data
 * Portfolio features activate when user imports real transactions
 * Free: basic calc, state lookup, 3 AI Q/mo, view-only compliance
 * Pro ($79/yr): full platform, all features unlocked
 */

const C = {
  bg: "#0B0E13", s1: "#10141B", s2: "#161B25", s3: "#1C2230", s4: "#242B3A",
  bd: "rgba(255,255,255,0.06)", bdh: "rgba(255,255,255,0.10)",
  em: "#34D399", emd: "#10B981", emx: "rgba(52,211,153,",
  t1: "#F1F5F9", t2: "#94A3B8", t3: "#64748B", t4: "#475569",
  rd: "#FB7185", yl: "#FBBF24", bl: "#60A5FA", pu: "#A78BFA",
};
const ff = "'Outfit', sans-serif";
const fm = "'JetBrains Mono', monospace";
const $$ = n => Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = n => (n * 100).toFixed(1) + "%";
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}

// ═══════════════════════════════════════════
// STRIPE CONFIG — Replace with your real IDs
// ═══════════════════════════════════════════
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/8x27sLaAlf45dHp9iueAg00";
// Create at: Stripe Dashboard → Payment Links → New
// Product: "TaxIQ Pro", Price: $79/year (recurring)
// After payment redirect: your app URL + ?upgraded=true

// ═══════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════
function Chip({ children, color = C.em, style: sx }) {
  return <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 6, fontSize: 10.5, fontWeight: 600, fontFamily: fm, background: `${color}18`, color, ...sx }}>{children}</span>;
}
function Box({ children, style: sx, onClick, accent }) {
  const [h, sH] = useState(false);
  return <div onClick={onClick} onMouseEnter={() => onClick && sH(true)} onMouseLeave={() => sH(false)} style={{ background: h ? C.s3 : C.s2, border: `1px solid ${accent ? `${accent}40` : h ? C.bdh : C.bd}`, borderRadius: 12, padding: 16, transition: "all 0.2s", cursor: onClick ? "pointer" : "default", ...sx }}>{children}</div>;
}
function Row({ l, r, color, sub }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}><span style={{ color: sub ? C.t4 : C.t2, fontSize: 12.5 }}>{l}</span><span style={{ color: color || C.t1, fontSize: 12.5, fontFamily: fm, fontWeight: 600 }}>{r}</span></div>;
}
function Slider({ label, value, onChange, min, max, step, fmt, color = C.em }) {
  return <div style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ color: C.t3, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span><span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: fm }}>{fmt ? fmt(value) : value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ width: "100%", accentColor: color, height: 4 }} /></div>;
}
function Tabs({ items, active, onChange }) {
  return <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 10, padding: 3, flexWrap: "wrap" }}>{items.map(t => <button key={t[0]} onClick={() => onChange(t[0])} style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: active === t[0] ? C.em : "transparent", color: active === t[0] ? C.bg : C.t3, fontSize: 12, fontWeight: 600, fontFamily: ff, transition: "all 0.15s", whiteSpace: "nowrap" }}>{t[1]}</button>)}</div>;
}
function Md({ text }) {
  const fmt = s => {
    const p = []; let r = s, k = 0;
    while (r.length) {
      // Match bold, inline code, or links
      const mb = r.match(/\*\*(.+?)\*\*/);
      const mc = r.match(/`([^`]+)`/);
      const ml = r.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Find earliest match
      const matches = [mb, mc, ml].filter(Boolean).map(m => ({ m, i: r.indexOf(m[0]) }));
      if (matches.length === 0) { p.push(<span key={k++}>{r}</span>); break; }
      const first = matches.reduce((a, b) => a.i < b.i ? a : b);
      if (first.i > 0) p.push(<span key={k++}>{r.slice(0, first.i)}</span>);
      if (first.m === mb) p.push(<strong key={k++} style={{ color: C.t1, fontWeight: 600 }}>{mb[1]}</strong>);
      else if (first.m === mc) p.push(<code key={k++} style={{ background: C.s3, padding: "1px 5px", borderRadius: 4, fontSize: 12, fontFamily: fm, color: C.em }}>{mc[1]}</code>);
      else if (first.m === ml) p.push(<a key={k++} href={ml[2]} target="_blank" rel="noopener" style={{ color: C.bl, textDecoration: "underline" }}>{ml[1]}</a>);
      r = r.slice(first.i + first.m[0].length);
    }
    return p;
  };
  return <div>{text.split("\n").map((l, i) => {
    if (l.includes("🟢")||l.includes("🟡")||l.includes("🔴")) { const c = l.includes("🟢")?C.em:l.includes("🟡")?C.yl:C.rd; return <div key={i} style={{ background:`${c}10`,border:`1px solid ${c}20`,borderRadius:10,padding:"10px 14px",margin:"8px 0",color:c,fontSize:13 }}>{fmt(l)}</div>; }
    if (l.startsWith("## ")) return <h2 key={i} style={{ color:C.t1,fontSize:14,fontWeight:700,margin:"16px 0 6px" }}>{l.slice(3)}</h2>;
    if (l.startsWith("### ")) return <h3 key={i} style={{ color:C.em,fontSize:11.5,fontWeight:700,margin:"14px 0 5px",textTransform:"uppercase",letterSpacing:"0.05em" }}>{l.slice(4)}</h3>;
    if (/^\d+\.\s/.test(l)) { const num = l.match(/^(\d+)\.\s/)[1]; return <div key={i} style={{ display:"flex",gap:8,margin:"3px 0",paddingLeft:4 }}><span style={{color:C.em,fontFamily:fm,fontSize:12,minWidth:16,fontWeight:600}}>{num}.</span><span style={{color:C.t2,lineHeight:1.6}}>{fmt(l.replace(/^\d+\.\s/,""))}</span></div>; }
    if (l.startsWith("- ")) return <div key={i} style={{ display:"flex",gap:8,margin:"3px 0",paddingLeft:4 }}><span style={{color:C.em}}>•</span><span style={{color:C.t2,lineHeight:1.6}}>{fmt(l.slice(2))}</span></div>;
    if (l.startsWith("> ")) return <div key={i} style={{ borderLeft:`3px solid ${C.em}`,padding:"4px 12px",margin:"6px 0",color:C.t3,fontSize:12.5,fontStyle:"italic" }}>{fmt(l.slice(2))}</div>;
    if (l.trim()==="---"||l.trim()==="***") return <hr key={i} style={{ border:"none",borderTop:`1px solid ${C.bd}`,margin:"10px 0" }}/>;
    if (l.trim()==="") return <div key={i} style={{height:6}} />;
    return <p key={i} style={{ color:C.t2,margin:"4px 0",lineHeight:1.6 }}>{fmt(l)}</p>;
  })}</div>;
}
function InputField({ label, value, onChange, prefix, type = "number", width }) {
  return <div style={{ width }}><label style={{ color: C.t3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{label}</label><div style={{ display: "flex", alignItems: "center", background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "7px 10px" }}>{prefix && <span style={{ color: C.t4, fontSize: 12, marginRight: 4 }}>{prefix}</span>}<input type={type} value={value} onChange={e => onChange(type === "number" ? +e.target.value || 0 : e.target.value)} style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontSize: 13, fontFamily: fm, width: "100%" }} /></div></div>;
}
function SelectField({ label, value, onChange, options, width }) {
  return <div style={{ width }}><label style={{ color: C.t3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{label}</label><select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 10px", color: C.t1, fontSize: 12, fontFamily: ff, outline: "none" }}>{options.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>;
}

// ═══════════════════════════════════════════
// GATE — Pro feature overlay
// ═══════════════════════════════════════════
function ProGate({ children, isPro, onUpgrade, teaser, label = "Pro Feature" }) {
  if (isPro) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <div style={{ background: C.s1, border: `1px solid ${C.emx}0.2)`, borderRadius: 14, padding: "24px 32px", textAlign: "center", maxWidth: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.emx}0.1)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 18 }}>🔒</div>
          <Chip color={C.em} style={{ marginBottom: 10 }}>{label}</Chip>
          {teaser && <div style={{ color: C.t2, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>{teaser}</div>}
          <button onClick={onUpgrade} style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: C.em, color: C.bg, fontSize: 13, fontWeight: 700, fontFamily: ff, cursor: "pointer", transition: "all 0.2s" }}>Upgrade to Pro — $79/yr</button>
        </div>
      </div>
    </div>
  );
}
function ProBadge({ isPro }) {
  if (!isPro) return null;
  return <Chip color={C.em} style={{ marginLeft: 8, fontSize: 9 }}>PRO</Chip>;
}

// ═══════════════════════════════════════════
// UPGRADE MODAL
// ═══════════════════════════════════════════
function UpgradeModal({ onClose, onUpgrade, onRestore, isMobile }) {
  const features = [
    ["⚡", "Unlimited income sources", "W-2, freelance, rental, dividends — all at once"],
    ["🌾", "Tax-loss harvesting scanner", "Find every harvestable position across stocks and crypto"],
    ["✈️", "50-state comparison tool", "See exact savings from relocating with your income"],
    ["📋", "Deduction strategies", "401(k), IRA, HSA, QBI, home office — modeled for you"],
    ["🔍", "Wash sale detection", "Automatic 30-day window scanning for crypto"],
    ["🔮", "3-year projections", "Model growth, strategies, and state changes"],
    ["💬", "Unlimited AI advisor", "Personalized, profile-aware tax advice"],
    ["📊", "Cost basis methods", "Compare FIFO, LIFO, and HIFO impact"],
  ];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: isMobile?"flex-end":"center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", background: C.s1, border: `1px solid ${C.bd}`, borderRadius: isMobile?"18px 18px 0 0":18, width: isMobile?"100%":480, maxHeight: "90vh", overflowY: "auto", zIndex: 201 }}>
        {isMobile&&<div style={{width:36,height:4,borderRadius:2,background:C.s4,margin:"10px auto 0"}}/>}
        {/* Header */}
        <div style={{ padding: "28px 28px 0", textAlign: "center" }}>
          <button onClick={onClose} style={{ position: "absolute", top: isMobile?18:14, right: 14, background: "none", border: "none", color: C.t3, fontSize: 18, cursor: "pointer", padding:8 }}>✕</button>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.em}, ${C.emd})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: C.bg, margin: "0 auto 14px" }}>T</div>
          <div style={{ color: C.t1, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>TaxIQ Pro</div>
          <div style={{ color: C.t3, fontSize: 13.5, marginBottom: 20 }}>The complete tax intelligence platform</div>
        </div>

        {/* Price */}
        <div style={{ margin: "0 28px", padding: "20px", background: C.s2, borderRadius: 12, border: `1px solid ${C.emx}0.15)`, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
            <span style={{ color: C.t1, fontSize: 42, fontWeight: 800, fontFamily: fm }}>$79</span>
            <span style={{ color: C.t3, fontSize: 14 }}>/year</span>
          </div>
          <div style={{ color: C.t4, fontSize: 12, marginTop: 4 }}>That's $6.58/mo — less than one hour of CPA time</div>
          <div style={{ color: C.em, fontSize: 12, fontWeight: 600, marginTop: 8, padding: "4px 12px", background: `${C.emx}0.08)`, borderRadius: 6, display: "inline-block" }}>If TaxIQ finds $500 in savings, it pays for itself 6×</div>
        </div>

        {/* Features */}
        <div style={{ padding: "20px 28px" }}>
          <div style={{ color: C.t3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Everything in Pro</div>
          {features.map(([icon, title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: i < features.length - 1 ? `1px solid ${C.bd}` : "none" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <div><div style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>{title}</div><div style={{ color: C.t4, fontSize: 11.5, marginTop: 1 }}>{desc}</div></div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: "0 28px 20px" }}>
          <button onClick={onUpgrade} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: C.em, color: C.bg, fontSize: 15, fontWeight: 700, fontFamily: ff, cursor: "pointer", transition: "all 0.2s", marginBottom: 8 }}>Upgrade Now — $79/year</button>
          <div style={{ textAlign: "center" }}>
            <button onClick={onRestore} style={{ background: "none", border: "none", color: C.t4, fontSize: 11.5, cursor: "pointer", fontFamily: ff, textDecoration: "underline" }}>Already paid? Restore purchase</button>
          </div>
        </div>

        {/* Guarantee */}
        <div style={{ padding: "14px 28px", borderTop: `1px solid ${C.bd}`, textAlign: "center" }}>
          <span style={{ color: C.t4, fontSize: 11 }}>🛡️ 30-day money-back guarantee. Cancel anytime.</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STATE TAX ENGINE
// ═══════════════════════════════════════════
const ST = {
  AL:{n:"Alabama",t:"p",b:[[500,.02],[2500,.04],[1e12,.05]],d:2500,cg:"o"},AK:{n:"Alaska",t:"0",cg:"0",nt:"No income tax + PFD"},
  AZ:{n:"Arizona",t:"f",r:.025,cg:"x",cgE:.25},AR:{n:"Arkansas",t:"p",b:[[5099,.02],[10099,.04],[1e12,.044]],d:2340,cg:"o"},
  CA:{n:"California",t:"p",b:[[10412,.01],[24684,.02],[38959,.04],[54081,.06],[68350,.08],[349137,.093],[418961,.103],[698271,.113],[1e12,.133]],d:5540,cg:"o",nt:"13.3% top rate"},
  CO:{n:"Colorado",t:"f",r:.044,cg:"o"},CT:{n:"Connecticut",t:"p",b:[[10000,.02],[50000,.045],[100000,.055],[200000,.06],[250000,.065],[500000,.069],[1e12,.0699]],d:0,cg:"o"},
  DE:{n:"Delaware",t:"p",b:[[2000,0],[5000,.022],[10000,.039],[20000,.048],[25000,.052],[60000,.0555],[1e12,.066]],d:3350,cg:"o"},
  FL:{n:"Florida",t:"0",cg:"0",nt:"No income tax"},GA:{n:"Georgia",t:"f",r:.0549,cg:"o"},
  HI:{n:"Hawaii",t:"p",b:[[2400,.014],[4800,.032],[9600,.055],[14400,.064],[19200,.068],[24000,.072],[36000,.076],[48000,.079],[150000,.0825],[175000,.09],[200000,.10],[1e12,.11]],d:2200,cg:"x",cgR:.0725},
  ID:{n:"Idaho",t:"f",r:.058,cg:"o"},IL:{n:"Illinois",t:"f",r:.0495,cg:"o"},IN:{n:"Indiana",t:"f",r:.0305,cg:"o"},
  IA:{n:"Iowa",t:"f",r:.038,cg:"o"},KS:{n:"Kansas",t:"p",b:[[15000,.031],[30000,.0525],[1e12,.057]],d:3500,cg:"o"},
  KY:{n:"Kentucky",t:"f",r:.04,cg:"o"},LA:{n:"Louisiana",t:"p",b:[[12500,.0185],[50000,.035],[1e12,.0425]],d:4500,cg:"o"},
  ME:{n:"Maine",t:"p",b:[[24500,.058],[58050,.0675],[1e12,.0715]],d:14600,cg:"o"},
  MD:{n:"Maryland",t:"p",b:[[1000,.02],[2000,.03],[3000,.04],[100000,.0475],[125000,.05],[150000,.0525],[250000,.055],[1e12,.0575]],d:2550,cg:"o"},
  MA:{n:"Massachusetts",t:"f",r:.05,cg:"x"},MI:{n:"Michigan",t:"f",r:.0425,cg:"o"},
  MN:{n:"Minnesota",t:"p",b:[[30070,.0535],[98760,.068],[183340,.0785],[1e12,.0985]],d:14575,cg:"o"},MS:{n:"Mississippi",t:"f",r:.047,cg:"o"},
  MO:{n:"Missouri",t:"p",b:[[1207,.02],[2414,.025],[3621,.03],[4828,.035],[6035,.04],[7242,.045],[8449,.05],[1e12,.048]],d:14600,cg:"o"},
  MT:{n:"Montana",t:"p",b:[[20500,.047],[1e12,.059]],d:14600,cg:"x",cgE:.02},NE:{n:"Nebraska",t:"p",b:[[3700,.0246],[22170,.0351],[35730,.0501],[1e12,.0584]],d:7900,cg:"o"},
  NV:{n:"Nevada",t:"0",cg:"0",nt:"No income tax"},NH:{n:"New Hampshire",t:"0",cg:"0"},
  NJ:{n:"New Jersey",t:"p",b:[[20000,.014],[35000,.0175],[40000,.035],[75000,.05525],[500000,.0637],[1000000,.0897],[1e12,.1075]],d:0,cg:"o",nt:"10.75% top"},
  NM:{n:"New Mexico",t:"p",b:[[5500,.017],[11000,.032],[16000,.047],[210000,.049],[1e12,.059]],d:14600,cg:"x",cgE:.40},
  NY:{n:"New York",t:"p",b:[[8500,.04],[11700,.045],[13900,.0525],[80650,.0585],[215400,.0625],[1077550,.0685],[5000000,.0965],[25000000,.103],[1e12,.109]],d:8000,cg:"o",nt:"10.9% + NYC 3.9%"},
  NC:{n:"North Carolina",t:"f",r:.045,cg:"o"},ND:{n:"North Dakota",t:"f",r:.0195,cg:"o"},
  OH:{n:"Ohio",t:"p",b:[[26050,0],[100000,.0275],[1e12,.035]],d:0,cg:"o"},OK:{n:"Oklahoma",t:"p",b:[[1000,.0025],[2500,.0075],[3750,.0175],[4900,.0275],[7200,.0375],[1e12,.0475]],d:6350,cg:"o"},
  OR:{n:"Oregon",t:"p",b:[[4050,.0475],[10200,.0675],[125000,.0875],[1e12,.099]],d:2745,cg:"o"},
  PA:{n:"Pennsylvania",t:"f",r:.0307,cg:"o"},RI:{n:"Rhode Island",t:"p",b:[[73450,.0375],[166950,.0475],[1e12,.0599]],d:10550,cg:"o"},
  SC:{n:"South Carolina",t:"p",b:[[3460,0],[17330,.03],[1e12,.064]],d:14600,cg:"x",cgE:.44},
  SD:{n:"South Dakota",t:"0",cg:"0",nt:"No tax + trust-friendly"},TN:{n:"Tennessee",t:"0",cg:"0"},
  TX:{n:"Texas",t:"0",cg:"0",nt:"No income tax"},UT:{n:"Utah",t:"f",r:.0465,cg:"o"},
  VT:{n:"Vermont",t:"p",b:[[45400,.0335],[110450,.066],[229550,.076],[1e12,.0875]],d:14600,cg:"o"},
  VA:{n:"Virginia",t:"p",b:[[3000,.02],[5000,.03],[17000,.05],[1e12,.0575]],d:8500,cg:"o"},
  WA:{n:"Washington",t:"cg",r:.07,cgTh:270000,cg:"x",nt:"7% CG >$270K"},
  WV:{n:"West Virginia",t:"p",b:[[10000,.0236],[25000,.0315],[40000,.0354],[60000,.0472],[1e12,.0512]],d:0,cg:"o"},
  WI:{n:"Wisconsin",t:"p",b:[[14320,.0354],[28640,.0465],[315310,.053],[1e12,.0765]],d:12760,cg:"x",cgE:.30},
  WY:{n:"Wyoming",t:"0",cg:"0",nt:"No tax"},
  DC:{n:"Washington D.C.",t:"p",b:[[10000,.04],[40000,.06],[60000,.065],[250000,.085],[500000,.0925],[1000000,.0975],[1e12,.1075]],d:14600,cg:"o"},
};
// Sales tax rates (state, excludes local) and avg effective property tax rates
const STX = {
  AL:{s:4.0,p:0.40},AK:{s:0,p:1.04},AZ:{s:5.6,p:0.62},AR:{s:6.5,p:0.62},
  CA:{s:7.25,p:0.71},CO:{s:2.9,p:0.49},CT:{s:6.35,p:2.15},DE:{s:0,p:0.59},
  FL:{s:6.0,p:0.86},GA:{s:4.0,p:0.87},HI:{s:4.0,p:0.32},ID:{s:6.0,p:0.63},
  IL:{s:6.25,p:2.08},IN:{s:7.0,p:0.81},IA:{s:6.0,p:1.52},KS:{s:6.5,p:1.33},
  KY:{s:6.0,p:0.83},LA:{s:4.45,p:0.56},ME:{s:5.5,p:1.24},MD:{s:6.0,p:1.06},
  MA:{s:6.25,p:1.17},MI:{s:6.0,p:1.38},MN:{s:6.875,p:1.08},MS:{s:7.0,p:0.67},
  MO:{s:4.225,p:0.93},MT:{s:0,p:0.74},NE:{s:5.5,p:1.65},NV:{s:6.85,p:0.53},
  NH:{s:0,p:1.93},NJ:{s:6.625,p:2.23},NM:{s:4.875,p:0.67},NY:{s:4.0,p:1.72},
  NC:{s:4.75,p:0.80},ND:{s:5.0,p:0.98},OH:{s:5.75,p:1.53},OK:{s:4.5,p:0.87},
  OR:{s:0,p:0.87},PA:{s:6.0,p:1.49},RI:{s:7.0,p:1.53},SC:{s:6.0,p:0.55},
  SD:{s:4.2,p:1.22},TN:{s:7.0,p:0.64},TX:{s:6.25,p:1.68},UT:{s:6.1,p:0.58},
  VT:{s:6.0,p:1.90},VA:{s:5.3,p:0.82},WA:{s:6.5,p:0.94},WV:{s:6.0,p:0.57},
  WI:{s:5.0,p:1.68},WY:{s:4.0,p:0.56},DC:{s:6.0,p:0.57},
};
function calcSt(code, inc, gains = 0) {
  const s = ST[code]; if (!s || s.t === "0") return { tax: 0, eff: 0 };
  if (s.t === "cg") { const t = gains > (s.cgTh||0) ? (gains-(s.cgTh||0))*s.r : 0; return { tax: Math.round(t), eff: (inc+gains)>0?(t/(inc+gains)*100):0 }; }
  let it = 0;
  if (s.t === "f") it = Math.max(inc-(s.d||0),0)*s.r;
  else if (s.b) { let rem=Math.max(inc-(s.d||0),0),prev=0; for (const [th,rate] of s.b) { const a=Math.min(rem,th-prev); it+=a*rate; rem-=a; prev=th; if(rem<=0)break; } }
  let cg = 0;
  if (gains > 0) {
    if (s.cg === "o") { if (s.t==="f") cg=gains*s.r; else if (s.b) { let t2=0,rem=Math.max(inc+gains-(s.d||0),0),p=0; for (const [th,rate] of s.b) { const a=Math.min(rem,th-p); t2+=a*rate; rem-=a; p=th; if(rem<=0)break; } cg=t2-it; } }
    else if (s.cg === "x") { const e = s.cgE||0, tg = gains*(1-e); if (s.cgR) cg=gains*s.cgR; else if (s.t==="f") cg=tg*s.r; else if (s.b) { let t2=0,rem=Math.max(inc+tg-(s.d||0),0),p=0; for (const [th,rate] of s.b) { const a=Math.min(rem,th-p); t2+=a*rate; rem-=a; p=th; if(rem<=0)break; } cg=t2-it; } }
  }
  return { tax: Math.round(Math.max(it+cg,0)), eff: (inc+gains)>0?(Math.max(it+cg,0)/(inc+gains)*100):0 };
}
const FED_BRACKETS = {
  single:[[11600,.10],[35550,.12],[53375,.22],[91425,.24],[51775,.32],[365625,.35],[1e12,.37]],
  mfj:[[23200,.10],[71100,.12],[106750,.22],[182850,.24],[103550,.32],[365600,.35],[1e12,.37]],
  mfs:[[11600,.10],[35550,.12],[53375,.22],[91425,.24],[51775,.32],[182800,.35],[1e12,.37]],
  hoh:[[16550,.10],[39300,.12],[55050,.22],[89300,.24],[51775,.32],[365625,.35],[1e12,.37]],
};
const STD_DED = { single: 14600, mfj: 29200, mfs: 14600, hoh: 21900 };
const LTCG_TH = { single: [44625,492300], mfj: [89250,553850], mfs: [44625,276900], hoh: [59750,523050] };
const NIIT_TH = { single: 200000, mfj: 250000, mfs: 125000, hoh: 200000 };
const SALT_CAP = 10000;
function calcFed(inc, ltGains, stGains, filing = "single", stateTax = 0) {
  const bk = FED_BRACKETS[filing]||FED_BRACKETS.single, sd = STD_DED[filing]||14600;
  const saltDed = Math.min(stateTax, SALT_CAP), itemized = saltDed, ded = Math.max(sd, itemized);
  const ordInc = inc + stGains, taxableOrd = Math.max(ordInc - ded, 0);
  let incTax = 0, rem = taxableOrd;
  for (const [b,r] of bk) { const a = Math.min(rem,b); incTax += a*r; rem -= a; if (rem<=0) break; }
  const [lt0,lt20] = LTCG_TH[filing]||LTCG_TH.single;
  let ltTax = 0;
  if (ltGains > 0) { if (taxableOrd > lt20) ltTax = ltGains*.20; else if (taxableOrd > lt0) { const a2 = Math.max(taxableOrd+ltGains-lt20,0); ltTax = a2*.20+(ltGains-a2)*.15; } else { const a0 = Math.max(lt0-taxableOrd,0), taxed = Math.max(ltGains-a0,0), a2 = Math.max(taxableOrd+ltGains-lt20,0); ltTax = a2*.20+Math.max(taxed-a2,0)*.15; } }
  const niitTh = NIIT_TH[filing]||200000, investInc = ltGains+stGains, agi = ordInc+ltGains;
  const niit = agi > niitTh ? Math.min(investInc, agi-niitTh)*.038 : 0;
  const marg = taxableOrd>(filing==="mfj"?731200:578125)?.37:taxableOrd>(filing==="mfj"?462700:231250)?.35:taxableOrd>(filing==="mfj"?365600:182100)?.32:taxableOrd>(filing==="mfj"?206700:95375)?.24:taxableOrd>(filing==="mfj"?94300:44725)?.22:taxableOrd>(filing==="mfj"?23200:11600)?.12:.10;
  return { inc:Math.round(incTax), lt:Math.round(ltTax), niit:Math.round(niit), tot:Math.round(incTax+ltTax+niit), marg, ded, saltUsed:saltDed, itemizing:itemized>sd };
}

// ═══════════════════════════════════════════
// PORTFOLIO ENGINE
// ═══════════════════════════════════════════
const ASSETS = {
  AAPL:{name:"Apple",type:"stock",price:242},MSFT:{name:"Microsoft",type:"stock",price:430},
  NVDA:{name:"NVIDIA",type:"stock",price:890},VOO:{name:"Vanguard S&P 500",type:"etf",price:540},
  BTC:{name:"Bitcoin",type:"crypto",price:98450},ETH:{name:"Ethereum",type:"crypto",price:3920},
  SOL:{name:"Solana",type:"crypto",price:195},
};
// Transactions start empty — populated when user imports CSV or adds holdings
const TRANSACTIONS = [];
function usePortfolio(costMethod = "fifo") {
  return useMemo(() => {
    const h = {}, rl = [], ws = [], sorted = [...TRANSACTIONS].sort((a,b) => a.d.localeCompare(b.d));
    for (const tx of sorted) {
      if (!h[tx.a]) h[tx.a] = { lots: [] };
      if (tx.t === "buy") h[tx.a].lots.push({ date:tx.d, amount:tx.amt, remaining:tx.amt, cost:tx.amt*tx.p+tx.f, unitCost:tx.p });
      else {
        let rem = tx.amt;
        const lo = [...h[tx.a].lots].filter(l => l.remaining > 1e-8);
        if (costMethod==="lifo") lo.sort((a,b) => b.date.localeCompare(a.date));
        else if (costMethod==="hifo") lo.sort((a,b) => b.unitCost-a.unitCost);
        else lo.sort((a,b) => a.date.localeCompare(b.date));
        for (const lot of lo) {
          if (rem <= 0) break; const u = Math.min(lot.remaining, rem); if (u <= 0) continue;
          const cb = (u/lot.amount)*lot.cost, pr = u*tx.p-(tx.f*u/tx.amt), g = pr-cb;
          const hd = Math.floor((new Date(tx.d)-new Date(lot.date))/864e5);
          rl.push({ asset:tx.a, type:ASSETS[tx.a]?.type||"other", buyDate:lot.date, sellDate:tx.d, amount:u, gain:g, holdDays:hd, term:hd>365?"long":"short" });
          lot.remaining -= u; rem -= u;
        }
      }
    }
    for (const r of rl) {
      if (r.gain >= 0 || r.type !== "crypto") continue;
      const sd = new Date(r.sellDate), s = new Date(sd), e = new Date(sd);
      s.setDate(s.getDate()-30); e.setDate(e.getDate()+30);
      const rp = sorted.filter(tx => tx.t==="buy"&&tx.a===r.asset&&tx.d!==r.buyDate&&new Date(tx.d)>=s&&new Date(tx.d)<=e&&new Date(tx.d).getTime()!==sd.getTime());
      if (rp.length) ws.push({ ...r, repurchase:rp[0], disallowed:Math.abs(r.gain) });
    }
    const pf = {};
    for (const [a,d] of Object.entries(h)) {
      const rem = d.lots.reduce((s,l) => s+l.remaining,0); if (rem < 1e-8) continue;
      const cb = d.lots.reduce((s,l) => s+(l.remaining>0?(l.remaining/l.amount)*l.cost:0),0);
      const cp = ASSETS[a]?.price||0, cv = rem*cp;
      const lots = d.lots.filter(l => l.remaining>1e-8).map(l => ({...l, holdDays:Math.floor((Date.now()-new Date(l.date))/864e5), unrealized:l.remaining*cp-(l.remaining/l.amount)*l.cost }));
      pf[a] = { qty:rem, cost:cb, value:cv, pl:cv-cb, price:cp, lots, type:ASSETS[a]?.type||"other", name:ASSETS[a]?.name||a, pct:cb>0?((cv-cb)/cb*100):0 };
    }
    const tv = Object.values(pf).reduce((s,p) => s+p.value,0);
    return { pf, rl, ws, tv, ltGains:rl.filter(r=>r.term==="long"&&r.gain>0).reduce((s,r)=>s+r.gain,0), stGains:rl.filter(r=>r.term==="short"&&r.gain>0).reduce((s,r)=>s+r.gain,0), netLT:rl.filter(r=>r.term==="long").reduce((s,r)=>s+r.gain,0), netST:rl.filter(r=>r.term==="short").reduce((s,r)=>s+r.gain,0), upl:tv-Object.values(pf).reduce((s,p)=>s+p.cost,0) };
  }, [costMethod]);
}

// ═══════════════════════════════════════════
// COMPLIANCE
// ═══════════════════════════════════════════
const COMPLY_DATA = {
  fatca:{nm:"FATCA (Form 8938)",icon:"🇺🇸",trigger:"Foreign financial assets > $50,000",pen:"$10,000/yr + 40% fraud penalty",steps:[{t:"Check if you qualify",items:["US citizen, green card holder, or substantial presence","Have foreign financial assets","Assets exceed $50K (year-end) or $75K (any time)"]},{t:"Gather & report",items:["Foreign bank & brokerage accounts","Foreign-issued securities or entity interests","Attach Form 8938 to your 1040"]}]},
  fbar:{nm:"FBAR (FinCEN 114)",icon:"🏦",trigger:"Foreign accounts > $10,000 aggregate",pen:"$12,500 non-willful / $129,210+ willful",steps:[{t:"Check threshold",items:["Sum ALL foreign account values","Threshold is aggregate at ANY point in the year","Includes signature authority accounts"]},{t:"File electronically",items:["BSA E-Filing System (not IRS)","Due April 15 (auto-extends to Oct 15)","Keep records 5 years"]}]},
  est:{nm:"Estimated Tax Payments",icon:"📅",trigger:"Expect to owe $1,000+ when filing",pen:"Underpayment penalty + interest",steps:[{t:"Check if required",items:["Income not subject to withholding","Expected tax owed > $1,000 after withholding","Safe harbor: 100% prior year (110% if AGI > $150K)"]},{t:"Pay quarterly",items:["Q1: Apr 15 • Q2: Jun 15 • Q3: Sep 15 • Q4: Jan 15","Use Form 1040-ES worksheet","Pay via IRS Direct Pay or EFTPS"]}]},
  forms:{nm:"Filing Requirements",icon:"📄",trigger:"Which forms do you need?",pen:"Late filing: 5%/month up to 25%",steps:[{t:"Core returns",items:["Form 1040 — Individual return","Schedule C — Freelance/business income","Schedule D + Form 8949 — Capital gains","Schedule E — Rental income"]},{t:"If applicable",items:["Form 8938 — Foreign assets (FATCA)","Form 8829 — Home office deduction","Form 4868 — Extension request"]}]},
};
const INTL = [
  {f:"🇺🇸",n:"United States",cg:"0/15/20%",crypto:"Same as property",inc:i=>0,note:"Your current rate",home:true,col:1.0,nomad:false},
  {f:"🇬🇧",n:"United Kingdom",cg:"18/24%",crypto:"Capital gains tax",inc:i=>i<=12570?0:i<=50270?(i-12570)*0.2:i<=125140?(i-50270)*0.4+7540:(i-125140)*0.45+37430+7540,note:"NHS funded by tax",col:0.85,nomad:false},
  {f:"🇩🇪",n:"Germany",cg:"0% if held >1yr",crypto:"0% after 1yr hold",inc:i=>i<=11604?0:i<=62810?(i-11604)*0.30:(i-62810)*0.42+(62810-11604)*0.30,note:"Crypto tax-free after 1yr",col:0.75,nomad:false},
  {f:"🇨🇦",n:"Canada",cg:"25% inclusion",crypto:"50% taxable",inc:i=>i<=55867?i*0.15:i<=111733?55867*0.15+(i-55867)*0.205:i<=154906?55867*0.15+55866*0.205+(i-111733)*0.26:i*0.29,note:"Capital gains: only 50% taxable",col:0.82,nomad:false},
  {f:"🇦🇺",n:"Australia",cg:"50% CGT discount",crypto:"Capital gains",inc:i=>i<=18200?0:i<=45000?(i-18200)*0.19:i<=120000?(i-45000)*0.325+5092:i<=180000?(i-120000)*0.37+29467:(i-180000)*0.45+51667,note:"50% CGT discount if held >1yr",col:0.80,nomad:false},
  {f:"🇯🇵",n:"Japan",cg:"15-55%",crypto:"Misc income (up to 55%)",inc:i=>i<=1950000?i*0.05:i<=3300000?97500+(i-1950000)*0.10:i<=6950000?232500+(i-3300000)*0.20:i<=9000000?962500+(i-6950000)*0.23:i*0.33,note:"Crypto taxed as misc income",col:0.62,nomad:false},
  {f:"🇸🇬",n:"Singapore",cg:"0%",crypto:"No capital gains tax",inc:i=>i<=20000?0:i<=40000?(i-20000)*0.02:i<=80000?400+(i-40000)*0.07:i<=120000?3200+(i-80000)*0.115:i<=160000?7800+(i-120000)*0.15:i*0.18,note:"No capital gains tax at all",col:0.85,nomad:false},
  {f:"🇦🇪",n:"UAE",cg:"0%",crypto:"0% personal tax",inc:()=>0,note:"Zero personal income tax",col:0.78,nomad:true},
  {f:"🇵🇹",n:"Portugal",cg:"28% (or 0% NHR)",crypto:"0% if held >365d",inc:i=>i<=7703?i*0.1325:i<=11623?(i-7703)*0.18+1021:i<=16472?(i-11623)*0.23+1726:i<=25075?(i-16472)*0.26+2841:i<=39967?(i-25075)*0.3275+5078:i*0.37,note:"NHR regime: 0% on crypto",col:0.52,nomad:true},
  {f:"🇨🇭",n:"Switzerland",cg:"0%",crypto:"No CGT (wealth tax)",inc:i=>i<=14500?0:i<=31600?(i-14500)*0.0077:i<=41400?132+(i-31600)*0.0088:i<=55200?218+(i-41400)*0.0275:i<=72500?597+(i-55200)*0.0308:i*0.04,note:"Federal only — cantonal varies",col:1.30,nomad:false},
  {f:"🇨🇷",n:"Costa Rica",cg:"0%",crypto:"Not taxed currently",inc:i=>i<=4296000/600?0:i<=6444000/600?(i-4296000/600)*0.10:(i-6444000/600)*0.15+(6444000/600-4296000/600)*0.10,note:"Territorial tax — foreign income exempt",col:0.42,nomad:true},
  {f:"🇲🇽",n:"Mexico",cg:"10% (stocks)",crypto:"Property — up to 35%",inc:i=>i<=8952?i*0.0192:i<=75985?172+(i-8952)*0.17:i<=133537?11572+(i-75985)*0.21:i<=155229?23699+(i-133537)*0.2352:(i-155229)*0.30+28791,note:"Temp resident tax benefits available",col:0.38,nomad:true},
  {f:"🇲🇾",n:"Malaysia",cg:"0%",crypto:"No capital gains tax",inc:i=>i<=5000?0:i<=20000?(i-5000)*0.01:i<=35000?150+(i-20000)*0.03:i<=50000?600+(i-35000)*0.06:i<=70000?1500+(i-50000)*0.11:i*0.19,note:"MM2H visa for digital nomads",col:0.35,nomad:true},
  {f:"🇹🇭",n:"Thailand",cg:"15%",crypto:"15% on gains",inc:i=>i<=5000?0:i<=15000?(i-5000)*0.05:i<=25000?500+(i-15000)*0.10:i<=50000?1500+(i-25000)*0.15:i<=75000?5250+(i-50000)*0.20:i*0.25,note:"LTR visa: 17% flat rate for remote workers",col:0.36,nomad:true},
  {f:"🇪🇪",n:"Estonia",cg:"0% retained",crypto:"20% on distribution",inc:i=>Math.round(i*0.20),note:"e-Residency for digital businesses",col:0.55,nomad:true},
  {f:"🇬🇪",n:"Georgia",cg:"0% for individuals",crypto:"Not taxed",inc:i=>Math.round(i*0.20),note:"1% small business tax available",col:0.30,nomad:true},
];

// ═══════════════════════════════════════════
// PROFILE EDITOR
// ═══════════════════════════════════════════
function ProfileModal({ profile, setProfile, onClose, isPro, onUpgrade, isMobile }) {
  const [p, setP] = useState({...profile});
  const [warnings, setWarnings] = useState([]);
  const u = (k,v) => setP(prev => ({...prev, [k]:v}));

  const validate = () => {
    const w = [];
    if (p.salary < 0 || p.freelance < 0 || p.rentalNet < 0 || p.dividends < 0) w.push("Income values can't be negative.");
    if (p.retirement401k > 23000) w.push("401(k) max is $23,000 for 2025 ($30,500 if 50+).");
    if (p.retirementIRA > 7000) w.push("IRA max is $7,000 for 2025 ($8,000 if 50+).");
    if (p.retirement401k > 0 && p.salary === 0 && p.freelance === 0) w.push("401(k) requires employment income.");
    if (p.homeOffice > 0 && p.freelance === 0) w.push("Home office deduction requires self-employment income.");
    if (p.charitable > (p.salary + p.freelance + p.rentalNet + p.dividends) * 0.6) w.push("Charitable contributions generally capped at 60% of AGI.");
    return w;
  };

  const save = () => {
    const clean = {...p,
      salary: Math.max(p.salary, 0),
      freelance: Math.max(p.freelance, 0),
      rentalNet: p.rentalNet, // can be negative (rental losses)
      dividends: Math.max(p.dividends, 0),
      retirement401k: Math.min(Math.max(p.retirement401k, 0), 30500),
      retirementIRA: Math.min(Math.max(p.retirementIRA, 0), 8000),
      charitable: Math.max(p.charitable, 0),
      homeOffice: Math.max(p.homeOffice, 0),
    };
    setProfile(clean);
    try { localStorage.setItem("taxiq-profile", JSON.stringify(clean)); } catch {}
    onClose();
  };

  const w = validate();

  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"relative",background:C.s1,border:`1px solid ${C.bd}`,borderRadius:isMobile?"16px 16px 0 0":16,padding:isMobile?20:28,width:isMobile?"100%":560,maxHeight:isMobile?"92vh":"85vh",overflowY:"auto",zIndex:101}}>
        {isMobile&&<div style={{width:36,height:4,borderRadius:2,background:C.s4,margin:"0 auto 14px"}}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{color:C.t1,fontSize:18,fontWeight:700}}>Tax Profile</div><button onClick={onClose} style={{background:"none",border:"none",color:C.t3,fontSize:18,cursor:"pointer",padding:8}}>✕</button></div>

        <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Filing Information</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
          <SelectField label="Filing Status" value={p.filing} onChange={v=>u("filing",v)} options={[["single","Single"],["mfj","Married Filing Jointly"],["mfs","Married Filing Separately"],["hoh","Head of Household"]]}/>
          <SelectField label="State" value={p.state} onChange={v=>u("state",v)} options={Object.entries(ST).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=>[k,`${v.n}${v.t==="0"?" ★":""}`])}/>
        </div>

        <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Income Sources</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:20}}>
          <InputField label="W-2 Salary" prefix="$" value={p.salary} onChange={v=>u("salary",v)}/>
          <InputField label="Freelance / 1099" prefix="$" value={p.freelance} onChange={v=>u("freelance",v)}/>
          <InputField label="Rental Income (net)" prefix="$" value={p.rentalNet} onChange={v=>u("rentalNet",v)}/>
          <InputField label="Dividends" prefix="$" value={p.dividends} onChange={v=>u("dividends",v)}/>
        </div>

        <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Deductions & Retirement</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:8}}>
          <InputField label="401(k)" prefix="$" value={p.retirement401k} onChange={v=>u("retirement401k",v)}/>
          <InputField label="IRA" prefix="$" value={p.retirementIRA} onChange={v=>u("retirementIRA",v)}/>
          {isPro ? <>
            <InputField label="Charitable" prefix="$" value={p.charitable} onChange={v=>u("charitable",v)}/>
            <InputField label="Home Office" prefix="$" value={p.homeOffice} onChange={v=>u("homeOffice",v)}/>
          </> : <div style={{gridColumn:"1/-1",padding:"10px 14px",background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.12)`,borderRadius:10}}>
            <div style={{color:C.em,fontSize:12,fontWeight:600}}>⚡ Charitable & home office deductions with Pro</div>
            <button onClick={onUpgrade} style={{marginTop:6,padding:"6px 14px",borderRadius:7,border:"none",background:C.em,color:C.bg,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:ff}}>Upgrade — $79/yr</button>
          </div>}
        </div>

        <div onClick={()=>u("foreign",!p.foreign)} style={{padding:"10px 14px",background:p.foreign?`${C.emx}0.06)`:C.s2,border:`1px solid ${p.foreign?C.em:C.bd}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${p.foreign?C.em:C.t4}`,background:p.foreign?`${C.emx}0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.foreign&&<span style={{color:C.em,fontSize:10}}>✓</span>}</div>
          <div><div style={{color:p.foreign?C.t1:C.t3,fontSize:12.5,fontWeight:600}}>Foreign financial accounts</div><div style={{color:C.t4,fontSize:11}}>Triggers FATCA & FBAR compliance checks</div></div>
        </div>

        {w.length > 0 && <div style={{padding:"10px 14px",background:`${C.yl}10`,border:`1px solid ${C.yl}25`,borderRadius:10,marginBottom:14}}>
          {w.map((msg,i) => <div key={i} style={{color:C.yl,fontSize:11.5,lineHeight:1.5,display:"flex",gap:6}}><span>⚠️</span><span>{msg}</span></div>)}
        </div>}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:10,border:`1px solid ${C.bd}`,background:"transparent",color:C.t2,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:ff}}>Cancel</button>
          <button onClick={save} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:C.em,color:C.bg,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:ff}}>Save & Recalculate</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ data, go, profile, isPro, onUpgrade, isMobile }) {
  const { pf, ws, tv, netLT, netST, upl } = data;
  const hasPortfolio = Object.keys(pf).length > 0;
  const totalIncome = profile.salary + profile.freelance + profile.rentalNet + profile.dividends;
  const absDed = profile.retirement401k + profile.retirementIRA + (isPro ? profile.charitable + profile.homeOffice : 0);
  const adjInc = Math.max(totalIncome - absDed, 0);
  const lt = Math.max(netLT,0), st = Math.max(netST,0);
  const stTax = calcSt(profile.state, adjInc, lt+st);
  const fed = calcFed(adjInc, lt, st, profile.filing, stTax.tax);
  const seTax = profile.freelance > 0 ? Math.round(profile.freelance*0.9235*0.153) : 0;
  const totalTax = fed.tot + stTax.tax + seTax;
  const takeHome = Math.max(totalIncome - totalTax, 0);
  const hSave = hasPortfolio ? Object.values(pf).flatMap(d=>d.lots.filter(l=>l.unrealized<0)).reduce((s,l)=>s+Math.abs(l.unrealized),0)*fed.marg : 0;

  // Tax efficiency: how well are they using available deductions
  const maxDed = 23000 + 7000 + 4150 + (profile.freelance > 0 ? Math.round(profile.freelance * 0.2) : 0);
  const usedDed = profile.retirement401k + profile.retirementIRA;
  const efficiency = maxDed > 0 ? Math.min(Math.round((usedDed / maxDed) * 100), 100) : 0;
  const missedSave = Math.round((maxDed - usedDed) * fed.marg);
  const eCol = efficiency >= 70 ? C.em : efficiency >= 40 ? C.yl : C.rd;

  const deadlines = [{d:"2026-04-15",nm:"Federal Return + FBAR"},{d:"2026-06-15",nm:"Q2 Est. Tax Payment"},{d:"2026-09-15",nm:"Q3 Est. Tax Payment"}].map(dl=>({...dl,days:Math.ceil((new Date(dl.d)-new Date())/864e5)}));

  // Tax parts for hero breakdown
  const taxParts = [
    fed.inc > 0 && { label: "Federal", amount: fed.inc, color: C.bl },
    fed.lt > 0 && { label: "Cap Gains", amount: fed.lt, color: C.em },
    stTax.tax > 0 && { label: ST[profile.state]?.n, amount: stTax.tax, color: C.yl },
    seTax > 0 && { label: "SE Tax", amount: seTax, color: C.pu },
    fed.niit > 0 && { label: "NIIT", amount: fed.niit, color: C.rd },
  ].filter(Boolean);

  // Income sources for visualization
  const incSrc = [
    profile.salary > 0 && { label: "Salary", amount: profile.salary, color: C.bl },
    profile.freelance > 0 && { label: "Freelance", amount: profile.freelance, color: C.pu },
    profile.rentalNet > 0 && { label: "Rental", amount: profile.rentalNet, color: C.yl },
    profile.dividends > 0 && { label: "Dividends", amount: profile.dividends, color: C.em },
  ].filter(Boolean);

  // Bracket position
  const bks = FED_BRACKETS[profile.filing] || FED_BRACKETS.single;
  const sd = STD_DED[profile.filing] || 14600;
  const taxableOrd = Math.max(adjInc - sd, 0);
  let bFloor = 0, bCeil = 0, curRate = 0, cumul = 0;
  for (const [width, rate] of bks) { if (taxableOrd <= cumul + width) { bFloor = cumul; bCeil = cumul + width; curRate = rate; break; } cumul += width; }
  const bPct = bCeil > bFloor ? Math.min(((taxableOrd - bFloor) / (bCeil - bFloor)) * 100, 100) : 0;
  const nextRate = bks.find(([, r]) => r > curRate);

  return (
    <div style={{padding:isMobile?"16px 16px 80px":"24px 28px",overflowY:"auto",height:"100%"}}>
      {/* Hero */}
      <div style={{textAlign:"center",padding:isMobile?"12px 0 8px":"16px 0 10px"}}>
        <div style={{color:C.t3,fontSize:12,marginBottom:4}}>Estimated total tax liability <Chip color={C.bl} style={{marginLeft:6}}>{profile.filing==="mfj"?"MFJ":profile.filing==="mfs"?"MFS":profile.filing==="hoh"?"HOH":"Single"}</Chip></div>
        <div style={{fontSize:isMobile?36:46,fontWeight:700,fontFamily:fm,color:C.t1,letterSpacing:"-0.03em"}}>${$$(totalTax)}</div>
        <div style={{display:"flex",gap:isMobile?8:12,justifyContent:"center",marginTop:6,flexWrap:"wrap"}}>
          {taxParts.map((tp,i)=><span key={i} style={{color:C.t3,fontSize:isMobile?11:12}}>{tp.label} <strong style={{color:tp.color,fontFamily:fm}}>${$$(tp.amount)}</strong></span>)}
        </div>
        {!isPro && totalTax > 0 && <div style={{marginTop:10}}><button onClick={onUpgrade} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:ff}}>⚡ See how to lower your tax bill → Upgrade to Pro</button></div>}
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(3,1fr)":"repeat(auto-fit,minmax(112px,1fr))",gap:7,marginBottom:14}}>
        {[
          ["Take-Home",`$${$$(takeHome)}`,C.em],
          ["Eff. Rate",pct(totalTax/(totalIncome||1)),C.bl],
          ["Marginal",pct(fed.marg),C.bl],
          ["Tax / Month",`$${$$(Math.round(totalTax/12))}`,C.yl],
          hasPortfolio&&["Portfolio",`$${$$(tv)}`,C.t1],
          hasPortfolio&&["Harvestable",isPro?`$${$$(hSave)}`:"🔒",isPro?C.em:C.t4],
        ].filter(Boolean).map(([l,v,c],i)=>(
          <Box key={i} style={{padding:isMobile?9:11}} onClick={!isPro&&l==="Harvestable"?onUpgrade:undefined}><div style={{color:C.t3,fontSize:isMobile?8.5:9.5,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{l}</div><div style={{color:c,fontSize:isMobile?13:15,fontWeight:700,fontFamily:fm}}>{v}</div></Box>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {/* LEFT COLUMN */}
        <div>
          {/* Insights */}
          {[
            hasPortfolio&&hSave>200&&{icon:"🌾",t:`Save ~$${$$(hSave)} by harvesting losses`,d:isPro?"Unrealized losses across stocks and crypto.":"Upgrade to see which positions to harvest.",tab:"save",col:C.em,pro:true},
            hasPortfolio&&ws.length>0&&{icon:"⚠️",t:`${ws.length} crypto wash sale${ws.length>1?"s":""} detected`,d:isPro?`$${$$(ws.reduce((s,w)=>s+w.disallowed,0))} in deductions at risk.`:"Upgrade to see details.",tab:"save",col:C.rd,pro:true},
            stTax.tax>2000&&{icon:"✈️",t:`${ST[profile.state]?.n}: $${$$(stTax.tax)}/yr in state tax`,d:"Compare zero-tax states to see potential savings.",tab:"plan",col:C.bl,pro:false},
            profile.foreign&&{icon:"🌍",t:"Foreign account reporting required",d:"FBAR and FATCA filings may apply.",tab:"comply",col:C.yl,pro:false},
            missedSave>500&&{icon:"💡",t:`~$${$$(missedSave)} in potential deduction savings`,d:`You're using ${efficiency}% of available tax-advantaged accounts.`,tab:"save",col:efficiency>=40?C.yl:C.rd,pro:false},
            fed.marg>=0.32&&{icon:"📊",t:`${pct(fed.marg)} bracket — deductions are high-leverage`,d:`Every $1,000 deducted saves you $${$$(Math.round(1000*fed.marg))}.`,tab:"save",col:C.pu,pro:false},
            totalIncome>200000&&!fed.niit&&{icon:"📈",t:"Approaching NIIT threshold",d:`Investment income above $${$$(NIIT_TH[profile.filing]||200000)} AGI triggers 3.8% surtax.`,tab:"dash",col:C.yl,pro:false},
          ].filter(Boolean).map((ins,i)=>(
            <Box key={i} onClick={()=>ins.pro&&!isPro?onUpgrade():ins.tab!=="dash"&&go(ins.tab)} style={{marginBottom:7,borderLeft:`3px solid ${ins.col}`,cursor:ins.tab!=="dash"?"pointer":"default"}}>
              <div style={{display:"flex",gap:10}}><span style={{fontSize:16}}>{ins.icon}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:C.t1,fontSize:12.5,fontWeight:600,lineHeight:1.4}}>{ins.t}</span>{ins.pro&&!isPro&&<Chip color={C.em} style={{fontSize:8}}>PRO</Chip>}</div><div style={{color:C.t3,fontSize:11.5,marginTop:2}}>{ins.d}</div></div></div>
            </Box>
          ))}

          {/* Bracket Position */}
          <Box style={{marginBottom:7}}>
            <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Federal Bracket Position</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
              <span style={{color:C.t1,fontSize:20,fontWeight:700,fontFamily:fm}}>{pct(curRate)}</span>
              {nextRate&&<span style={{color:C.t4,fontSize:11}}>Next: {pct(nextRate[1])}</span>}
            </div>
            <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden",marginBottom:6}}>
              <div style={{height:"100%",width:`${bPct}%`,background:`linear-gradient(90deg, ${C.em}, ${C.bl})`,borderRadius:3,transition:"width 0.5s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.t4,fontSize:10,fontFamily:fm}}>${$$(bFloor)}</span>
              <span style={{color:C.t2,fontSize:10,fontFamily:fm,fontWeight:600}}>${$$(taxableOrd)} taxable</span>
              <span style={{color:C.t4,fontSize:10,fontFamily:fm}}>${$$(bCeil > 1e10 ? taxableOrd * 2 : bCeil)}</span>
            </div>
          </Box>

          {/* Income Breakdown */}
          {incSrc.length > 0 && <Box style={{marginBottom:7}}>
            <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Income Sources</div>
            <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:10}}>
              {incSrc.map((s,i)=><div key={i} style={{width:`${(s.amount/totalIncome)*100}%`,background:s.color,minWidth:4}}/>)}
            </div>
            {incSrc.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
                  <span style={{color:C.t2,fontSize:12}}>{s.label}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{color:C.t1,fontSize:12,fontWeight:600,fontFamily:fm}}>${$$(s.amount)}</span>
                  <span style={{color:C.t4,fontSize:10,fontFamily:fm,width:38,textAlign:"right"}}>{((s.amount/totalIncome)*100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </Box>}

          {/* Holdings if portfolio exists */}
          {hasPortfolio && ["stock","etf","crypto"].map(type=>{const items=Object.entries(pf).filter(([,d])=>d.type===type);if(!items.length)return null;return<div key={type}><div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginTop:8,marginBottom:5}}>{type==="etf"?"ETFs":type==="stock"?"Stocks":"Digital Assets"}</div>{items.sort((a,b)=>b[1].value-a[1].value).map(([a,d])=>(<Box key={a} style={{marginBottom:5,padding:11}}><div style={{display:"flex",alignItems:"center"}}><div style={{width:28,height:28,borderRadius:7,background:type==="crypto"?`${C.emx}0.08)`:`${C.bl}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,fontFamily:fm,color:type==="crypto"?C.em:C.bl,marginRight:10}}>{a}</div><div style={{flex:1}}><div style={{color:C.t1,fontSize:12,fontWeight:600}}>{d.name}</div><div style={{color:C.t4,fontSize:10}}>{d.qty<1?d.qty.toFixed(4):d.qty.toFixed(1)} × ${$$(d.price)}</div></div><div style={{textAlign:"right"}}><div style={{color:C.t1,fontSize:12,fontWeight:600,fontFamily:fm}}>${$$(d.value)}</div><span style={{color:d.pl>=0?C.em:C.rd,fontSize:10,fontFamily:fm}}>{d.pct>=0?"+":""}{d.pct.toFixed(1)}%</span></div></div></Box>))}</div>;})}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Tax Breakdown */}
          <Box style={{marginBottom:10}}>
            <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Tax Breakdown</div>
            <Row l="Gross Income" r={`$${$$(totalIncome)}`}/><Row l="Deductions" r={`-$${$$(absDed+fed.ded)}`} color={C.em}/><Row l="Taxable Income" r={`$${$$(Math.max(adjInc-fed.ded,0))}`}/>
            <div style={{borderTop:`1px solid ${C.bd}`,margin:"4px 0"}}/>
            <Row l="Federal Income Tax" r={`$${$$(fed.inc)}`}/>
            {fed.lt>0&&<Row l="Capital Gains Tax" r={`$${$$(fed.lt)}`}/>}
            {fed.niit>0&&<Row l="NIIT (3.8%)" r={`$${$$(fed.niit)}`} color={C.pu}/>}
            <Row l={`${ST[profile.state]?.n} Tax`} r={`$${$$(stTax.tax)}`} color={stTax.tax>0?C.yl:C.em}/>
            {seTax>0&&<Row l="SE Tax" r={`$${$$(seTax)}`} color={C.pu}/>}
            <div style={{borderTop:`1px solid ${C.bd}`,margin:"4px 0"}}/>
            <Row l="Total Tax" r={`$${$$(totalTax)}`} color={C.rd}/>
            <Row l="Take-Home Pay" r={`$${$$(takeHome)}`} color={C.em}/>
          </Box>

          {/* Tax Efficiency (replaces fake Audit Risk) */}
          <Box style={{marginBottom:10,cursor:"pointer"}} onClick={()=>go("save")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase"}}>Tax Efficiency</div>
                <div style={{color:eCol,fontSize:24,fontWeight:700,fontFamily:fm,marginTop:2}}>{efficiency}<span style={{fontSize:12,color:C.t3}}>%</span></div>
                <div style={{color:C.t4,fontSize:10,marginTop:2}}>of deductions used</div>
              </div>
              <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke={C.s3} strokeWidth="4"/><circle cx="24" cy="24" r="20" fill="none" stroke={eCol} strokeWidth="4" strokeDasharray={`${efficiency*1.26} 126`} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"center"}}/></svg>
            </div>
            {missedSave>200&&<div style={{color:C.t4,fontSize:11,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.bd}`}}>💡 Save ~<strong style={{color:eCol,fontFamily:fm}}>${$$(missedSave)}</strong> more by maxing tax-advantaged accounts</div>}
          </Box>

          {/* Where Your Dollar Goes */}
          {totalIncome > 0 && <Box style={{marginBottom:10}}>
            <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Where Your Dollar Goes</div>
            <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:10}}>
              <div style={{width:`${(totalTax/totalIncome)*100}%`,background:C.rd,minWidth:2}}/>
              {absDed>0&&<div style={{width:`${(absDed/totalIncome)*100}%`,background:C.yl,minWidth:2}}/>}
              <div style={{flex:1,background:C.em}}/>
            </div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}><div style={{width:6,height:6,borderRadius:1,background:C.rd}}/> Taxes {((totalTax/totalIncome)*100).toFixed(0)}%</span>
              {absDed>0&&<span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}><div style={{width:6,height:6,borderRadius:1,background:C.yl}}/> Saved {((absDed/totalIncome)*100).toFixed(0)}%</span>}
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}><div style={{width:6,height:6,borderRadius:1,background:C.em}}/> Take-home {((takeHome/totalIncome)*100).toFixed(0)}%</span>
            </div>
          </Box>}

          {/* Deadlines */}
          <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>Deadlines</div>
          {deadlines.map((dl,i)=>{const dCol=dl.days<=30?C.rd:dl.days<=90?C.yl:C.em;return<Box key={i} style={{marginBottom:5,padding:11,borderLeft:`3px solid ${dCol}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.t1,fontSize:11.5,fontWeight:600}}>{dl.nm}</div><div style={{color:C.t4,fontSize:10}}>{dl.d}</div></div><div style={{color:dCol,fontSize:15,fontWeight:700,fontFamily:fm}}>{dl.days}d</div></div></Box>;})}
        </div>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════
// SAVE MONEY
// ═══════════════════════════════════════════
function SaveMoney({ data, profile, isPro, onUpgrade, isMobile }) {
  const { pf, ws } = data;
  const hasPortfolio = Object.keys(pf).length > 0;
  const totalIncome = profile.salary + profile.freelance + profile.rentalNet + profile.dividends;
  const stTax = calcSt(profile.state, profile.salary+profile.freelance, 0);
  const fed = calcFed(profile.salary+profile.freelance, 0, 0, profile.filing, stTax.tax);
  const rate = fed.marg;

  // Adaptive tabs: only show portfolio tabs when data exists
  const tabs = hasPortfolio
    ? [["deductions","📋 Deductions"],["harvest","🌾 Harvesting"],["wash",`⚠️ Wash Sales${ws.length?` (${ws.length})`:""}`],["retirement","🏦 Retirement"],["credits","🎯 Credits"]]
    : [["deductions","📋 Deductions"],["retirement","🏦 Retirement"],["credits","🎯 Credits"]];
  const [sub, setSub] = useState("deductions");

  // === DEDUCTION STRATEGIES (interactive) ===
  const [sim401k, setSim401k] = useState(profile.retirement401k);
  const [simIRA, setSimIRA] = useState(profile.retirementIRA);
  const [simHSA, setSimHSA] = useState(0);
  const [simCharitable, setSimCharitable] = useState(isPro ? profile.charitable : 0);
  const [simHomeOffice, setSimHomeOffice] = useState(isPro ? profile.homeOffice : 0);

  const max401k = 23000, maxIRA = 7000, maxHSA = profile.filing === "mfj" ? 8300 : 4150;
  const qbiAmount = profile.freelance > 0 ? Math.round(profile.freelance * 0.2) : 0;
  const seHealthDed = profile.freelance > 0 ? Math.min(profile.freelance * 0.15, 12000) : 0; // estimate
  const halfSE = profile.freelance > 0 ? Math.round(profile.freelance * 0.9235 * 0.153 / 2) : 0;

  const strategies = [
    {
      id: "401k", icon: "🏛️", nm: "401(k) Contribution", max: max401k,
      current: profile.retirement401k, sim: sim401k, setSim: setSim401k,
      save: Math.round(Math.max(sim401k - profile.retirement401k, 0) * rate),
      desc: "Pre-tax contributions reduce taxable income dollar-for-dollar.",
      eligible: profile.salary > 0,
      eligibleNote: profile.salary > 0 ? "Available through employer plan" : "Requires W-2 employment",
      detail: `Max $23,000 in 2025 ($30,500 if 50+). Your employer may also match contributions.`,
    },
    {
      id: "ira", icon: "📘", nm: "Traditional IRA", max: maxIRA,
      current: profile.retirementIRA, sim: simIRA, setSim: setSimIRA,
      save: Math.round(Math.max(simIRA - profile.retirementIRA, 0) * rate),
      desc: "Tax-deductible contributions to individual retirement account.",
      eligible: true,
      eligibleNote: totalIncome < 87000 || !profile.salary ? "Fully deductible" : totalIncome < 107000 ? "Partially deductible (workplace plan phase-out)" : "May not be deductible (consider Roth)",
      detail: `Max $7,000 in 2025 ($8,000 if 50+). Deductibility depends on income and employer plan access.`,
    },
    {
      id: "hsa", icon: "🏥", nm: "Health Savings Account", max: maxHSA,
      current: 0, sim: simHSA, setSim: setSimHSA,
      save: Math.round(simHSA * rate),
      desc: "Triple tax advantage: deductible contributions, tax-free growth, tax-free withdrawals for medical.",
      eligible: true,
      eligibleNote: "Requires high-deductible health plan (HDHP)",
      detail: `Max $${$$(maxHSA)} in 2025 (${profile.filing==="mfj"?"family":"individual"}). Often called the best tax shelter in the US.`,
    },
    profile.freelance > 0 && {
      id: "qbi", icon: "🧾", nm: "QBI Deduction (§199A)", max: qbiAmount, current: 0, sim: qbiAmount, setSim: null,
      save: Math.round(qbiAmount * rate),
      desc: "Automatic 20% deduction on qualified business income.",
      eligible: profile.freelance > 0 && totalIncome < (profile.filing === "mfj" ? 383900 : 191950),
      eligibleNote: totalIncome < (profile.filing === "mfj" ? 383900 : 191950) ? "You qualify based on income" : "Phase-out applies at your income level",
      detail: `Deduct ${pct(0.20)} of your $${$$(profile.freelance)} freelance income = $${$$(qbiAmount)}. No action needed — taken automatically on your return.`,
      auto: true,
    },
    profile.freelance > 0 && {
      id: "sehalf", icon: "📋", nm: "½ Self-Employment Tax", max: halfSE, current: 0, sim: halfSE, setSim: null,
      save: Math.round(halfSE * rate),
      desc: "Deduct the employer-equivalent portion of your SE tax.",
      eligible: profile.freelance > 0,
      eligibleNote: "Automatic for self-employed filers",
      detail: `Your SE tax is ~$${$$(halfSE * 2)}. Half ($${$$(halfSE)}) is deductible as an adjustment to income. Taken on Schedule SE.`,
      auto: true,
    },
    profile.freelance > 0 && {
      id: "sehealth", icon: "💊", nm: "SE Health Insurance Deduction", max: Math.round(seHealthDed), current: 0, sim: Math.round(seHealthDed), setSim: null,
      save: Math.round(seHealthDed * rate),
      desc: "Self-employed individuals can deduct health insurance premiums.",
      eligible: profile.freelance > 0,
      eligibleNote: "Must not be eligible for employer-sponsored plan",
      detail: `Deduct premiums for yourself, spouse, and dependents. Above-the-line deduction — no need to itemize.`,
      auto: true,
    },
    {
      id: "charitable", icon: "🎁", nm: "Charitable Contributions", max: Math.round(totalIncome * 0.6), current: isPro ? profile.charitable : 0, sim: simCharitable, setSim: setSimCharitable,
      save: simCharitable > (STD_DED[profile.filing] || 14600) ? Math.round(simCharitable * rate) : 0,
      desc: "Deductible if you itemize — must exceed your standard deduction.",
      eligible: true,
      eligibleNote: simCharitable + (stTax.tax > 0 ? Math.min(stTax.tax, SALT_CAP) : 0) > (STD_DED[profile.filing] || 14600) ? "Would trigger itemizing" : `Need $${$$((STD_DED[profile.filing]||14600) - (stTax.tax > 0 ? Math.min(stTax.tax, SALT_CAP) : 0))}+ to exceed standard deduction`,
      detail: `Standard deduction: $${$$(STD_DED[profile.filing]||14600)}. Charitable only saves tax if total itemized deductions exceed this.`,
    },
  ].filter(Boolean);

  const totalNewSavings = strategies.reduce((s, st) => s + st.save, 0);

  // === HARVEST (only when portfolio exists) ===
  const harvestable = hasPortfolio ? Object.entries(pf).flatMap(([a,d]) => d.lots.filter(l=>l.unrealized<0).map(l=>({asset:a,type:d.type,name:d.name,...l,save:Math.abs(l.unrealized)*rate}))).sort((a,b)=>a.unrealized-b.unrealized) : [];
  const harvestTotal = harvestable.reduce((s,h) => s+h.save, 0);

  // === RETIREMENT MODELING ===
  const currentAge = 35; // default — could be profile field later
  const retireAge = 65;
  const yearsToRetire = retireAge - currentAge;
  const annual401k = sim401k, annualIRA = simIRA, annualHSA = simHSA;
  const totalAnnualRetirement = annual401k + annualIRA + annualHSA;
  const growthRate = 0.07;
  const futureValue = totalAnnualRetirement > 0 ? Math.round(totalAnnualRetirement * ((Math.pow(1 + growthRate, yearsToRetire) - 1) / growthRate)) : 0;
  const taxSavedAnnually = Math.round(totalAnnualRetirement * rate);
  const taxSaved30yr = Math.round(taxSavedAnnually * yearsToRetire);

  // === TAX CREDITS ===
  const credits = [
    { id:"savers", icon:"💰", nm:"Saver's Credit", amount: totalIncome < (profile.filing==="mfj"?73000:36500) ? (totalAnnualRetirement > 0 ? Math.min(Math.round(totalAnnualRetirement * (totalIncome < (profile.filing==="mfj"?46000:23000) ? 0.5 : totalIncome < (profile.filing==="mfj"?50000:25000) ? 0.2 : 0.1)), profile.filing==="mfj"?2000:1000) : 0) : 0, eligible: totalIncome < (profile.filing==="mfj"?73000:36500), desc:"Credit for retirement contributions (10-50% of first $2,000/$4,000 contributed)", eligibleNote: totalIncome < (profile.filing==="mfj"?73000:36500) ? "You qualify based on income" : "Income exceeds threshold" },
    { id:"child", icon:"👶", nm:"Child Tax Credit", amount: 0, eligible: true, desc:"$2,000 per qualifying child under 17. Partially refundable.", eligibleNote:"Applies if you have qualifying dependents" },
    { id:"eitc", icon:"📈", nm:"Earned Income Tax Credit", amount: totalIncome < (profile.filing==="mfj"?63398:56838) && totalIncome > 0 ? Math.min(Math.round(totalIncome * 0.08), profile.filing==="mfj"?7430:6604) : 0, eligible: totalIncome < (profile.filing==="mfj"?63398:56838) && totalIncome > 0, desc:"Refundable credit for low-to-moderate income workers. Amount depends on income and dependents.", eligibleNote: totalIncome < (profile.filing==="mfj"?63398:56838) ? "You may qualify — depends on dependents" : "Income exceeds threshold" },
    profile.freelance > 0 && { id:"seducation", icon:"📚", nm:"Lifetime Learning Credit", amount: totalIncome < (profile.filing==="mfj"?180000:90000) ? 2000 : 0, eligible: totalIncome < (profile.filing==="mfj"?180000:90000), desc:"Up to $2,000/year for education expenses. Useful for professional development.", eligibleNote: "Requires qualifying education expenses" },
    { id:"energy", icon:"🔋", nm:"Residential Energy Credit", amount: 0, eligible: true, desc:"30% of costs for solar panels, heat pumps, windows, etc. up to $3,200/year.", eligibleNote:"Applies if you made qualifying home improvements" },
  ].filter(Boolean);

  return (
    <div style={{padding:isMobile?"16px 16px 80px":"24px 28px",overflowY:"auto",height:"100%"}}>
      <Tabs items={tabs} active={sub} onChange={setSub}/>
      <div style={{marginTop:14}}>

        {/* ═══ DEDUCTIONS ═══ */}
        {sub === "deductions" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="See personalized deduction strategies modeled at your marginal rate.">
          {/* Summary */}
          <Box style={{marginBottom:14,textAlign:"center",padding:20}}>
            <div style={{color:C.t3,fontSize:12,marginBottom:4}}>Potential additional tax savings at your <strong style={{color:C.bl,fontFamily:fm}}>{pct(rate)}</strong> marginal rate</div>
            <div style={{color:C.em,fontSize:38,fontWeight:700,fontFamily:fm}}>${$$(totalNewSavings)}</div>
            <div style={{color:C.t4,fontSize:11.5,marginTop:4}}>Adjust sliders below to model different contribution levels</div>
          </Box>

          {/* Strategy cards */}
          {strategies.map(s => (
            <Box key={s.id} style={{marginBottom:8,borderLeft:`3px solid ${s.eligible ? (s.save > 0 ? C.em : C.t4) : C.rd+"60"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:16}}>{s.icon}</span>
                    <span style={{color:C.t1,fontSize:13,fontWeight:600}}>{s.nm}</span>
                    {s.auto && <Chip color={C.bl}>AUTO</Chip>}
                  </div>
                  <div style={{color:C.t3,fontSize:12,lineHeight:1.5,marginBottom:6}}>{s.desc}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:s.setSim?8:0}}>
                    <div style={{width:6,height:6,borderRadius:3,background:s.eligible?C.em:C.rd,flexShrink:0}}/>
                    <span style={{color:s.eligible?C.t3:C.rd,fontSize:11}}>{s.eligibleNote}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",minWidth:70,flexShrink:0}}>
                  {s.save > 0 ? <div style={{color:C.em,fontSize:18,fontWeight:700,fontFamily:fm}}>${$$(s.save)}</div>
                  : <div style={{color:C.t4,fontSize:13,fontFamily:fm}}>$0</div>}
                  <div style={{color:C.t4,fontSize:10}}>tax saved</div>
                </div>
              </div>

              {/* Interactive slider for adjustable strategies */}
              {s.setSim && s.eligible && <>
                <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
                  <div style={{flex:1}}>
                    <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden",position:"relative"}}>
                      {/* Current contribution marker */}
                      {s.current > 0 && <div style={{position:"absolute",top:-1,left:`${(s.current/s.max)*100}%`,width:2,height:8,background:C.t4,borderRadius:1,zIndex:1}}/>}
                      <div style={{height:"100%",width:`${(s.sim/s.max)*100}%`,background:`linear-gradient(90deg, ${C.em}, ${C.bl})`,borderRadius:3,transition:"width 0.15s"}}/>
                    </div>
                    <input type="range" min={0} max={s.max} step={s.max > 10000 ? 500 : 250} value={s.sim} onChange={e => s.setSim(+e.target.value)} style={{width:"100%",accentColor:C.em,height:24,marginTop:-14,opacity:0,cursor:"pointer",position:"relative",zIndex:2}}/>
                  </div>
                  <div style={{minWidth:72,textAlign:"right"}}>
                    <span style={{color:C.t1,fontSize:12,fontWeight:600,fontFamily:fm}}>${$$(s.sim)}</span>
                    <span style={{color:C.t4,fontSize:10}}> / ${$$(s.max)}</span>
                  </div>
                </div>
              </>}

              {/* Expandable detail */}
              <div style={{color:C.t4,fontSize:11,lineHeight:1.5,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.bd}`}}>{s.detail}</div>
            </Box>
          ))}

          {/* SALT note */}
          <Box style={{marginTop:10,borderLeft:`3px solid ${C.yl}`}}>
            <div style={{display:"flex",gap:10}}>
              <span style={{fontSize:16}}>🧂</span>
              <div>
                <div style={{color:C.t1,fontSize:13,fontWeight:600}}>SALT Deduction Cap</div>
                <div style={{color:C.t3,fontSize:12,lineHeight:1.5,marginTop:3}}>
                  State and local taxes are capped at $10,000 for federal deductions. Your {ST[profile.state]?.n} tax of ${$$(stTax.tax)} {stTax.tax > SALT_CAP ? `exceeds the cap — you lose $${$$(stTax.tax - SALT_CAP)} in potential deductions.` : `is within the $10,000 cap.`}
                </div>
              </div>
            </div>
          </Box>
        </ProGate>}

        {/* ═══ HARVESTING (only when portfolio) ═══ */}
        {sub === "harvest" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser={<>We found <strong style={{color:C.em}}>${$$(harvestTotal)}</strong> in potential tax savings across {harvestable.length} positions.</>}>
          <Box style={{marginBottom:14,textAlign:"center",padding:20}}><div style={{color:C.t3,fontSize:12,marginBottom:4}}>Potential tax savings at your {pct(rate)} marginal rate</div><div style={{color:C.em,fontSize:38,fontWeight:700,fontFamily:fm}}>${$$(harvestTotal)}</div><div style={{color:C.t3,fontSize:11.5,marginTop:4}}>{harvestable.length} positions with unrealized losses</div></Box>
          {harvestable.map((h,i)=>(<Box key={i} style={{marginBottom:5,padding:13,borderLeft:`3px solid ${h.type==="crypto"?C.em:C.bl}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:C.t1,fontSize:13,fontWeight:700}}>{h.asset}</span><Chip color={h.type==="crypto"?C.em:C.bl}>{h.type==="crypto"?"CRYPTO":"STOCK"}</Chip><Chip color={h.holdDays>365?C.bl:C.yl}>{h.holdDays>365?"LT":"ST"}</Chip></div><div style={{textAlign:"right"}}><div style={{color:C.rd,fontSize:11,fontFamily:fm}}>-${$$(Math.abs(h.unrealized))}</div><div style={{color:C.em,fontSize:14,fontWeight:700,fontFamily:fm}}>Save ${$$(h.save)}</div></div></div></Box>))}
        </ProGate>}

        {/* ═══ WASH SALES (only when portfolio) ═══ */}
        {sub === "wash" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser={ws.length>0?`${ws.length} potential wash sale${ws.length>1?"s":""} detected.`:"Check your crypto positions for wash sale violations."}>
          {ws.length===0?<Box style={{textAlign:"center",padding:36}}><div style={{fontSize:26,marginBottom:6}}>✅</div><div style={{color:C.em,fontSize:14,fontWeight:600}}>No wash sales detected</div></Box>
          :ws.map((w,i)=>(<Box key={i} style={{marginBottom:8,borderLeft:`3px solid ${C.rd}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{color:C.t1,fontSize:13,fontWeight:600}}>{w.asset}</div><Chip color={C.rd}>WASH SALE</Chip></div><div style={{color:C.t3,fontSize:12,marginTop:5}}>Sold {w.sellDate} at ${$$(Math.abs(w.gain))} loss → repurchased {Math.abs(Math.floor((new Date(w.repurchase.d)-new Date(w.sellDate))/864e5))}d later</div></div><div style={{color:C.rd,fontSize:18,fontWeight:700,fontFamily:fm}}>${$$(w.disallowed)}</div></div></Box>))}
        </ProGate>}

        {/* ═══ RETIREMENT ═══ */}
        {sub === "retirement" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="See how your retirement contributions compound and reduce taxes over time.">
          <Box style={{marginBottom:14,textAlign:"center",padding:22}}>
            <div style={{color:C.t3,fontSize:12,marginBottom:4}}>Annual retirement contributions</div>
            <div style={{color:C.t1,fontSize:36,fontWeight:700,fontFamily:fm}}>${$$(totalAnnualRetirement)}</div>
            <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
              {annual401k>0&&<span style={{color:C.t3,fontSize:12}}>401(k) <strong style={{color:C.bl,fontFamily:fm}}>${$$(annual401k)}</strong></span>}
              {annualIRA>0&&<span style={{color:C.t3,fontSize:12}}>IRA <strong style={{color:C.pu,fontFamily:fm}}>${$$(annualIRA)}</strong></span>}
              {annualHSA>0&&<span style={{color:C.t3,fontSize:12}}>HSA <strong style={{color:C.em,fontFamily:fm}}>${$$(annualHSA)}</strong></span>}
              {totalAnnualRetirement===0&&<span style={{color:C.t4,fontSize:12}}>Adjust contributions in the Deductions tab</span>}
            </div>
          </Box>

          {totalAnnualRetirement > 0 && <>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              <Box style={{textAlign:"center",padding:16}}>
                <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Tax saved / year</div>
                <div style={{color:C.em,fontSize:22,fontWeight:700,fontFamily:fm}}>${$$(taxSavedAnnually)}</div>
              </Box>
              <Box style={{textAlign:"center",padding:16}}>
                <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Tax saved over {yearsToRetire}yr</div>
                <div style={{color:C.em,fontSize:22,fontWeight:700,fontFamily:fm}}>${$$(taxSaved30yr)}</div>
              </Box>
              <Box style={{textAlign:"center",padding:16}}>
                <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:4}}>Projected at 7%</div>
                <div style={{color:C.bl,fontSize:22,fontWeight:700,fontFamily:fm}}>${$$(futureValue)}</div>
              </Box>
            </div>

            {/* Growth visualization */}
            <Box style={{marginBottom:10}}>
              <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:10}}>Growth projection (7% avg return)</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:2,height:120}}>
                {[5,10,15,20,25,30].filter(y=>y<=yearsToRetire).map(yr => {
                  const fv = Math.round(totalAnnualRetirement * ((Math.pow(1.07, yr) - 1) / 0.07));
                  const contributed = totalAnnualRetirement * yr;
                  const maxFv = Math.round(totalAnnualRetirement * ((Math.pow(1.07, yearsToRetire) - 1) / 0.07));
                  const barH = maxFv > 0 ? Math.max((fv / maxFv) * 100, 8) : 8;
                  const contribH = maxFv > 0 ? Math.max((contributed / maxFv) * 100, 4) : 4;
                  return (
                    <div key={yr} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{color:C.t1,fontSize:9,fontFamily:fm,fontWeight:600}}>${$$(fv)}</span>
                      <div style={{width:"100%",position:"relative",height:`${barH}%`,minHeight:8}}>
                        <div style={{position:"absolute",bottom:0,width:"100%",height:"100%",background:`${C.bl}30`,borderRadius:3}}/>
                        <div style={{position:"absolute",bottom:0,width:"100%",height:`${contribH/barH*100}%`,background:C.em,borderRadius:"0 0 3px 3px"}}/>
                      </div>
                      <span style={{color:C.t4,fontSize:9}}>{yr}yr</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:14,marginTop:8}}>
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}><div style={{width:8,height:8,borderRadius:1,background:C.em}}/> Contributed</span>
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}><div style={{width:8,height:8,borderRadius:1,background:`${C.bl}30`}}/> Growth</span>
              </div>
            </Box>
          </>}

          {totalAnnualRetirement === 0 && <Box style={{textAlign:"center",padding:32}}>
            <div style={{fontSize:28,marginBottom:8}}>🏦</div>
            <div style={{color:C.t1,fontSize:14,fontWeight:600,marginBottom:6}}>No retirement contributions yet</div>
            <div style={{color:C.t4,fontSize:12,lineHeight:1.5,maxWidth:340,margin:"0 auto"}}>Go to the Deductions tab and adjust your 401(k), IRA, and HSA sliders to see how contributions compound and reduce your taxes.</div>
          </Box>}

          <Box style={{marginTop:10,borderLeft:`3px solid ${C.bl}`}}>
            <div style={{display:"flex",gap:10}}>
              <span style={{fontSize:16}}>💡</span>
              <div style={{color:C.t3,fontSize:12,lineHeight:1.5}}>
                <strong style={{color:C.t1}}>Roth vs Traditional:</strong> Traditional contributions save taxes now at your {pct(rate)} rate. Roth contributions are taxed now but grow and withdraw tax-free. If you expect to be in a higher bracket in retirement, Roth may be better.
              </div>
            </div>
          </Box>
        </ProGate>}

        {/* ═══ CREDITS ═══ */}
        {sub === "credits" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="See which tax credits you may be eligible for — credits reduce your tax bill dollar-for-dollar.">
          <Box style={{marginBottom:14,padding:18,textAlign:"center"}}>
            <div style={{color:C.t3,fontSize:12,marginBottom:4}}>Tax credits reduce your bill <strong style={{color:C.em}}>dollar-for-dollar</strong> — more powerful than deductions</div>
          </Box>

          {credits.map(cr => (
            <Box key={cr.id} style={{marginBottom:8,borderLeft:`3px solid ${cr.eligible ? (cr.amount > 0 ? C.em : C.bl) : C.t4}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:16}}>{cr.icon}</span>
                    <span style={{color:C.t1,fontSize:13,fontWeight:600}}>{cr.nm}</span>
                  </div>
                  <div style={{color:C.t3,fontSize:12,lineHeight:1.5,marginBottom:4}}>{cr.desc}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:6,height:6,borderRadius:3,background:cr.eligible?C.em:C.t4,flexShrink:0}}/>
                    <span style={{color:cr.eligible?C.t3:C.t4,fontSize:11}}>{cr.eligibleNote}</span>
                  </div>
                </div>
                <div style={{textAlign:"right",minWidth:60,flexShrink:0}}>
                  {cr.amount > 0
                    ? <div style={{color:C.em,fontSize:18,fontWeight:700,fontFamily:fm}}>${$$(cr.amount)}</div>
                    : <div style={{color:C.t4,fontSize:12,fontFamily:fm}}>—</div>}
                </div>
              </div>
            </Box>
          ))}

          <Box style={{marginTop:10,borderLeft:`3px solid ${C.pu}`}}>
            <div style={{display:"flex",gap:10}}>
              <span style={{fontSize:16}}>📌</span>
              <div style={{color:C.t3,fontSize:12,lineHeight:1.5}}>
                <strong style={{color:C.t1}}>Credits vs Deductions:</strong> A $1,000 deduction at your {pct(rate)} rate saves you ${$$(Math.round(1000*rate))}. A $1,000 credit saves you the full $1,000. Always claim credits first.
              </div>
            </div>
          </Box>
        </ProGate>}

      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PLAN AHEAD (gated: comparison free, proj pro)
// ═══════════════════════════════════════════
function PlanAhead({ data, profile, isPro, onUpgrade, isMobile }) {
  const [sub, setSub] = useState("states");
  const [target, setTarget] = useState("TX");
  const [growth, setGrowth] = useState(5);
  const [projState, setProjState] = useState(profile.state);
  const [strategy, setStrategy] = useState("base");
  const [homeValue, setHomeValue] = useState(350000);
  const totalIncome = profile.salary + profile.freelance + profile.rentalNet;
  const realGains = Math.max(data.ltGains + data.stGains, 0);
  const curSt = calcSt(profile.state, totalIncome, realGains);
  const tarSt = calcSt(target, totalIncome, realGains);

  const proj = useMemo(() => {
    return [2026,2027,2028].map((yr,i) => {
      const yrs = i+1;
      const salary = Math.round(profile.salary * Math.pow(1+growth/100, yrs));
      const freelance = Math.round(profile.freelance * Math.pow(1+growth/100, yrs));
      const rental = profile.rentalNet;
      const divs = profile.dividends;
      const inc = salary + freelance + rental + divs;
      let ded401k = profile.retirement401k, dedIRA = profile.retirementIRA;
      let seInc = freelance;
      if (strategy === "max") { ded401k = 23000; dedIRA = 7000; }
      if (strategy === "scorp") { seInc = Math.round(freelance * 0.6); }
      const adjInc = Math.max(inc - ded401k - dedIRA, 0);
      const stT = calcSt(projState, adjInc, 0);
      const f = calcFed(adjInc, 0, 0, profile.filing, stT.tax);
      const se = seInc > 0 ? Math.round(seInc*0.9235*0.153) : 0;
      const total = f.tot + stT.tax + se;
      const baseAdj = Math.max(inc - profile.retirement401k - profile.retirementIRA, 0);
      const baseSt = calcSt(projState, baseAdj, 0);
      const baseF = calcFed(baseAdj, 0, 0, profile.filing, baseSt.tax);
      const baseSE = freelance > 0 ? Math.round(freelance*0.9235*0.153) : 0;
      const baseTotal = baseF.tot + baseSt.tax + baseSE;
      return { yr, inc, fed:f.tot, st:stT.tax, se, total, saved: strategy!=="base" ? Math.max(baseTotal-total,0) : 0 };
    });
  }, [growth,projState,strategy,profile]);

  return (
    <div style={{padding:isMobile?"16px 16px 80px":"24px 28px",overflowY:"auto",height:"100%"}}>
      <Tabs items={[["states","✈️ State Comparison"],["proj","🔮 3-Year Projection"]]} active={sub} onChange={setSub}/>
      {sub === "states" && <div style={{marginTop:14}}>
        {/* State comparison is free — shows value */}
        <Box style={{marginBottom:14,padding:isMobile?16:22,textAlign:"center"}}>
          <div style={{color:C.t3,fontSize:12.5,marginBottom:8}}>Moving from <strong style={{color:C.t1}}>{ST[profile.state]?.n}</strong> to</div>
          <select value={target} onChange={e=>setTarget(e.target.value)} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:"10px 16px",color:C.t1,fontSize:15,fontWeight:600,fontFamily:ff,outline:"none",marginBottom:12}}>{Object.entries(ST).filter(([c])=>c!==profile.state).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=><option key={k} value={k}>{v.n}{v.t==="0"?" ★":""}</option>)}</select>
          {curSt.tax-tarSt.tax>0?<><div style={{color:C.em,fontSize:40,fontWeight:700,fontFamily:fm}}>${$$(curSt.tax-tarSt.tax)}</div><div style={{color:C.t3,fontSize:12.5,marginTop:4}}>income tax saved per year</div></>:<curSt.tax===tarSt.tax?<div style={{color:C.t4,fontSize:14,fontWeight:600}}>Same income tax</div>:<div style={{color:C.rd,fontSize:14,fontWeight:600}}>+${$$(tarSt.tax-curSt.tax)} more in income tax</div>}
        </Box>

        {/* Assumptions */}
        <Box style={{marginBottom:10,padding:"12px 16px"}}>
          <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:10}}>Adjust assumptions</div>
          <Slider label="Home Value" value={homeValue} onChange={setHomeValue} min={100000} max={1500000} step={25000} fmt={v=>`$${$$(v)}`} color={C.yl}/>
        </Box>

        {/* Multi-factor comparison */}
        {(()=>{
          const curX = STX[profile.state]||{s:0,p:0}, tarX = STX[target]||{s:0,p:0};
          const curProp = Math.round(homeValue * curX.p / 100);
          const tarProp = Math.round(homeValue * tarX.p / 100);
          const spendEstimate = Math.min(totalIncome * 0.35, 60000); // ~35% of income on taxable goods
          const curSales = Math.round(spendEstimate * curX.s / 100);
          const tarSales = Math.round(spendEstimate * tarX.s / 100);
          const curTotal = curSt.tax + curProp + curSales;
          const tarTotal = tarSt.tax + tarProp + tarSales;
          const netDiff = curTotal - tarTotal;
          const maxBar = Math.max(curTotal, tarTotal, 1);
          return <>
            <Box style={{marginBottom:10}}>
              <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:10}}>Full state tax burden comparison</div>
              {/* Current state bar */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.t1,fontSize:12,fontWeight:600}}>{ST[profile.state]?.n}</span>
                  <span style={{color:C.rd,fontSize:13,fontWeight:700,fontFamily:fm}}>${$$(curTotal)}/yr</span>
                </div>
                <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:C.s3}}>
                  <div style={{width:`${(curSt.tax/maxBar)*100}%`,background:C.bl}} title="Income tax"/>
                  <div style={{width:`${(curProp/maxBar)*100}%`,background:C.yl}} title="Property tax"/>
                  <div style={{width:`${(curSales/maxBar)*100}%`,background:C.pu}} title="Sales tax"/>
                </div>
              </div>
              {/* Target state bar */}
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:C.t1,fontSize:12,fontWeight:600}}>{ST[target]?.n}</span>
                  <span style={{color:tarTotal<curTotal?C.em:C.t1,fontSize:13,fontWeight:700,fontFamily:fm}}>${$$(tarTotal)}/yr</span>
                </div>
                <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",background:C.s3}}>
                  <div style={{width:`${(tarSt.tax/maxBar)*100}%`,background:C.bl}} title="Income tax"/>
                  <div style={{width:`${(tarProp/maxBar)*100}%`,background:C.yl}} title="Property tax"/>
                  <div style={{width:`${(tarSales/maxBar)*100}%`,background:C.pu}} title="Sales tax"/>
                </div>
              </div>
              {/* Legend */}
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}><div style={{width:8,height:8,borderRadius:1,background:C.bl}}/> Income tax</span>
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}><div style={{width:8,height:8,borderRadius:1,background:C.yl}}/> Property tax</span>
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t3}}><div style={{width:8,height:8,borderRadius:1,background:C.pu}}/> Sales tax</span>
              </div>
            </Box>

            {/* Breakdown table */}
            <Box style={{marginBottom:10,padding:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 14px",borderBottom:`1px solid ${C.bd}`}}>
                <span style={{color:C.t4,fontSize:10,fontWeight:600,textTransform:"uppercase"}}></span>
                <span style={{color:C.t3,fontSize:10,fontWeight:600,textTransform:"uppercase",textAlign:"right"}}>{ST[profile.state]?.n?.split(" ").map(w=>w[0]).join("")||profile.state}</span>
                <span style={{color:C.t3,fontSize:10,fontWeight:600,textTransform:"uppercase",textAlign:"right"}}>{ST[target]?.n?.split(" ").map(w=>w[0]).join("")||target}</span>
              </div>
              {[
                ["Income Tax",curSt.tax,tarSt.tax],
                [`Property Tax`,curProp,tarProp],
                [`Sales Tax`,curSales,tarSales],
              ].map(([label,cur,tar],i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"8px 14px",borderBottom:`1px solid ${C.bd}`}}>
                <span style={{color:C.t2,fontSize:12}}>{label}</span>
                <span style={{color:C.t1,fontSize:12,fontFamily:fm,textAlign:"right"}}>${$$(cur)}</span>
                <span style={{color:tar<cur?C.em:tar>cur?C.rd:C.t1,fontSize:12,fontFamily:fm,textAlign:"right"}}>${$$(tar)}</span>
              </div>))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 14px"}}>
                <span style={{color:C.t1,fontSize:12,fontWeight:700}}>Total</span>
                <span style={{color:C.t1,fontSize:13,fontWeight:700,fontFamily:fm,textAlign:"right"}}>${$$(curTotal)}</span>
                <span style={{color:tarTotal<curTotal?C.em:C.t1,fontSize:13,fontWeight:700,fontFamily:fm,textAlign:"right"}}>${$$(tarTotal)}</span>
              </div>
            </Box>

            {/* Net summary */}
            <Box style={{textAlign:"center",padding:16,borderLeft:`3px solid ${netDiff>0?C.em:netDiff<0?C.rd:C.t4}`}}>
              {netDiff>500 ? <><div style={{color:C.em,fontSize:20,fontWeight:700,fontFamily:fm}}>${$$(netDiff)}</div><div style={{color:C.t3,fontSize:12}}>total estimated savings per year in <strong style={{color:C.t1}}>{ST[target]?.n}</strong></div></> 
              : netDiff<-500 ? <><div style={{color:C.rd,fontSize:20,fontWeight:700,fontFamily:fm}}>+${$$(-netDiff)}</div><div style={{color:C.t3,fontSize:12}}>more per year in <strong style={{color:C.t1}}>{ST[target]?.n}</strong></div></>
              : <div style={{color:C.t4,fontSize:13}}>Similar total tax burden</div>}
            </Box>

            <div style={{color:C.t4,fontSize:10,marginTop:8,lineHeight:1.5}}>Property tax estimated on ${$$(homeValue)} home value (adjust above). Sales tax estimated on 35% of income spent on taxable goods. Actual burden varies by locality.</div>
          </>;
        })()}

        <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginTop:16,marginBottom:6}}>Zero-tax states</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>
          {Object.entries(ST).filter(([,s])=>s.t==="0").map(([c,s])=><Box key={c} onClick={()=>setTarget(c)} style={{padding:11,textAlign:"center",cursor:"pointer",border:`1px solid ${target===c?C.em:C.bd}`}}><div style={{color:C.t1,fontSize:12,fontWeight:600,marginBottom:2}}>{s.n}</div><Chip color={C.em}>$0 income</Chip>{STX[c]&&STX[c].p>1.5&&<div style={{color:C.yl,fontSize:9,marginTop:2}}>{STX[c].p}% property</div>}</Box>)}
        </div>
        </div>
        {!isPro && <div style={{marginTop:16,textAlign:"center"}}><button onClick={onUpgrade} style={{padding:"8px 20px",borderRadius:9,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff}}>🔮 Unlock 3-Year Projections with Pro</button></div>}
      </div>}
      {sub === "proj" && <div style={{marginTop:14}}>
        <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="Model income growth, life events, and tax strategies over 3 years." label="Pro Feature">
          <Box style={{marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <SelectField label="State" value={projState} onChange={setProjState} options={Object.entries(ST).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=>[k,v.n])}/>
            <Slider label="Annual Raise" value={growth} onChange={setGrowth} min={0} max={30} step={2} fmt={v=>`${v}%`} color={C.em}/>
            <div><label style={{color:C.t3,fontSize:10,fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:5}}>Scenario</label><div style={{display:"flex",gap:3}}>{[["base","📊 Base"],["max","🚀 Max 401k"],["scorp","🏢 S-Corp"]].map(([id,l])=><button key={id} onClick={()=>setStrategy(id)} style={{flex:1,padding:"6px",borderRadius:6,border:"none",cursor:"pointer",background:strategy===id?C.em:"transparent",color:strategy===id?C.bg:C.t3,fontSize:11,fontWeight:600,fontFamily:ff}}>{l}</button>)}</div></div>
          </div></Box>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {proj.map((p,i)=>(<Box key={p.yr}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:C.em,fontSize:17,fontWeight:700,fontFamily:fm}}>{p.yr}</span><Chip>Y{i+1}</Chip></div>
              <div style={{color:C.t3,fontSize:10,marginBottom:2}}>Income</div>
              <div style={{color:C.t1,fontSize:15,fontWeight:700,fontFamily:fm,marginBottom:6}}>${$$(p.inc)}</div>
              <Row l="Federal" r={`$${$$(p.fed)}`}/>
              <Row l="State" r={`$${$$(p.st)}`} color={p.st===0?C.em:C.t1}/>
              {p.se>0&&<Row l="SE" r={`$${$$(p.se)}`} color={C.pu}/>}
              <div style={{borderTop:`1px solid ${C.bd}`,marginTop:4,paddingTop:4}}>
                <Row l="Total Tax" r={`$${$$(p.total)}`} color={C.rd}/>
                <Row l="Eff. Rate" r={pct(p.inc>0?p.total/p.inc:0)} color={C.bl} sub/>
              </div>
              {p.saved>0&&<div style={{marginTop:4,padding:"4px 8px",background:`${C.emx}0.08)`,borderRadius:6}}><Row l="Saved vs base" r={`$${$$(p.saved)}`} color={C.em}/></div>}
            </Box>))}
          </div>
          {/* Summary insight */}
          {proj.length===3 && (()=>{
            const totalTaxPaid = proj.reduce((s,p)=>s+p.total,0);
            const totalSaved = proj.reduce((s,p)=>s+p.saved,0);
            return <Box style={{marginTop:10,borderLeft:`3px solid ${totalSaved>0?C.em:C.bl}`,padding:14}}>
              <div style={{color:C.t3,fontSize:12,lineHeight:1.6}}>
                <strong style={{color:C.t1}}>3-year outlook:</strong> With {growth}% annual raises{strategy==="max"?" and maxed 401(k)":strategy==="scorp"?" and S-Corp election":""}, you'll earn <strong style={{color:C.t1}}>${$$(proj.reduce((s,p)=>s+p.inc,0))}</strong> and pay <strong style={{color:C.rd}}>${$$(totalTaxPaid)}</strong> in taxes over 3 years.
                {totalSaved>1000 && <> The {strategy==="max"?"max 401(k)":"S-Corp"} strategy saves <strong style={{color:C.em}}>${$$(totalSaved)}</strong> compared to your current setup.</>}
              </div>
            </Box>;
          })()}
        </ProGate>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPLIANCE (view-only for free)
// ═══════════════════════════════════════════
function Compliance({ isPro, onUpgrade, isMobile, profile }) {
  const [open, setOpen] = useState(null);
  const [done, setDone] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [intlSort, setIntlSort] = useState("tax"); // tax, savings, crypto
  const [intlFilter, setIntlFilter] = useState("all"); // all, nomad, crypto0
  useEffect(() => { if (!isPro) return; try{const r=localStorage.getItem("taxiq-compliance");if(r)setDone(JSON.parse(r));}catch{} setLoaded(true); }, [isPro]);
  const toggle = useCallback((fw,si,ii) => {
    if (!isPro) return;
    setDone(prev => { const k=`${fw}-${si}-${ii}`,next={...prev,[k]:!prev[k]}; try{localStorage.setItem("taxiq-compliance",JSON.stringify(next));}catch{} return next; });
  }, [isPro]);

  // Relevance scoring based on profile
  const totalIncome = profile.salary + profile.freelance + profile.rentalNet + profile.dividends;
  const relevance = {
    fatca: profile.foreign ? "applies" : "unlikely",
    fbar: profile.foreign ? "applies" : "unlikely",
    est: profile.freelance > 0 || profile.rentalNet > 0 || profile.dividends > 10000 ? "applies" : totalIncome > 150000 ? "review" : "unlikely",
    forms: "applies", // everyone files
  };
  const relLabel = { applies: "Applies to you", review: "Worth reviewing", unlikely: "May not apply" };
  const relColor = { applies: C.em, review: C.yl, unlikely: C.t4 };
  const relOrder = { applies: 0, review: 1, unlikely: 2 };

  // Sort: applicable first
  const sortedEntries = Object.entries(COMPLY_DATA).sort((a, b) => relOrder[relevance[a[0]]] - relOrder[relevance[b[0]]]);
  const appliesCount = sortedEntries.filter(([k]) => relevance[k] === "applies").length;

  return (
    <div style={{padding:isMobile?"16px 16px 80px":"24px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:4}}>Compliance & Filing</div>
      <div style={{color:C.t3,fontSize:12,marginBottom:10}}>Based on your profile, we've identified which obligations apply to you.</div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <Chip color={C.em}>{appliesCount} apply to you</Chip>
        {profile.foreign && <Chip color={C.yl}>Foreign accounts detected</Chip>}
        {profile.freelance > 0 && <Chip color={C.pu}>Self-employed</Chip>}
      </div>
      {!isPro && <div style={{padding:"10px 16px",background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.12)`,borderRadius:10,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:C.t2,fontSize:12}}>🔒 Interactive checklists with progress saving require Pro</span>
        <button onClick={onUpgrade} style={{padding:"5px 14px",borderRadius:7,border:"none",background:C.em,color:C.bg,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:ff}}>Upgrade</button>
      </div>}
      {sortedEntries.map(([key,fw])=>{const isOpen=open===key;const total=fw.steps.reduce((s,st)=>s+st.items.length,0);const completed=fw.steps.reduce((s,st,si)=>s+st.items.filter((_,ii)=>done[`${key}-${si}-${ii}`]).length,0);const rel=relevance[key];return(
        <div key={key} style={{marginBottom:7,opacity:rel==="unlikely"?0.6:1}}>
          <Box onClick={()=>setOpen(isOpen?null:key)} style={{cursor:"pointer",borderLeft:`3px solid ${relColor[rel]}`}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:19}}>{fw.icon}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:C.t1,fontSize:13,fontWeight:600}}>{fw.nm}</span><Chip color={relColor[rel]}>{relLabel[rel]}</Chip></div><div style={{color:C.t3,fontSize:11.5,marginTop:2}}>{fw.trigger}</div></div>{isPro&&completed>0&&<Chip color={completed===total?C.em:C.yl}>{completed}/{total}</Chip>}<span style={{color:C.t4,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"none",fontSize:12}}>▾</span></div></Box>
          {isOpen&&<Box style={{borderTopLeftRadius:0,borderTopRightRadius:0,marginTop:-1,borderTop:`1px solid ${C.bd}`}}>
            <Chip color={C.rd} style={{marginBottom:10}}>Penalty: {fw.pen}</Chip>
            {fw.steps.map((step,si)=>(<div key={si} style={{marginBottom:10}}><div style={{color:C.em,fontSize:11,fontWeight:700,marginBottom:5}}>Step {si+1}: {step.t}</div>{step.items.map((item,ii)=>{const checked=isPro&&done[`${key}-${si}-${ii}`];return(<div key={ii} onClick={()=>toggle(key,si,ii)} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"4px 0",cursor:isPro?"pointer":"default",opacity:isPro?1:0.7}}>
              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${checked?C.em:C.t4}`,background:checked?`${C.emx}0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.em,fontSize:10}}>✓</span>}</div>
              <span style={{color:checked?C.t4:C.t2,fontSize:12,lineHeight:1.5,textDecoration:checked?"line-through":"none"}}>{item}</span>
            </div>);})}</div>))}
          </Box>}
        </div>
      );})}
      <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginTop:18,marginBottom:8}}>Global tax comparison <Chip color={C.bl}>Your income: ${$$(totalIncome)}</Chip></div>

      {/* Compute all country taxes */}
      {(()=>{
        const usTax = (function(){ const s=calcSt(profile.state,totalIncome,0); const f=calcFed(totalIncome,0,0,profile.filing,s.tax); return f.tot+s.tax; })();
        const countries = INTL.map(j => {
          const tax = j.home ? usTax : Math.round(j.inc(totalIncome));
          const effR = totalIncome>0 ? tax/totalIncome : 0;
          const savings = usTax - tax;
          const colAdj = j.col ? Math.round(totalIncome * j.col) : totalIncome;
          const afterTaxCOL = j.home ? totalIncome - tax : colAdj - tax;
          return {...j, tax, effR, savings, colAdj, afterTaxCOL };
        });

        const best = countries.filter(c=>!c.home).sort((a,b)=>a.tax-b.tax)[0];
        const bestCOL = countries.filter(c=>!c.home).sort((a,b)=>b.afterTaxCOL-a.afterTaxCOL)[0];
        const bestCrypto = countries.filter(c=>!c.home&&c.crypto.includes("0%")).sort((a,b)=>a.tax-b.tax)[0];

        let filtered = countries;
        if (intlFilter==="nomad") filtered = countries.filter(c=>c.nomad||c.home);
        if (intlFilter==="crypto0") filtered = countries.filter(c=>c.crypto.includes("0%")||c.home);
        
        if (intlSort==="tax") filtered.sort((a,b) => a.home?-1:b.home?1:a.tax-b.tax);
        if (intlSort==="savings") filtered.sort((a,b) => a.home?-1:b.home?1:b.savings-a.savings);
        if (intlSort==="col") filtered.sort((a,b) => a.home?-1:b.home?1:b.afterTaxCOL-a.afterTaxCOL);

        return <>
          {/* Best-for-you summary */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {best&&<Box style={{padding:12,textAlign:"center",borderLeft:`3px solid ${C.em}`}}>
              <div style={{color:C.t4,fontSize:9.5,fontWeight:600,textTransform:"uppercase"}}>Lowest tax</div>
              <div style={{fontSize:16,marginTop:2}}>{best.f}</div>
              <div style={{color:C.t1,fontSize:12,fontWeight:600}}>{best.n}</div>
              <div style={{color:C.em,fontSize:13,fontWeight:700,fontFamily:fm,marginTop:2}}>${$$(best.tax)}</div>
              <div style={{color:C.em,fontSize:10}}>Save ${$$(best.savings)}/yr</div>
            </Box>}
            {bestCOL&&<Box style={{padding:12,textAlign:"center",borderLeft:`3px solid ${C.yl}`}}>
              <div style={{color:C.t4,fontSize:9.5,fontWeight:600,textTransform:"uppercase"}}>Best purchasing power</div>
              <div style={{fontSize:16,marginTop:2}}>{bestCOL.f}</div>
              <div style={{color:C.t1,fontSize:12,fontWeight:600}}>{bestCOL.n}</div>
              <div style={{color:C.yl,fontSize:13,fontWeight:700,fontFamily:fm,marginTop:2}}>${$$(bestCOL.afterTaxCOL)}</div>
              <div style={{color:C.yl,fontSize:10}}>after tax + COL adj.</div>
            </Box>}
            {bestCrypto&&<Box style={{padding:12,textAlign:"center",borderLeft:`3px solid ${C.pu}`}}>
              <div style={{color:C.t4,fontSize:9.5,fontWeight:600,textTransform:"uppercase"}}>Best for crypto</div>
              <div style={{fontSize:16,marginTop:2}}>{bestCrypto.f}</div>
              <div style={{color:C.t1,fontSize:12,fontWeight:600}}>{bestCrypto.n}</div>
              <div style={{color:C.pu,fontSize:11,fontWeight:600,marginTop:2}}>0% crypto + ${$$(bestCrypto.tax)} income</div>
            </Box>}
          </div>

          {/* Filter + sort controls */}
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
            {[["all","All"],["nomad","🌏 Nomad-friendly"],["crypto0","₿ 0% crypto"]].map(([id,l])=>(
              <button key={id} onClick={()=>setIntlFilter(id)} style={{padding:"5px 12px",borderRadius:7,border:"none",background:intlFilter===id?C.em:"transparent",color:intlFilter===id?C.bg:C.t3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:ff}}>{l}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            <span style={{color:C.t4,fontSize:10,lineHeight:"26px"}}>Sort:</span>
            {[["tax","Lowest tax"],["savings","Most savings"],["col","Purchasing power"]].map(([id,l])=>(
              <button key={id} onClick={()=>setIntlSort(id)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${intlSort===id?C.em:C.bd}`,background:"transparent",color:intlSort===id?C.em:C.t3,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:ff}}>{l}</button>
            ))}
          </div>

          {/* Country list */}
          <Box style={{padding:0}}>{filtered.map((j,i)=>{
            return (<div key={i} style={{padding:"12px 14px",borderBottom:i<filtered.length-1?`1px solid ${C.bd}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{j.f}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{color:C.t1,fontSize:12.5,fontWeight:600}}>{j.n}</span>
                    {j.home && <Chip color={C.em}>YOU</Chip>}
                    {!j.home && j.savings > 1000 && <Chip color={C.em}>Save ${$$(j.savings)}</Chip>}
                    {!j.home && j.savings < -1000 && <Chip color={C.rd}>+${$$(-j.savings)}</Chip>}
                    {j.nomad && !j.home && <Chip color={C.bl}>Nomad</Chip>}
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{color:C.t4,fontSize:10}}>Cap gains: <strong style={{color:C.t3}}>{j.cg}</strong></span>
                    <span style={{color:C.t4,fontSize:10}}>Crypto: <strong style={{color:j.crypto.includes("0%")?C.em:C.t3}}>{j.crypto}</strong></span>
                    {j.col && !j.home && <span style={{color:C.t4,fontSize:10}}>COL: <strong style={{color:j.col<0.6?C.em:j.col<0.9?C.yl:C.t3}}>{j.col<0.5?"Very low":j.col<0.7?"Low":j.col<0.9?"Moderate":j.col<1.1?"Similar":"High"}</strong></span>}
                  </div>
                  {j.note && <div style={{color:C.t4,fontSize:10,marginTop:2,fontStyle:"italic"}}>{j.note}</div>}
                </div>
                <div style={{textAlign:"right",minWidth:70}}>
                  <div style={{color:j.home?C.t1:j.tax<usTax?C.em:C.t1,fontSize:14,fontWeight:700,fontFamily:fm}}>${$$(j.tax)}</div>
                  <div style={{color:C.t4,fontSize:10}}>{pct(j.effR)} eff.</div>
                </div>
              </div>
            </div>);
          })}</Box>

          <div style={{color:C.t4,fontSize:10,marginTop:8,lineHeight:1.5}}>Income tax calculated on ${$$(totalIncome)} income. Tax formulas are simplified estimates — actual obligations depend on residency, treaties, and local rules. COL index: 1.0 = US average. Always consult a cross-border tax specialist.</div>
        </>;
      })()}
    </div>
  );
}

// ═══════════════════════════════════════════
// AI ADVISOR (3 free Q/mo, unlimited Pro)
// ═══════════════════════════════════════════
function Ask({ profile, data, isPro, onUpgrade, isMobile }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [ld, setLd] = useState(false);
  const [mode, setMode] = useState("r");
  const [qUsed, setQUsed] = useState(0);
  const [errMsg, setErrMsg] = useState("");
  const ref = useRef(null);
  const FREE_LIMIT = 3;
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[msgs,ld]);

  // Monthly reset logic — track usage by month
  useEffect(()=>{
    try {
      const raw = localStorage.getItem("taxiq-ai-usage");
      if (raw) {
        const usage = JSON.parse(raw);
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
        if (usage.month === currentMonth) {
          setQUsed(usage.count);
        } else {
          // New month — reset
          localStorage.setItem("taxiq-ai-usage", JSON.stringify({ month: currentMonth, count: 0 }));
          setQUsed(0);
        }
      }
    } catch {}
  }, []);

  const incrementUsage = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    const newCount = qUsed + 1;
    setQUsed(newCount);
    try { localStorage.setItem("taxiq-ai-usage", JSON.stringify({ month: currentMonth, count: newCount })); } catch {}
  };

  // ═══ DEEP CONTEXT ENGINE ═══
  // Mirror the same calculations as Dashboard, SaveMoney, Compliance
  const totalIncome = profile.salary + profile.freelance + profile.rentalNet + profile.dividends;
  const absDed = profile.retirement401k + profile.retirementIRA;
  const adjInc = Math.max(totalIncome - absDed, 0);
  const stTax = calcSt(profile.state, adjInc, Math.max(data.ltGains,0)+Math.max(data.stGains,0));
  const fed = calcFed(adjInc, Math.max(data.ltGains,0), Math.max(data.stGains,0), profile.filing, stTax.tax);
  const seTax = profile.freelance > 0 ? Math.round(profile.freelance*0.9235*0.153) : 0;
  const totalTax = fed.tot + stTax.tax + seTax;
  const takeHome = Math.max(totalIncome - totalTax, 0);
  const effRate = totalIncome > 0 ? totalTax / totalIncome : 0;
  const sd = STD_DED[profile.filing] || 14600;

  // Bracket position
  const bks = FED_BRACKETS[profile.filing] || FED_BRACKETS.single;
  const taxableOrd = Math.max(adjInc - sd, 0);
  let bFloor=0,bCeil=0,curRate=0,cumul=0;
  for(const[width,rate]of bks){if(taxableOrd<=cumul+width){bFloor=cumul;bCeil=cumul+width;curRate=rate;break;}cumul+=width;}
  const bPct = bCeil>bFloor ? Math.round(((taxableOrd-bFloor)/(bCeil-bFloor))*100) : 0;

  // Deduction gaps
  const max401k=23000, maxIRA=7000, maxHSA=profile.filing==="mfj"?8300:4150;
  const qbiAmount = profile.freelance>0 ? Math.round(profile.freelance*0.2) : 0;
  const halfSE = profile.freelance>0 ? Math.round(profile.freelance*0.9235*0.153/2) : 0;
  const maxDed = max401k + maxIRA + maxHSA + qbiAmount;
  const usedDed = profile.retirement401k + profile.retirementIRA;
  const efficiency = maxDed>0 ? Math.min(Math.round((usedDed/maxDed)*100),100) : 0;
  const missedSave = Math.round((maxDed-usedDed)*fed.marg);
  const gap401k = Math.max(max401k - profile.retirement401k, 0);
  const gapIRA = Math.max(maxIRA - profile.retirementIRA, 0);

  // SALT analysis
  const saltOver = stTax.tax > SALT_CAP ? stTax.tax - SALT_CAP : 0;

  // Compliance
  const needsFATCA = profile.foreign;
  const needsFBAR = profile.foreign;
  const needsEstimated = profile.freelance>0||profile.rentalNet>0||profile.dividends>10000;

  // State comparison — best zero-tax state savings
  const zeroTaxSavings = stTax.tax > 0 ? stTax.tax : 0;

  // Build the deep context string
  const deepCtx = [
    `=== USER TAX PROFILE ===`,
    `Filing: ${profile.filing==="mfj"?"Married Filing Jointly":profile.filing==="mfs"?"Married Filing Separately":profile.filing==="hoh"?"Head of Household":"Single"}`,
    `State: ${ST[profile.state]?.n} (${ST[profile.state]?.t==="0"?"no income tax":stTax.tax>0?"$"+$$(stTax.tax)+" state tax":"$0 state tax"})`,
    ``,
    `=== INCOME ===`,
    `Total income: $${$$(totalIncome)}`,
    profile.salary>0 && `  W-2 salary: $${$$(profile.salary)}`,
    profile.freelance>0 && `  Freelance/1099: $${$$(profile.freelance)} (SE tax: $${$$(seTax)})`,
    profile.rentalNet>0 && `  Rental income (net): $${$$(profile.rentalNet)}`,
    profile.rentalNet<0 && `  Rental loss: -$${$$(Math.abs(profile.rentalNet))}`,
    profile.dividends>0 && `  Dividends: $${$$(profile.dividends)}`,
    ``,
    `=== TAX CALCULATION (computed by TaxIQ) ===`,
    `Total tax liability: $${$$(totalTax)}`,
    `  Federal income tax: $${$$(fed.inc)}`,
    fed.lt>0 && `  Capital gains tax: $${$$(fed.lt)}`,
    stTax.tax>0 && `  State tax (${ST[profile.state]?.n}): $${$$(stTax.tax)}`,
    seTax>0 && `  Self-employment tax: $${$$(seTax)}`,
    fed.niit>0 && `  NIIT (3.8%): $${$$(fed.niit)}`,
    `Effective tax rate: ${pct(effRate)}`,
    `Marginal rate: ${pct(fed.marg)} (federal)`,
    `Take-home pay: $${$$(takeHome)}`,
    `Monthly tax burden: $${$$(Math.round(totalTax/12))}`,
    ``,
    `=== BRACKET POSITION ===`,
    `Currently in the ${pct(curRate)} bracket`,
    `${bPct}% through this bracket ($${$$(taxableOrd)} taxable / $${$$(bCeil)} ceiling)`,
    bCeil-taxableOrd<15000 && `⚠ Only $${$$(bCeil-taxableOrd)} from the next bracket — deductions are high-leverage here`,
    `Standard deduction: $${$$(sd)}`,
    ``,
    `=== DEDUCTION ANALYSIS ===`,
    `Tax efficiency score: ${efficiency}% (using $${$$(usedDed)} of $${$$(maxDed)} available deductions)`,
    missedSave>200 && `💰 Missed savings: $${$$(missedSave)} — this is how much less tax they'd pay using all available deductions`,
    `Current 401(k): $${$$(profile.retirement401k)} / $${$$(max401k)} max${gap401k>0?` → gap of $${$$(gap401k)} (saves $${$$(Math.round(gap401k*fed.marg))})`:" ✓ maxed"}`,
    `Current IRA: $${$$(profile.retirementIRA)} / $${$$(maxIRA)} max${gapIRA>0?` → gap of $${$$(gapIRA)} (saves $${$$(Math.round(gapIRA*fed.marg))})`:" ✓ maxed"}`,
    `HSA: not tracked yet → potential $${$$(maxHSA)} deduction (saves $${$$(Math.round(maxHSA*fed.marg))})`,
    qbiAmount>0 && `QBI deduction (§199A): $${$$(qbiAmount)} automatic (saves $${$$(Math.round(qbiAmount*fed.marg))})`,
    halfSE>0 && `½ SE tax deduction: $${$$(halfSE)} automatic (saves $${$$(Math.round(halfSE*fed.marg))})`,
    saltOver>0 && `⚠ SALT cap exceeded by $${$$(saltOver)} — $${$$(saltOver)} in state tax is NOT deductible`,
    ``,
    `=== COMPLIANCE ===`,
    needsFATCA && `FATCA (Form 8938): APPLIES — user has foreign financial accounts`,
    needsFBAR && `FBAR (FinCEN 114): APPLIES — user has foreign accounts`,
    needsEstimated && `Estimated tax payments: APPLIES — has non-withheld income`,
    !needsFATCA && `FATCA/FBAR: Does not apply (no foreign accounts)`,
    !needsEstimated && `Estimated payments: Likely not required`,
    profile.freelance>0 && `Schedule C: Required for freelance income`,
    profile.rentalNet!==0 && `Schedule E: Required for rental income`,
    ``,
    `=== STATE ANALYSIS ===`,
    zeroTaxSavings>0 && `Moving to a zero-income-tax state would save $${$$(zeroTaxSavings)}/year`,
    zeroTaxSavings===0 && `Already in a zero-income-tax state`,
    ``,
    `=== PORTFOLIO ===`,
    data.tv>0 ? `Portfolio value: $${$$(data.tv)}` : `No portfolio data connected`,
    data.ltGains>0 && `Long-term gains: $${$$(data.ltGains)}`,
    data.stGains>0 && `Short-term gains: $${$$(data.stGains)}`,
  ].filter(Boolean).join("\n");

  const SYS = mode==="a"
    ?`You are TaxIQ, an AI tax advisor embedded in a tax calculation app. You have access to this user's complete tax analysis, pre-computed by TaxIQ's engine. Use these SPECIFIC numbers in your answers — never guess or approximate when the data is provided.\n\n${deepCtx}\n\n## INSTRUCTIONS\n- Lead with the most impactful finding (biggest savings opportunity, biggest risk)\n- Use exact dollar amounts from the analysis above — this is what makes you different from a generic AI\n- Rate recommendations: 🟢 LOW risk (standard, well-established) / 🟡 MODERATE risk (depends on situation) / 🔴 HIGH risk (aggressive, needs CPA)\n- Give specific action items, not generic advice\n- When relevant, reference which TaxIQ tab has more detail (Save Money, Plan Ahead, Compliance)\n- Always note: "This is informational only — not professional tax advice. Consult a CPA for implementation."`
    :`You are TaxIQ, an AI tax research assistant embedded in a tax calculation app. You have the user's tax profile for context.\n\n${deepCtx}\n\n## INSTRUCTIONS\n- Answer tax questions in plain English\n- Cite IRC sections when helpful\n- If the question relates to something in their profile, reference their specific numbers\n- Cover: federal, 50 states, capital gains, SE tax, retirement, deductions, crypto, FATCA, CRS, FBAR\n- Always note: "This is informational only — not professional tax advice."`;


  const send = async (text) => {
    if (!text.trim()||ld) return;
    if (!isPro && qUsed >= FREE_LIMIT) { onUpgrade(); return; }
    setErrMsg("");
    const um = {role:"user",content:text.trim()};
    const nm = [...msgs,um]; setMsgs(nm); setInput(""); setLd(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYS,
          messages: nm.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      const d = await res.json();
      if (!d.text || d.text.trim().length === 0) throw new Error("Empty response from AI");
      setMsgs([...nm, { role: "assistant", content: d.text }]);
      if (!isPro) incrementUsage();
    } catch (e) {
      const userMsg = e.message.includes("Failed to fetch") || e.message.includes("NetworkError")
        ? "Network error — check your connection and try again."
        : e.message.includes("AI service not configured")
        ? "AI service is being set up. Please try again shortly."
        : `Something went wrong: ${e.message}`;
      setErrMsg(userMsg);
      setMsgs([...nm, { role: "assistant", content: `⚠️ ${userMsg}` }]);
    } finally { setLd(false); }
  };

  const prompts = mode==="a"
    ?[
      "What's the single biggest thing I should do to lower my tax bill?",
      missedSave>500 ? `How do I save that $${$$(missedSave)} in missed deductions?` : "Should I form an S-Corp?",
      profile.freelance>0 ? "Am I paying too much in self-employment tax?" : "Does a Roth conversion make sense for me?",
      efficiency<50 ? "Help me build a plan to maximize my deductions" : "What tax strategies should I consider for next year?",
    ]
    :[
      "What's the QBI deduction and do I qualify?",
      "How are staking rewards taxed?",
      "Explain the wash sale rule for crypto",
      "What forms do I need to file?",
    ];
  const atLimit = !isPro && qUsed >= FREE_LIMIT;
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:isMobile?"0 16px":"0 28px"}}>
      <div style={{padding:"14px 0",display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
        <Tabs items={[["r","🔍 Research"],["a","⚖️ Advice"]]} active={mode} onChange={m=>{setMode(m);setMsgs([]);setErrMsg("");}}/>
        {!isPro && <span style={{marginLeft:"auto",color:qUsed>=FREE_LIMIT?C.rd:C.t4,fontSize:11,fontFamily:fm}}>{Math.max(FREE_LIMIT-qUsed,0)}/{FREE_LIMIT} free<span style={{color:C.t4,fontSize:9.5,marginLeft:4}}>resets in {daysLeft}d</span></span>}
        {isPro && <ProBadge isPro={true}/>}
        {msgs.length>0&&<button onClick={()=>{setMsgs([]);setErrMsg("");}} style={{marginLeft:isPro?"auto":8,background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"5px 12px",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:ff}}>Clear</button>}
      </div>
      {mode==="a"&&msgs.length===0&&isPro&&<div style={{background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.15)`,borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:12,color:C.em}}>💡 Using your profile for personalized advice. Your marginal rate, income sources, and state are included as context.</div>}
      <div style={{flex:1,overflowY:"auto"}}>
        {msgs.length===0&&!atLimit&&<div style={{textAlign:"center",padding:isMobile?"24px 0":"32px 0",maxWidth:400,margin:"0 auto"}}><div style={{fontSize:30,marginBottom:6}}>{mode==="a"?"⚖️":"🔍"}</div><div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:6}}>{mode==="a"?"Get tax advice":"Research tax rules"}</div><div style={{color:C.t3,fontSize:12,marginBottom:14}}>{mode==="a"?"Personalized recommendations based on your tax profile":"Ask about any tax topic — federal, state, crypto, international"}</div><div style={{display:"flex",flexDirection:"column",gap:5}}>{prompts.map((q,i)=><Box key={i} onClick={()=>send(q)} style={{padding:11,cursor:"pointer",textAlign:"left"}}><span style={{color:C.t2,fontSize:12}}>{q}</span></Box>)}</div></div>}
        {atLimit&&msgs.length===0&&<div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:36,marginBottom:12}}>🔒</div><div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:8}}>You've used your {FREE_LIMIT} free questions this month</div><div style={{color:C.t3,fontSize:13,marginBottom:6}}>Upgrade to Pro for unlimited AI tax advice, personalized to your profile.</div><div style={{color:C.t4,fontSize:12,marginBottom:20}}>Or wait {daysLeft} days — your free questions reset monthly.</div><button onClick={onUpgrade} style={{padding:"12px 28px",borderRadius:10,border:"none",background:C.em,color:C.bg,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:ff}}>Upgrade to Pro — $79/yr</button></div>}
        {msgs.map((m,i)=>(<div key={i} style={{marginBottom:11,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:m.role==="user"?(isMobile?"85%":"80%"):"95%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.em:C.s2,border:m.role==="user"?"none":`1px solid ${C.bd}`}}>{m.role==="user"?<p style={{color:C.bg,fontSize:13,lineHeight:1.6,margin:0,fontWeight:500}}>{m.content}</p>:<div style={{fontSize:13,lineHeight:1.65}}><Md text={m.content}/></div>}</div></div>))}
        {ld&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:C.s2,border:`1px solid ${C.bd}`}}><div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:4,background:C.em,animation:`dt 1.2s ease-in-out ${i*.15}s infinite`}}/>)}<span style={{color:C.t4,fontSize:11,marginLeft:6}}>Thinking...</span><style>{`@keyframes dt{0%,60%,100%{opacity:.3}30%{opacity:1}}`}</style></div></div></div>}
        <div ref={ref}/>
      </div>
      <div style={{padding:isMobile?"10px 0 20px":"10px 0 14px"}}>
        <div style={{display:"flex",gap:8,background:C.s2,border:`1px solid ${atLimit?C.rd+"40":C.bd}`,borderRadius:12,padding:"9px 12px",opacity:atLimit?0.5:1}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send(input);}}} placeholder={atLimit?"Upgrade to continue asking...":"Ask a tax question..."} disabled={atLimit||ld} style={{flex:1,background:"none",border:"none",outline:"none",color:C.t1,fontSize:13,fontFamily:ff}}/>
          <button onClick={()=>atLimit?onUpgrade():send(input)} disabled={!atLimit&&(!input.trim()||ld)} style={{width:36,height:36,borderRadius:8,border:"none",background:atLimit?C.em:(input.trim()&&!ld?C.em:C.s3),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{atLimit?<span style={{fontSize:12}}>🔒</span>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim()&&!ld?C.bg:C.t4} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}</button>
        </div>
        <div style={{textAlign:"center",marginTop:6}}><span style={{color:C.t4,fontSize:9.5}}>TaxIQ AI is for informational purposes only — not tax, legal, or financial advice.</span></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ONBOARDING WIZARD
// ═══════════════════════════════════════════
function Onboarding({ onComplete }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [p, setP] = useState({
    filing: "single", state: "TX", salary: 0, freelance: 0, rentalNet: 0, dividends: 0,
    retirement401k: 0, retirementIRA: 0, charitable: 0, homeOffice: 0, healthInsurance: 0, foreign: false,
    hasFreelance: false, hasRental: false, hasDividends: false, hasInvestments: true,
  });
  const u = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const [animating, setAnimating] = useState(false);
  const goNext = () => { setAnimating(true); setTimeout(() => { setStep(s => s + 1); setAnimating(false); }, 200); };
  const goBack = () => { setAnimating(true); setTimeout(() => { setStep(s => s - 1); setAnimating(false); }, 200); };

  const finish = () => {
    const profile = {
      filing: p.filing, state: p.state, salary: p.salary,
      freelance: p.hasFreelance ? p.freelance : 0,
      rentalNet: p.hasRental ? p.rentalNet : 0,
      dividends: p.hasDividends ? p.dividends : 0,
      retirement401k: p.retirement401k, retirementIRA: p.retirementIRA,
      charitable: p.charitable, homeOffice: p.homeOffice, healthInsurance: 0,
      foreign: p.foreign,
    };
    try { localStorage.setItem("taxiq-profile", JSON.stringify(profile)); localStorage.setItem("taxiq-onboarded", "true"); } catch {}
    onComplete(profile);
  };

  const stepCount = 4;
  const progress = ((step + 1) / stepCount) * 100;

  const btnPrimary = { padding: "13px 28px", borderRadius: 10, border: "none", background: C.em, color: C.bg, fontSize: 14, fontWeight: 700, fontFamily: ff, cursor: "pointer", transition: "all 0.2s" };
  const btnGhost = { padding: "13px 28px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.t2, fontSize: 14, fontWeight: 600, fontFamily: ff, cursor: "pointer" };
  const cardStyle = (active) => ({ padding: "16px 20px", borderRadius: 12, border: `1px solid ${active ? C.em : C.bd}`, background: active ? `${C.emx}0.06)` : C.s2, cursor: "pointer", transition: "all 0.15s", textAlign: "left" });

  return (
    <div style={{ width: "100vw", height: "100vh", background: C.bg, fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Background ambient */}
      <div style={{ position: "absolute", top: "20%", left: "30%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.emx}0.04) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.bl}08 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative", width: isMobile?"100%":520, maxHeight: "90vh", overflowY: "auto", opacity: animating ? 0 : 1, transform: animating ? "translateY(10px)" : "translateY(0)", transition: "all 0.2s ease", padding: isMobile?"0 20px":"0" }}>

        {/* Progress bar */}
        {step > 0 && <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: C.t4, fontSize: 11, fontWeight: 600 }}>Step {step} of {stepCount - 1}</span>
            <span style={{ color: C.t4, fontSize: 11 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 3, background: C.s3, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.em, borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>}

        {/* STEP 0: Welcome */}
        {step === 0 && <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${C.em}, ${C.emd})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: C.bg, margin: "0 auto 20px" }}>T</div>
          <h1 style={{ color: C.t1, fontSize: 28, fontWeight: 700, margin: "0 0 8px", lineHeight: 1.3 }}>Know what you owe.<br /><span style={{ color: C.em }}>Keep what you earned.</span></h1>
          <p style={{ color: C.t3, fontSize: 14.5, lineHeight: 1.6, maxWidth: 400, margin: "0 auto 32px" }}>TaxIQ calculates your complete tax picture across every income source — then finds every legal way to lower it.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 36 }}>
            {[["⚡", "30 seconds", "to your total tax number"], ["🌎", "50 states", "with real bracket data"], ["🤖", "AI advisor", "personalized to you"]].map(([icon, title, desc], i) => (
              <div key={i} style={{ background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                <div style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>{title}</div>
                <div style={{ color: C.t4, fontSize: 11, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
          <button onClick={goNext} style={{ ...btnPrimary, width: "100%", padding: "15px", fontSize: 15 }}>Get Started — It's Free</button>
          <p style={{ color: C.t4, fontSize: 11, marginTop: 12 }}>Takes about 30 seconds. No signup required.</p>
        </div>}

        {/* STEP 1: Filing Status & State */}
        {step === 1 && <div>
          <h2 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Filing information</h2>
          <p style={{ color: C.t3, fontSize: 13, marginBottom: 24 }}>This determines your tax brackets and standard deduction.</p>

          <div style={{ color: C.t4, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Filing Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
            {[["single", "Single", "Unmarried individual"], ["mfj", "Married Filing Jointly", "Combined return with spouse"], ["mfs", "Married Filing Separately", "Separate return from spouse"], ["hoh", "Head of Household", "Unmarried with dependent"]].map(([val, title, desc]) => (
              <div key={val} onClick={() => u("filing", val)} style={cardStyle(p.filing === val)}>
                <div style={{ color: p.filing === val ? C.em : C.t1, fontSize: 13, fontWeight: 600 }}>{title}</div>
                <div style={{ color: C.t4, fontSize: 11, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ color: C.t4, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>State of Residence</div>
          <select value={p.state} onChange={e => u("state", e.target.value)} style={{ width: "100%", background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "12px 14px", color: C.t1, fontSize: 14, fontFamily: ff, outline: "none", marginBottom: 28 }}>
            {Object.entries(ST).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([k, v]) => <option key={k} value={k}>{v.n}{v.t === "0" ? " ★ No income tax" : ""}</option>)}
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={goBack} style={btnGhost}>Back</button>
            <button onClick={goNext} style={{ ...btnPrimary, flex: 1 }}>Continue</button>
          </div>
        </div>}

        {/* STEP 2: Income Sources */}
        {step === 2 && <div>
          <h2 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Your income</h2>
          <p style={{ color: C.t3, fontSize: 13, marginBottom: 24 }}>Add all your income sources for an accurate calculation.</p>

          <div style={{ color: C.t4, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Primary Income</div>
          <div style={{ display: "flex", alignItems: "center", background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
            <span style={{ color: C.t4, fontSize: 14, marginRight: 6 }}>$</span>
            <input type="number" value={p.salary || ""} onChange={e => u("salary", +e.target.value || 0)} placeholder="W-2 salary or primary income" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontSize: 16, fontFamily: fm }} />
          </div>

          <div style={{ color: C.t4, fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Additional Income <Chip color={C.t4}>Select all that apply</Chip></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[
              ["hasFreelance", "💼", "Freelance / 1099", "freelance"],
              ["hasRental", "🏠", "Rental Property", "rentalNet"],
              ["hasDividends", "📈", "Dividends", "dividends"],
            ].map(([flag, icon, label, field]) => (
              <div key={flag}>
                <div onClick={() => u(flag, !p[flag])} style={{ ...cardStyle(p[flag]), display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ color: p[flag] ? C.t1 : C.t3, fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
                  <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${p[flag] ? C.em : C.t4}`, background: p[flag] ? `${C.emx}0.15)` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {p[flag] && <span style={{ color: C.em, fontSize: 11 }}>✓</span>}
                  </div>
                </div>
                {p[flag] && <div style={{ display: "flex", alignItems: "center", background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "8px 12px", marginTop: 6, marginLeft: 36 }}>
                  <span style={{ color: C.t4, fontSize: 13, marginRight: 4 }}>$</span>
                  <input type="number" value={p[field] || ""} onChange={e => u(field, +e.target.value || 0)} placeholder="Annual amount" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontSize: 14, fontFamily: fm }} />
                </div>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={goBack} style={btnGhost}>Back</button>
            <button onClick={goNext} style={{ ...btnPrimary, flex: 1 }}>Continue</button>
          </div>
        </div>}

        {/* STEP 3: Quick Options + Launch */}
        {step === 3 && <div>
          <h2 style={{ color: C.t1, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Almost done</h2>
          <p style={{ color: C.t3, fontSize: 13, marginBottom: 24 }}>A few optional details to sharpen your results.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>401(k) Contributions</div>
                <div style={{ display: "flex", alignItems: "center", background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "9px 12px" }}>
                  <span style={{ color: C.t4, fontSize: 12, marginRight: 4 }}>$</span>
                  <input type="number" value={p.retirement401k || ""} onChange={e => u("retirement401k", +e.target.value || 0)} placeholder="0" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontSize: 13, fontFamily: fm, width: "100%" }} />
                </div>
              </div>
              <div>
                <div style={{ color: C.t4, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>IRA Contributions</div>
                <div style={{ display: "flex", alignItems: "center", background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 8, padding: "9px 12px" }}>
                  <span style={{ color: C.t4, fontSize: 12, marginRight: 4 }}>$</span>
                  <input type="number" value={p.retirementIRA || ""} onChange={e => u("retirementIRA", +e.target.value || 0)} placeholder="0" style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.t1, fontSize: 13, fontFamily: fm, width: "100%" }} />
                </div>
              </div>
            </div>

            <div onClick={() => u("foreign", !p.foreign)} style={{ ...cardStyle(p.foreign), display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 18 }}>🌍</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: p.foreign ? C.t1 : C.t3, fontSize: 13, fontWeight: 600 }}>Foreign financial accounts</div>
                <div style={{ color: C.t4, fontSize: 11, marginTop: 1 }}>Bank or brokerage accounts outside the US</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${p.foreign ? C.em : C.t4}`, background: p.foreign ? `${C.emx}0.15)` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.foreign && <span style={{ color: C.em, fontSize: 11 }}>✓</span>}
              </div>
            </div>
          </div>

          {/* Preview teaser */}
          {p.salary > 0 && (() => {
            const inc = p.salary + (p.hasFreelance ? p.freelance : 0) + (p.hasRental ? p.rentalNet : 0) + (p.hasDividends ? p.dividends : 0);
            const stT = calcSt(p.state, inc, 0);
            const fedT = calcFed(inc, 0, 0, p.filing, stT.tax);
            const seT = p.hasFreelance ? Math.round(p.freelance * 0.9235 * 0.153) : 0;
            const total = fedT.tot + stT.tax + seT;
            return (
              <div style={{ background: C.s2, border: `1px solid ${C.emx}0.15)`, borderRadius: 12, padding: "18px 22px", marginBottom: 24, textAlign: "center" }}>
                <div style={{ color: C.t3, fontSize: 11, marginBottom: 4 }}>Estimated tax liability (before investment gains)</div>
                <div style={{ color: C.t1, fontSize: 36, fontWeight: 700, fontFamily: fm }}>${$$(total)}</div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                  <span style={{ color: C.t4, fontSize: 11 }}>Federal <strong style={{ color: C.t2, fontFamily: fm }}>${$$(fedT.tot)}</strong></span>
                  <span style={{ color: C.t4, fontSize: 11 }}>{ST[p.state]?.n} <strong style={{ color: stT.tax > 0 ? C.yl : C.em, fontFamily: fm }}>${$$(stT.tax)}</strong></span>
                  {seT > 0 && <span style={{ color: C.t4, fontSize: 11 }}>SE <strong style={{ color: C.pu, fontFamily: fm }}>${$$(seT)}</strong></span>}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={goBack} style={btnGhost}>Back</button>
            <button onClick={finish} style={{ ...btnPrimary, flex: 1, fontSize: 15, padding: "15px" }}>See My Full Tax Picture →</button>
          </div>
          <p style={{ color: C.t4, fontSize: 11, textAlign: "center", marginTop: 12 }}>You can always edit your profile later.</p>
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function TaxIQ() {
  const [tab, setTab] = useState("dash");
  const [sbOpen, setSbOpen] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [costMethod, setCostMethod] = useState("fifo");
  const isMobile = useIsMobile();

  // Onboarding state
  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem("taxiq-onboarded") === "true"; } catch { return false; }
  });

  // Tier state — check URL for ?upgraded=true (Stripe redirect)
  const [isPro, setIsPro] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        if (u.searchParams.get("upgraded") === "true") { try { localStorage.setItem("taxiq-pro","true"); } catch {} return true; }
        return localStorage.getItem("taxiq-pro") === "true";
      }
    } catch {}
    return false;
  });

  const [profile, setProfile] = useState(() => {
    const defaults = {
      salary: 0, freelance: 0, rentalNet: 0, dividends: 0,
      state: "TX", filing: "single", foreign: false,
      retirement401k: 0, retirementIRA: 0, homeOffice: 0, healthInsurance: 0, charitable: 0,
    };
    try {
      const saved = localStorage.getItem("taxiq-profile");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {}
    return defaults;
  });
  // Save profile to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem("taxiq-profile", JSON.stringify(profile)); } catch {}
  }, [profile]);
  const data = usePortfolio(costMethod);
  const nav = [{id:"dash",icon:"⚡",label:"Dashboard"},{id:"save",icon:"💰",label:"Save Money"},{id:"plan",icon:"📊",label:"Plan Ahead"},{id:"comply",icon:"📋",label:"Compliance"},{id:"ask",icon:"💬",label:"AI Advisor"}];

  const handleUpgrade = () => {
    if (STRIPE_PAYMENT_LINK.includes("YOUR_PAYMENT_LINK")) {
      // Demo mode: toggle pro
      setIsPro(true);
      setShowUpgrade(false);
      try { localStorage.setItem("taxiq-pro","true"); } catch {}
    } else {
      window.open(STRIPE_PAYMENT_LINK, "_blank");
    }
  };
  const handleRestore = () => {
    try { if (localStorage.getItem("taxiq-pro") === "true") { setIsPro(true); setShowUpgrade(false); } } catch {}
  };
  const openUpgrade = () => setShowUpgrade(true);

  // Show onboarding for new users
  if (!onboarded) {
    return <Onboarding onComplete={(p) => { setProfile(p); setOnboarded(true); }} />;
  }

  return (
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:isMobile?"column":"row",background:C.bg,fontFamily:ff,overflow:"hidden",color:C.t2,fontSize:13}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {showProfile && <ProfileModal profile={profile} setProfile={setProfile} onClose={()=>setShowProfile(false)} isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile}/>}
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} onUpgrade={handleUpgrade} onRestore={handleRestore} isMobile={isMobile}/>}

      {/* Desktop Sidebar */}
      {!isMobile && <div style={{width:sbOpen?192:52,flexShrink:0,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden",background:C.s1}}>
        <div style={{padding:"14px 12px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${C.bd}`,minHeight:50}}>
          <div onClick={()=>setSbOpen(!sbOpen)} style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.em},${C.emd})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.bg,cursor:"pointer",flexShrink:0}}>T</div>
          {sbOpen&&<span style={{color:C.t1,fontSize:15,fontWeight:700,whiteSpace:"nowrap"}}>TaxIQ</span>}
          {sbOpen&&isPro&&<Chip color={C.em} style={{fontSize:9,marginLeft:"auto"}}>PRO</Chip>}
        </div>
        <div style={{flex:1,padding:"10px 6px"}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:sbOpen?"9px 10px":"9px",borderRadius:8,border:"none",cursor:"pointer",background:tab===n.id?`${C.emx}0.12)`:"transparent",color:tab===n.id?C.t1:C.t3,fontSize:12.5,fontWeight:tab===n.id?600:400,fontFamily:ff,transition:"all 0.15s",textAlign:"left",justifyContent:sbOpen?"flex-start":"center",borderLeft:tab===n.id?`2px solid ${C.em}`:"2px solid transparent",marginBottom:2}}>
              <span style={{fontSize:15,flexShrink:0}}>{n.icon}</span>
              {sbOpen&&<span style={{whiteSpace:"nowrap"}}>{n.label}</span>}
            </button>
          ))}
        </div>
        {sbOpen&&<div style={{padding:"8px 14px",borderTop:`1px solid ${C.bd}`,fontSize:10.5}}>
          <Row l="Income" r={`$${$$(profile.salary+profile.freelance+profile.rentalNet+profile.dividends)}`} color={C.em}/><Row l="State" r={ST[profile.state]?.n||""} color={C.t3} sub/>
          <div style={{display:"flex",gap:4,marginTop:6}}>
            <button onClick={()=>setShowProfile(true)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.bd}`,background:"transparent",color:C.t3,cursor:"pointer",fontSize:10,fontFamily:ff}}>✏️ Profile</button>
            {isPro?<select value={costMethod} onChange={e=>setCostMethod(e.target.value)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.bd}`,background:"transparent",color:C.t3,fontSize:10,fontFamily:ff}}><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">HIFO</option></select>
            :<button onClick={openUpgrade} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,cursor:"pointer",fontSize:10,fontFamily:ff,fontWeight:600}}>⚡ Pro</button>}
          </div>
        </div>}
      </div>}

      {/* Mobile Top Bar */}
      {isMobile && <div style={{display:"flex",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s1,flexShrink:0}}>
        <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${C.em},${C.emd})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.bg,flexShrink:0}}>T</div>
        <span style={{color:C.t1,fontSize:15,fontWeight:700,marginLeft:8}}>TaxIQ</span>
        {isPro&&<Chip color={C.em} style={{fontSize:9,marginLeft:6}}>PRO</Chip>}
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setShowProfile(true)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"6px 10px",color:C.t3,cursor:"pointer",fontSize:10,fontFamily:ff}}>✏️ Profile</button>
          {!isPro&&<button onClick={openUpgrade} style={{background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.2)`,borderRadius:8,padding:"6px 10px",color:C.em,cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:ff}}>⚡ Pro</button>}
        </div>
      </div>}

      {/* Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflow:"hidden"}}>
          {tab==="dash"&&<Dashboard data={data} go={setTab} profile={profile} isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile}/>}
          {tab==="save"&&<SaveMoney data={data} profile={profile} isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile}/>}
          {tab==="plan"&&<PlanAhead data={data} profile={profile} isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile}/>}
          {tab==="comply"&&<Compliance isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile} profile={profile}/>}
          {tab==="ask"&&<Ask profile={profile} data={data} isPro={isPro} onUpgrade={openUpgrade} isMobile={isMobile}/>}
        </div>
        {!isMobile && <div style={{padding:"6px 20px",borderTop:`1px solid ${C.bd}`,background:C.s1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:C.t4,fontSize:9.5}}>TaxIQ is for informational purposes only — not tax, legal, or financial advice. Consult a qualified CPA.</span>
          <span style={{color:C.t4,fontSize:9}}>Tax rates: 2025 TY</span>
        </div>}
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <div style={{display:"flex",borderTop:`1px solid ${C.bd}`,background:C.s1,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom, 0px)"}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 0 8px",border:"none",cursor:"pointer",background:"transparent",color:tab===n.id?C.em:C.t4,fontFamily:ff,fontSize:9.5,fontWeight:tab===n.id?600:400,transition:"all 0.15s",borderTop:tab===n.id?`2px solid ${C.em}`:"2px solid transparent"}}>
            <span style={{fontSize:18}}>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </div>}
    </div>
  );
}
