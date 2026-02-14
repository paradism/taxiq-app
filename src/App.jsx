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
  const fmt = s => { const p = []; let r = s, k = 0; while (r.length) { const m = r.match(/\*\*(.+?)\*\*/); if (m) { const i = r.indexOf(m[0]); if (i > 0) p.push(<span key={k++}>{r.slice(0, i)}</span>); p.push(<strong key={k++} style={{ color: C.t1, fontWeight: 600 }}>{m[1]}</strong>); r = r.slice(i + m[0].length); } else { p.push(<span key={k++}>{r}</span>); break; } } return p; };
  return <div>{text.split("\n").map((l, i) => {
    if (l.includes("🟢")||l.includes("🟡")||l.includes("🔴")) { const c = l.includes("🟢")?C.em:l.includes("🟡")?C.yl:C.rd; return <div key={i} style={{ background:`${c}10`,border:`1px solid ${c}20`,borderRadius:10,padding:"10px 14px",margin:"8px 0",color:c,fontSize:13 }}>{fmt(l)}</div>; }
    if (l.startsWith("### ")) return <h3 key={i} style={{ color:C.em,fontSize:11.5,fontWeight:700,margin:"14px 0 5px",textTransform:"uppercase",letterSpacing:"0.05em" }}>{l.slice(4)}</h3>;
    if (l.startsWith("- ")) return <div key={i} style={{ display:"flex",gap:8,margin:"3px 0",paddingLeft:4 }}><span style={{color:C.em}}>•</span><span style={{color:C.t2,lineHeight:1.6}}>{fmt(l.slice(2))}</span></div>;
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
function UpgradeModal({ onClose, onUpgrade, onRestore }) {
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
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
      <div style={{ position: "relative", background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 18, width: 480, maxHeight: "90vh", overflowY: "auto", zIndex: 201 }}>
        {/* Header */}
        <div style={{ padding: "28px 28px 0", textAlign: "center" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: C.t3, fontSize: 18, cursor: "pointer" }}>✕</button>
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
const INTL = [{f:"🇺🇸",n:"United States",lt:"0/15/20%",cr:"Property"},{f:"🇬🇧",n:"United Kingdom",lt:"18/24%",cr:"CGT asset"},{f:"🇩🇪",n:"Germany",lt:"0% >1yr",cr:"Crypto 0% if >1yr"},{f:"🇸🇬",n:"Singapore",lt:"0%",cr:"No CGT"},{f:"🇦🇪",n:"UAE",lt:"0%",cr:"0% personal"},{f:"🇨🇭",n:"Switzerland",lt:"0%",cr:"Wealth tax"},{f:"🇵🇹",n:"Portugal",lt:"0% >365d",cr:"Crypto 0%"},{f:"🇯🇵",n:"Japan",lt:"15-55%",cr:"Misc income"},{f:"🇦🇺",n:"Australia",lt:"~22.5%",cr:"50% disc"},{f:"🇨🇦",n:"Canada",lt:"~25%",cr:"50% inclusion"}];

// ═══════════════════════════════════════════
// PROFILE EDITOR
// ═══════════════════════════════════════════
function ProfileModal({ profile, setProfile, onClose, isPro, onUpgrade }) {
  const [p, setP] = useState({...profile});
  const u = (k,v) => setP(prev => ({...prev, [k]:v}));
  const multiIncome = isPro;
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"relative",background:C.s1,border:`1px solid ${C.bd}`,borderRadius:16,padding:28,width:560,maxHeight:"85vh",overflowY:"auto",zIndex:101}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{color:C.t1,fontSize:18,fontWeight:700}}>Tax Profile</div><button onClick={onClose} style={{background:"none",border:"none",color:C.t3,fontSize:18,cursor:"pointer"}}>✕</button></div>
        <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Filing Information</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <SelectField label="Filing Status" value={p.filing} onChange={v=>u("filing",v)} options={[["single","Single"],["mfj","Married Filing Jointly"],["mfs","Married Filing Separately"],["hoh","Head of Household"]]}/>
          <SelectField label="State" value={p.state} onChange={v=>u("state",v)} options={Object.entries(ST).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=>[k,`${v.n}${v.t==="0"?" ★":""}`])}/>
        </div>
        <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Income Sources</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <InputField label="W-2 Salary" prefix="$" value={p.salary} onChange={v=>u("salary",v)}/>
          {multiIncome ? <>
            <InputField label="Freelance / 1099" prefix="$" value={p.freelance} onChange={v=>u("freelance",v)}/>
            <InputField label="Rental Income (net)" prefix="$" value={p.rentalNet} onChange={v=>u("rentalNet",v)}/>
            <InputField label="Dividends" prefix="$" value={p.dividends} onChange={v=>u("dividends",v)}/>
          </> : <div style={{gridColumn:"1/-1",padding:"12px 16px",background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.12)`,borderRadius:10}}>
            <div style={{color:C.em,fontSize:12,fontWeight:600,marginBottom:4}}>🔒 Multiple income sources require Pro</div>
            <div style={{color:C.t4,fontSize:11.5}}>Add freelance, rental, and dividend income with TaxIQ Pro.</div>
            <button onClick={onUpgrade} style={{marginTop:8,padding:"6px 14px",borderRadius:7,border:"none",background:C.em,color:C.bg,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:ff}}>Upgrade — $79/yr</button>
          </div>}
        </div>
        {multiIncome && <>
          <div style={{color:C.em,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Deductions & Retirement</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <InputField label="401(k)" prefix="$" value={p.retirement401k} onChange={v=>u("retirement401k",v)}/>
            <InputField label="IRA" prefix="$" value={p.retirementIRA} onChange={v=>u("retirementIRA",v)}/>
            <InputField label="Charitable" prefix="$" value={p.charitable} onChange={v=>u("charitable",v)}/>
            <InputField label="Home Office" prefix="$" value={p.homeOffice} onChange={v=>u("homeOffice",v)}/>
          </div>
        </>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${C.bd}`,background:"transparent",color:C.t2,cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:ff}}>Cancel</button>
          <button onClick={()=>{setProfile(p);onClose();}} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:C.em,color:C.bg,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:ff}}>Save & Recalculate</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════
function Dashboard({ data, go, profile, isPro, onUpgrade }) {
  const { pf, ws, tv, netLT, netST, upl } = data;
  const hasPortfolio = Object.keys(pf).length > 0;
  const totalIncome = profile.salary + (isPro ? profile.freelance + profile.rentalNet + profile.dividends : 0);
  const absDed = isPro ? profile.retirement401k + profile.retirementIRA + profile.charitable + profile.homeOffice : 0;
  const adjInc = Math.max(totalIncome - absDed, 0);
  const lt = Math.max(netLT,0), st = Math.max(netST,0);
  const stTax = calcSt(profile.state, adjInc, lt+st);
  const fed = calcFed(adjInc, lt, st, profile.filing, stTax.tax);
  const seTax = isPro ? Math.round(profile.freelance*0.9235*0.153) : 0;
  const totalTax = fed.tot + stTax.tax + seTax;
  const hSave = hasPortfolio ? Object.values(pf).flatMap(d=>d.lots.filter(l=>l.unrealized<0)).reduce((s,l)=>s+Math.abs(l.unrealized),0)*fed.marg : 0;
  const risk = Math.min(Math.max(12+Object.keys(pf).length*3+ws.length*10+(tv>200000?10:0)+(profile.foreign?12:0)+(profile.freelance>50000?8:0),0),100);
  const rCol = risk>=55?C.rd:risk>=30?C.yl:C.em;
  const deadlines = [{d:"2026-04-15",nm:"Federal Return + FBAR"},{d:"2026-06-15",nm:"Q2 Est. Tax Payment"},{d:"2026-09-15",nm:"Q3 Est. Tax Payment"}].map(dl=>({...dl,days:Math.ceil((new Date(dl.d)-new Date())/864e5)}));

  return (
    <div style={{padding:"24px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{textAlign:"center",padding:"18px 0 12px"}}>
        <div style={{color:C.t3,fontSize:12,marginBottom:4}}>Estimated total tax liability <Chip color={C.bl} style={{marginLeft:6}}>{profile.filing==="mfj"?"MFJ":profile.filing==="mfs"?"MFS":profile.filing==="hoh"?"HOH":"Single"}</Chip></div>
        <div style={{fontSize:46,fontWeight:700,fontFamily:fm,color:C.t1,letterSpacing:"-0.03em"}}>${$$(totalTax)}</div>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:6,flexWrap:"wrap"}}>
          <span style={{color:C.t3,fontSize:12}}>Federal <strong style={{color:C.t1,fontFamily:fm}}>${$$(fed.tot)}</strong></span>
          <span style={{color:C.t3,fontSize:12}}>{ST[profile.state]?.n} <strong style={{color:stTax.tax>0?C.yl:C.em,fontFamily:fm}}>${$$(stTax.tax)}</strong></span>
          {seTax>0&&<span style={{color:C.t3,fontSize:12}}>SE <strong style={{color:C.pu,fontFamily:fm}}>${$$(seTax)}</strong></span>}
          {fed.niit>0&&<span style={{color:C.t3,fontSize:12}}>NIIT <strong style={{color:C.rd,fontFamily:fm}}>${$$(fed.niit)}</strong></span>}
        </div>
        {!isPro && <div style={{marginTop:10}}><button onClick={onUpgrade} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:ff}}>⚡ Add freelance, rental & dividend income → Upgrade</button></div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(112px,1fr))",gap:7,marginBottom:14}}>
        {[
          ["Marginal Rate",pct(fed.marg),C.bl],
          ["Eff. Rate",pct(totalTax/(totalIncome+lt+st||1)),C.bl],
          ["Std Deduction",`$${$$(fed.ded)}`,C.em],
          hasPortfolio&&["Portfolio",`$${$$(tv)}`,C.t1],
          hasPortfolio&&["LT Gains",`$${$$(data.ltGains)}`,C.em],
          hasPortfolio&&["Harvestable",isPro?`$${$$(hSave)}`:"🔒",isPro?C.em:C.t4],
        ].filter(Boolean).map(([l,v,c],i)=>(
          <Box key={i} style={{padding:11}} onClick={!isPro&&l==="Harvestable"?onUpgrade:undefined}><div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{l}</div><div style={{color:c,fontSize:15,fontWeight:700,fontFamily:fm}}>{v}</div></Box>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          {/* Insights */}
          {[
            hasPortfolio&&hSave>200&&{icon:"🌾",t:`Save ~$${$$(hSave)} by harvesting losses`,d:isPro?"Unrealized losses across stocks and crypto.":"Upgrade to see which positions to harvest.",tab:"save",col:C.em,pro:true},
            hasPortfolio&&ws.length>0&&{icon:"⚠️",t:`${ws.length} crypto wash sale${ws.length>1?"s":""} detected`,d:isPro?`$${$$(ws.reduce((s,w)=>s+w.disallowed,0))} in deductions at risk.`:"Upgrade to see details.",tab:"save",col:C.rd,pro:true},
            stTax.tax>5000&&{icon:"✈️",t:`${ST[profile.state]?.n}: $${$$(stTax.tax)}/yr in state tax`,d:"Compare zero-tax states to see savings.",tab:"plan",col:C.bl,pro:false},
            profile.foreign&&{icon:"🌍",t:"Foreign account reporting required",d:"FBAR and FATCA filings may apply.",tab:"comply",col:C.yl,pro:false},
            fed.marg>=0.32&&{icon:"💡",t:`You're in the ${pct(fed.marg)} bracket`,d:"Deduction strategies could have outsized impact at this rate.",tab:"save",col:C.pu,pro:false},
          ].filter(Boolean).map((ins,i)=>(
            <Box key={i} onClick={()=>ins.pro&&!isPro?onUpgrade():go(ins.tab)} style={{marginBottom:7,borderLeft:`3px solid ${ins.col}`,cursor:"pointer"}}>
              <div style={{display:"flex",gap:10}}><span style={{fontSize:16}}>{ins.icon}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:C.t1,fontSize:12.5,fontWeight:600,lineHeight:1.4}}>{ins.t}</span>{ins.pro&&!isPro&&<Chip color={C.em} style={{fontSize:8}}>PRO</Chip>}</div><div style={{color:C.t3,fontSize:11.5,marginTop:2}}>{ins.d}</div></div></div>
            </Box>
          ))}
          {/* Holdings or empty state */}
          {hasPortfolio ? ["stock","etf","crypto"].map(type=>{const items=Object.entries(pf).filter(([,d])=>d.type===type);if(!items.length)return null;return<div key={type}><div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginTop:8,marginBottom:5}}>{type==="etf"?"ETFs":type==="stock"?"Stocks":"Digital Assets"}</div>{items.sort((a,b)=>b[1].value-a[1].value).map(([a,d])=>(<Box key={a} style={{marginBottom:5,padding:11}}><div style={{display:"flex",alignItems:"center"}}><div style={{width:28,height:28,borderRadius:7,background:type==="crypto"?`${C.emx}0.08)`:`${C.bl}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,fontFamily:fm,color:type==="crypto"?C.em:C.bl,marginRight:10}}>{a}</div><div style={{flex:1}}><div style={{color:C.t1,fontSize:12,fontWeight:600}}>{d.name}</div><div style={{color:C.t4,fontSize:10}}>{d.qty<1?d.qty.toFixed(4):d.qty.toFixed(1)} × ${$$(d.price)}</div></div><div style={{textAlign:"right"}}><div style={{color:C.t1,fontSize:12,fontWeight:600,fontFamily:fm}}>${$$(d.value)}</div><span style={{color:d.pl>=0?C.em:C.rd,fontSize:10,fontFamily:fm}}>{d.pct>=0?"+":""}{d.pct.toFixed(1)}%</span></div></div></Box>))}</div>;})
          : <Box style={{marginTop:8,padding:22,textAlign:"center",border:`1px dashed ${C.bd}`}}>
            <div style={{fontSize:28,marginBottom:8}}>📊</div>
            <div style={{color:C.t1,fontSize:13,fontWeight:600,marginBottom:4}}>Add your investments</div>
            <div style={{color:C.t4,fontSize:12,lineHeight:1.5,marginBottom:12}}>Import your brokerage or exchange transactions to see portfolio value, capital gains, loss harvesting opportunities, and wash sale detection.</div>
            <Chip color={C.t4}>CSV import coming soon</Chip>
          </Box>}
        </div>
        <div>
          <Box style={{marginBottom:10}}>
            <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Tax Breakdown</div>
            <Row l="Gross Income" r={`$${$$(totalIncome)}`}/><Row l="Deductions" r={`-$${$$(absDed+fed.ded)}`} color={C.em}/><Row l="Taxable Income" r={`$${$$(Math.max(adjInc-fed.ded,0))}`}/>
            <div style={{borderTop:`1px solid ${C.bd}`,margin:"4px 0"}}/><Row l="Federal Income Tax" r={`$${$$(fed.inc)}`}/><Row l="Capital Gains Tax" r={`$${$$(fed.lt)}`}/>{fed.niit>0&&<Row l="NIIT (3.8%)" r={`$${$$(fed.niit)}`} color={C.pu}/>}<Row l={`${ST[profile.state]?.n} Tax`} r={`$${$$(stTax.tax)}`} color={stTax.tax>0?C.yl:C.em}/>{seTax>0&&<Row l="SE Tax" r={`$${$$(seTax)}`} color={C.pu}/>}
            <div style={{borderTop:`1px solid ${C.bd}`,margin:"4px 0"}}/><Row l="Total" r={`$${$$(totalTax)}`} color={C.rd}/>
          </Box>
          <Box style={{marginBottom:10,cursor:"pointer"}} onClick={()=>go("comply")}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase"}}>Audit Risk</div><div style={{color:rCol,fontSize:24,fontWeight:700,fontFamily:fm,marginTop:2}}>{risk}<span style={{fontSize:12,color:C.t3}}>/100</span></div></div><svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke={C.s3} strokeWidth="4"/><circle cx="24" cy="24" r="20" fill="none" stroke={rCol} strokeWidth="4" strokeDasharray={`${risk*1.26} 126`} strokeLinecap="round" style={{transform:"rotate(-90deg)",transformOrigin:"center"}}/></svg></div></Box>
          <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:5}}>Deadlines</div>
          {deadlines.map((dl,i)=>{const dCol=dl.days<=30?C.rd:dl.days<=90?C.yl:C.em;return<Box key={i} style={{marginBottom:5,padding:11,borderLeft:`3px solid ${dCol}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{color:C.t1,fontSize:11.5,fontWeight:600}}>{dl.nm}</div><div style={{color:C.t4,fontSize:10}}>{dl.d}</div></div><div style={{color:dCol,fontSize:15,fontWeight:700,fontFamily:fm}}>{dl.days}d</div></div></Box>;})}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SAVE MONEY (fully gated)
// ═══════════════════════════════════════════
function SaveMoney({ data, profile, isPro, onUpgrade }) {
  const { pf, ws } = data;
  const hasPortfolio = Object.keys(pf).length > 0;
  const [sub, setSub] = useState("deductions");
  const stTax = calcSt(profile.state, profile.salary+profile.freelance, 0);
  const fed = calcFed(profile.salary+profile.freelance, 0, 0, profile.filing, stTax.tax);
  const rate = fed.marg;
  const harvestable = hasPortfolio ? Object.entries(pf).flatMap(([a,d]) => d.lots.filter(l=>l.unrealized<0).map(l=>({asset:a,type:d.type,name:d.name,...l,save:Math.abs(l.unrealized)*rate}))).sort((a,b)=>a.unrealized-b.unrealized) : [];
  const total = harvestable.reduce((s,h) => s+h.save, 0);
  const strategies = [
    {id:"401k",nm:"Max 401(k)",desc:"Contribute full $23,000",current:profile.retirement401k,save:Math.round(Math.max(23000-profile.retirement401k,0)*rate)},
    {id:"ira",nm:"Max IRA",desc:"$7,000 traditional IRA",current:profile.retirementIRA,save:Math.round(Math.max(7000-profile.retirementIRA,0)*rate)},
    {id:"hsa",nm:"HSA",desc:"$4,150 triple-tax-advantaged",current:0,save:Math.round(4150*rate)},
    profile.freelance>0&&{id:"qbi",nm:"QBI Deduction",desc:"20% of qualified business income",current:0,save:Math.round(profile.freelance*0.2*rate)},
  ].filter(Boolean);

  const emptyPortfolioState = <Box style={{padding:28,textAlign:"center",border:`1px dashed ${C.bd}`}}>
    <div style={{fontSize:28,marginBottom:8}}>📊</div>
    <div style={{color:C.t1,fontSize:13,fontWeight:600,marginBottom:4}}>No investment data yet</div>
    <div style={{color:C.t4,fontSize:12,lineHeight:1.5,marginBottom:10}}>Import your brokerage transactions to unlock tax-loss harvesting analysis and wash sale detection.</div>
    <Chip color={C.t4}>CSV import coming soon</Chip>
  </Box>;

  const harvestContent = <>
    <Box style={{marginBottom:14,textAlign:"center",padding:20}}><div style={{color:C.t3,fontSize:12,marginBottom:4}}>Potential tax savings at your {pct(rate)} marginal rate</div><div style={{color:C.em,fontSize:38,fontWeight:700,fontFamily:fm}}>${$$(total)}</div><div style={{color:C.t3,fontSize:11.5,marginTop:4}}>{harvestable.length} positions with unrealized losses</div></Box>
    {harvestable.map((h,i)=>(<Box key={i} style={{marginBottom:5,padding:13,borderLeft:`3px solid ${h.type==="crypto"?C.em:C.bl}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{color:C.t1,fontSize:13,fontWeight:700}}>{h.asset}</span><Chip color={h.type==="crypto"?C.em:C.bl}>{h.type==="crypto"?"CRYPTO":"STOCK"}</Chip><Chip color={h.holdDays>365?C.bl:C.yl}>{h.holdDays>365?"LT":"ST"}</Chip></div><div style={{textAlign:"right"}}><div style={{color:C.rd,fontSize:11,fontFamily:fm}}>-${$$(Math.abs(h.unrealized))}</div><div style={{color:C.em,fontSize:14,fontWeight:700,fontFamily:fm}}>Save ${$$(h.save)}</div></div></div></Box>))}
  </>;

  return (
    <div style={{padding:"24px 28px",overflowY:"auto",height:"100%"}}>
      <Tabs items={[["harvest","🌾 Loss Harvesting"],["deductions","📋 Deductions"],["wash",`⚠️ Wash Sales${ws.length?` (${ws.length})`:""}`]]} active={sub} onChange={setSub}/>
      <div style={{marginTop:14}}>
        {sub === "harvest" && (!hasPortfolio ? emptyPortfolioState : <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser={<>We found <strong style={{color:C.em}}>${$$(total)}</strong> in potential tax savings across {harvestable.length} positions.</>}>{harvestContent}</ProGate>)}
        {sub === "deductions" && <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="See personalized deduction strategies modeled at your marginal rate.">
          <Box style={{marginBottom:14,textAlign:"center",padding:18}}><div style={{color:C.t3,fontSize:12,marginBottom:4}}>Total potential savings</div><div style={{color:C.em,fontSize:34,fontWeight:700,fontFamily:fm}}>${$$(strategies.reduce((s,st)=>s+st.save,0))}</div></Box>
          {strategies.filter(s=>s.save>0).map(s=>(<Box key={s.id} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{color:C.t1,fontSize:13,fontWeight:600}}>{s.nm}</div><div style={{color:C.t3,fontSize:12,marginTop:3}}>{s.desc}</div></div><div style={{textAlign:"right"}}><div style={{color:C.em,fontSize:18,fontWeight:700,fontFamily:fm}}>${$$(s.save)}</div></div></div></Box>))}
        </ProGate>}
        {sub === "wash" && (!hasPortfolio ? emptyPortfolioState : <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser={ws.length>0?`${ws.length} potential wash sale${ws.length>1?"s":""} detected.`:"Check your crypto positions for wash sale violations."}>
          {ws.length===0?<Box style={{textAlign:"center",padding:36}}><div style={{fontSize:26,marginBottom:6}}>✅</div><div style={{color:C.em,fontSize:14,fontWeight:600}}>No wash sales detected</div></Box>
          :ws.map((w,i)=>(<Box key={i} style={{marginBottom:8,borderLeft:`3px solid ${C.rd}`}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{color:C.t1,fontSize:13,fontWeight:600}}>{w.asset}</div><Chip color={C.rd}>WASH SALE</Chip></div><div style={{color:C.t3,fontSize:12,marginTop:5}}>Sold {w.sellDate} at ${$$(Math.abs(w.gain))} loss → repurchased {Math.abs(Math.floor((new Date(w.repurchase.d)-new Date(w.sellDate))/864e5))}d later</div></div><div style={{color:C.rd,fontSize:18,fontWeight:700,fontFamily:fm}}>${$$(w.disallowed)}</div></div></Box>))}
        </ProGate>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// PLAN AHEAD (gated: comparison free, proj pro)
// ═══════════════════════════════════════════
function PlanAhead({ data, profile, isPro, onUpgrade }) {
  const { tv } = data;
  const [sub, setSub] = useState("states");
  const [target, setTarget] = useState("TX");
  const [growth, setGrowth] = useState(12);
  const [projState, setProjState] = useState(profile.state);
  const [strategy, setStrategy] = useState("hold");
  const totalIncome = profile.salary + (isPro ? profile.freelance + profile.rentalNet : 0);
  const curSt = calcSt(profile.state, totalIncome, 75000);
  const tarSt = calcSt(target, totalIncome, 75000);

  const proj = useMemo(() => {
    let pv = tv;
    return [2026,2027,2028].map(yr => {
      pv *= (1+growth/100); const gains = strategy==="sell"?pv*0.15:strategy==="harvest"?-(pv*0.04):0;
      const lt = Math.max(gains,0); const stT = calcSt(projState, totalIncome, lt);
      const f = calcFed(totalIncome, lt, 0, profile.filing, stT.tax);
      const se = Math.round(profile.freelance*0.9235*0.153);
      const harv = strategy==="harvest"?Math.round(Math.abs(gains)*f.marg):0;
      return { yr, pv:Math.round(pv), fed:f.tot, st:stT.tax, se, total:f.tot+stT.tax+se-harv };
    });
  }, [tv,growth,totalIncome,projState,strategy,profile.filing,profile.freelance]);

  return (
    <div style={{padding:"24px 28px",overflowY:"auto",height:"100%"}}>
      <Tabs items={[["states","✈️ State Comparison"],["proj","🔮 3-Year Projection"]]} active={sub} onChange={setSub}/>
      {sub === "states" && <div style={{marginTop:14}}>
        {/* State comparison is free — shows value */}
        <Box style={{marginBottom:14,padding:22,textAlign:"center"}}>
          <div style={{color:C.t3,fontSize:12.5,marginBottom:8}}>Moving from <strong style={{color:C.t1}}>{ST[profile.state]?.n}</strong> to</div>
          <select value={target} onChange={e=>setTarget(e.target.value)} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:"10px 16px",color:C.t1,fontSize:15,fontWeight:600,fontFamily:ff,outline:"none",marginBottom:12}}>{Object.entries(ST).filter(([c])=>c!==profile.state).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=><option key={k} value={k}>{v.n}{v.t==="0"?" ★":""}</option>)}</select>
          {curSt.tax-tarSt.tax>0?<><div style={{color:C.em,fontSize:40,fontWeight:700,fontFamily:fm}}>${$$(curSt.tax-tarSt.tax)}</div><div style={{color:C.t3,fontSize:12.5,marginTop:4}}>saved per year</div><div style={{display:"flex",justifyContent:"center",gap:24,marginTop:12}}><div><div style={{color:C.rd,fontSize:17,fontWeight:700,fontFamily:fm}}>${$$(curSt.tax)}</div><div style={{color:C.t3,fontSize:10.5}}>{ST[profile.state]?.n}</div></div><span style={{color:C.t4,fontSize:17}}>→</span><div><div style={{color:C.em,fontSize:17,fontWeight:700,fontFamily:fm}}>${$$(tarSt.tax)}</div><div style={{color:C.t3,fontSize:10.5}}>{ST[target]?.n}</div></div></div></>:<div style={{color:C.yl,fontSize:14,fontWeight:600}}>No savings</div>}
        </Box>
        <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginBottom:6}}>Zero-tax states</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6}}>
          {Object.entries(ST).filter(([,s])=>s.t==="0").map(([c,s])=><Box key={c} onClick={()=>setTarget(c)} style={{padding:11,textAlign:"center",cursor:"pointer",border:`1px solid ${target===c?C.em:C.bd}`}}><div style={{color:C.t1,fontSize:12,fontWeight:600,marginBottom:2}}>{s.n}</div><Chip color={C.em}>$0</Chip></Box>)}
        </div>
        {!isPro && <div style={{marginTop:16,textAlign:"center"}}><button onClick={onUpgrade} style={{padding:"8px 20px",borderRadius:9,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ff}}>🔮 Unlock 3-Year Projections with Pro</button></div>}
      </div>}
      {sub === "proj" && <div style={{marginTop:14}}>
        <ProGate isPro={isPro} onUpgrade={onUpgrade} teaser="Model portfolio growth, tax strategies, and state changes over 3 years." label="Pro Feature">
          <Box style={{marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <SelectField label="State" value={projState} onChange={setProjState} options={Object.entries(ST).sort((a,b)=>a[1].n.localeCompare(b[1].n)).map(([k,v])=>[k,v.n])}/>
            <Slider label="Growth" value={growth} onChange={setGrowth} min={-20} max={40} step={5} fmt={v=>`${v}%`} color={growth>=0?C.em:C.rd}/>
            <div><label style={{color:C.t3,fontSize:10,fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:5}}>Strategy</label><div style={{display:"flex",gap:3}}>{[["hold","💎 Hold"],["sell","💰 Sell"],["harvest","🌾 Harvest"]].map(([id,l])=><button key={id} onClick={()=>setStrategy(id)} style={{flex:1,padding:"6px",borderRadius:6,border:"none",cursor:"pointer",background:strategy===id?C.em:"transparent",color:strategy===id?C.bg:C.t3,fontSize:11,fontWeight:600,fontFamily:ff}}>{l}</button>)}</div></div>
          </div></Box>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {proj.map((p,i)=>(<Box key={p.yr}><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:C.em,fontSize:17,fontWeight:700,fontFamily:fm}}>{p.yr}</span><Chip>Y{i+1}</Chip></div><div style={{color:C.t1,fontSize:16,fontWeight:700,fontFamily:fm,marginBottom:7}}>${$$(p.pv)}</div><Row l="Federal" r={`$${$$(p.fed)}`}/><Row l="State" r={`$${$$(p.st)}`} color={p.st===0?C.em:C.t1}/>{p.se>0&&<Row l="SE" r={`$${$$(p.se)}`} color={C.pu}/>}<div style={{borderTop:`1px solid ${C.bd}`,marginTop:4,paddingTop:4}}><Row l="Net" r={`$${$$(p.total)}`} color={C.rd}/></div></Box>))}
          </div>
        </ProGate>
      </div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPLIANCE (view-only for free)
// ═══════════════════════════════════════════
function Compliance({ isPro, onUpgrade }) {
  const [open, setOpen] = useState(null);
  const [done, setDone] = useState({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (!isPro) return; try{const r=localStorage.getItem("taxiq-compliance");if(r)setDone(JSON.parse(r));}catch{} setLoaded(true); }, [isPro]);
  const toggle = useCallback((fw,si,ii) => {
    if (!isPro) return;
    setDone(prev => { const k=`${fw}-${si}-${ii}`,next={...prev,[k]:!prev[k]}; try{localStorage.setItem("taxiq-compliance",JSON.stringify(next));}catch{} return next; });
  }, [isPro]);

  return (
    <div style={{padding:"24px 28px",overflowY:"auto",height:"100%"}}>
      <div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:4}}>Compliance & Filing</div>
      <div style={{color:C.t3,fontSize:12,marginBottom:16}}>Check which obligations apply. Missing them can mean steep penalties.</div>
      {!isPro && <div style={{padding:"10px 16px",background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.12)`,borderRadius:10,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:C.t2,fontSize:12}}>🔒 Interactive checklists with progress saving require Pro</span>
        <button onClick={onUpgrade} style={{padding:"5px 14px",borderRadius:7,border:"none",background:C.em,color:C.bg,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:ff}}>Upgrade</button>
      </div>}
      {Object.entries(COMPLY_DATA).map(([key,fw])=>{const isOpen=open===key;const total=fw.steps.reduce((s,st)=>s+st.items.length,0);const completed=fw.steps.reduce((s,st,si)=>s+st.items.filter((_,ii)=>done[`${key}-${si}-${ii}`]).length,0);return(
        <div key={key} style={{marginBottom:7}}>
          <Box onClick={()=>setOpen(isOpen?null:key)} style={{cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:19}}>{fw.icon}</span><div style={{flex:1}}><div style={{color:C.t1,fontSize:13,fontWeight:600}}>{fw.nm}</div><div style={{color:C.t3,fontSize:11.5,marginTop:2}}>{fw.trigger}</div></div>{isPro&&completed>0&&<Chip color={completed===total?C.em:C.yl}>{completed}/{total}</Chip>}<span style={{color:C.t4,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"none",fontSize:12}}>▾</span></div></Box>
          {isOpen&&<Box style={{borderTopLeftRadius:0,borderTopRightRadius:0,marginTop:-1,borderTop:`1px solid ${C.bd}`}}>
            <Chip color={C.rd} style={{marginBottom:10}}>Penalty: {fw.pen}</Chip>
            {fw.steps.map((step,si)=>(<div key={si} style={{marginBottom:10}}><div style={{color:C.em,fontSize:11,fontWeight:700,marginBottom:5}}>Step {si+1}: {step.t}</div>{step.items.map((item,ii)=>{const checked=isPro&&done[`${key}-${si}-${ii}`];return(<div key={ii} onClick={()=>toggle(key,si,ii)} style={{display:"flex",alignItems:"flex-start",gap:9,padding:"4px 0",cursor:isPro?"pointer":"default",opacity:isPro?1:0.7}}>
              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${checked?C.em:C.t4}`,background:checked?`${C.emx}0.15)`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<span style={{color:C.em,fontSize:10}}>✓</span>}</div>
              <span style={{color:checked?C.t4:C.t2,fontSize:12,lineHeight:1.5,textDecoration:checked?"line-through":"none"}}>{item}</span>
            </div>);})}</div>))}
          </Box>}
        </div>
      );})}
      <div style={{color:C.t3,fontSize:9.5,fontWeight:600,textTransform:"uppercase",marginTop:18,marginBottom:8}}>International tax rates</div>
      <Box style={{padding:0}}>{INTL.map((j,i)=>(<div key={i} style={{display:"flex",alignItems:"center",padding:"9px 14px",borderBottom:i<INTL.length-1?`1px solid ${C.bd}`:"none"}}><span style={{fontSize:16,marginRight:10}}>{j.f}</span><div style={{flex:1}}><div style={{color:C.t1,fontSize:12,fontWeight:600}}>{j.n}</div></div><div style={{textAlign:"right"}}><div style={{color:C.t1,fontSize:12,fontFamily:fm}}>{j.lt}</div><div style={{color:C.t4,fontSize:10}}>{j.cr}</div></div></div>))}</Box>
    </div>
  );
}

// ═══════════════════════════════════════════
// AI ADVISOR (3 free Q/mo, unlimited Pro)
// ═══════════════════════════════════════════
function Ask({ profile, data, isPro, onUpgrade }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [ld, setLd] = useState(false);
  const [mode, setMode] = useState("r");
  const [qUsed, setQUsed] = useState(0);
  const ref = useRef(null);
  const FREE_LIMIT = 3;
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[msgs,ld]);
  useEffect(()=>{ try{const r=localStorage.getItem("taxiq-ai-used"); if(r)setQUsed(+r);}catch{} },[]);

  const profileCtx = `User: Filing ${profile.filing}, ${ST[profile.state]?.n}. W-2: $${$$(profile.salary)}, Freelance: $${$$(profile.freelance)}, Rental: $${$$(profile.rentalNet)}, Dividends: $${$$(profile.dividends)}. Portfolio: $${$$(data.tv)}. LT gains: $${$$(data.ltGains)}, ST gains: $${$$(data.stGains)}.`;
  const SYS = mode==="a"
    ?`You are TaxIQ, a personalized AI tax advisor. ${profileCtx}\n\nGive specific, risk-rated recommendations. Structure: plain English → recommendation (🟢 LOW / 🟡 MODERATE / 🔴 HIGH risk) → action items → caveats. Suggest CPA for implementation.`
    :`You are TaxIQ, an AI tax research assistant. Answer in plain English. Cite IRC sections when helpful. Cover: federal, 50 states, capital gains, SE tax, retirement, deductions, FATCA, CRS, FBAR.`;

  const send = async (text) => {
    if (!text.trim()||ld) return;
    if (!isPro && qUsed >= FREE_LIMIT) { onUpgrade(); return; }
    const um = {role:"user",content:text.trim()};
    const nm = [...msgs,um]; setMsgs(nm); setInput(""); setLd(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4096,system:SYS,messages:nm.map(m=>({role:m.role,content:m.content})),tools:[{type:"web_search_20250305",name:"web_search"}]})});
      const d = await res.json();
      setMsgs([...nm,{role:"assistant",content:d.content.map(i=>i.type==="text"?i.text:"").filter(Boolean).join("\n")}]);
      if (!isPro) { const nq = qUsed+1; setQUsed(nq); try{localStorage.setItem("taxiq-ai-used",""+nq);}catch{} }
    } catch { setMsgs([...nm,{role:"assistant",content:"Connection error. Please try again."}]); }
    finally { setLd(false); }
  };
  const prompts = mode==="a"
    ?["Based on my profile, what should I prioritize?","Should I form an S-Corp?","Does a Roth conversion make sense?"]
    :["What's the QBI deduction?","How are staking rewards taxed?","Which states have no income tax?"];
  const atLimit = !isPro && qUsed >= FREE_LIMIT;

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"0 28px"}}>
      <div style={{padding:"14px 0",display:"flex",gap:6,alignItems:"center"}}>
        <Tabs items={[["r","🔍 Research"],["a","⚖️ Advice"]]} active={mode} onChange={m=>{setMode(m);setMsgs([]);}}/>
        {!isPro && <span style={{marginLeft:"auto",color:C.t4,fontSize:11,fontFamily:fm}}>{Math.max(FREE_LIMIT-qUsed,0)}/{FREE_LIMIT} free</span>}
        {isPro && <ProBadge isPro={true}/>}
        {msgs.length>0&&<button onClick={()=>setMsgs([])} style={{marginLeft:isPro?"auto":8,background:"none",border:`1px solid ${C.bd}`,borderRadius:8,padding:"5px 12px",color:C.t3,cursor:"pointer",fontSize:11,fontFamily:ff}}>Clear</button>}
      </div>
      {mode==="a"&&msgs.length===0&&isPro&&<div style={{background:`${C.emx}0.06)`,border:`1px solid ${C.emx}0.15)`,borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:12,color:C.em}}>💡 Using your profile for personalized advice.</div>}
      <div style={{flex:1,overflowY:"auto"}}>
        {msgs.length===0&&!atLimit&&<div style={{textAlign:"center",padding:"32px 0",maxWidth:400,margin:"0 auto"}}><div style={{fontSize:30,marginBottom:6}}>{mode==="a"?"⚖️":"🔍"}</div><div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:14}}>{mode==="a"?"Get tax advice":"Research tax rules"}</div><div style={{display:"flex",flexDirection:"column",gap:5}}>{prompts.map((q,i)=><Box key={i} onClick={()=>send(q)} style={{padding:11,cursor:"pointer",textAlign:"left"}}><span style={{color:C.t2,fontSize:12}}>{q}</span></Box>)}</div></div>}
        {atLimit&&msgs.length===0&&<div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:36,marginBottom:12}}>🔒</div><div style={{color:C.t1,fontSize:16,fontWeight:700,marginBottom:8}}>You've used your 3 free questions</div><div style={{color:C.t3,fontSize:13,marginBottom:20}}>Upgrade to Pro for unlimited AI tax advice, personalized to your profile.</div><button onClick={onUpgrade} style={{padding:"12px 28px",borderRadius:10,border:"none",background:C.em,color:C.bg,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:ff}}>Upgrade to Pro — $79/yr</button></div>}
        {msgs.map((m,i)=>(<div key={i} style={{marginBottom:11,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:m.role==="user"?"80%":"95%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.em:C.s2,border:m.role==="user"?"none":`1px solid ${C.bd}`}}>{m.role==="user"?<p style={{color:C.bg,fontSize:13,lineHeight:1.6,margin:0,fontWeight:500}}>{m.content}</p>:<div style={{fontSize:13,lineHeight:1.65}}><Md text={m.content}/></div>}</div></div>))}
        {ld&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:C.s2,border:`1px solid ${C.bd}`}}><div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:4,background:C.em,animation:`dt 1.2s ease-in-out ${i*.15}s infinite`}}/>)}<style>{`@keyframes dt{0%,60%,100%{opacity:.3}30%{opacity:1}}`}</style></div></div></div>}
        <div ref={ref}/>
      </div>
      <div style={{padding:"10px 0 14px"}}>
        <div style={{display:"flex",gap:8,background:C.s2,border:`1px solid ${atLimit?C.rd+"40":C.bd}`,borderRadius:12,padding:"9px 12px",opacity:atLimit?0.5:1}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send(input);}}} placeholder={atLimit?"Upgrade to continue asking...":"Ask a tax question..."} disabled={atLimit} style={{flex:1,background:"none",border:"none",outline:"none",color:C.t1,fontSize:13,fontFamily:ff}}/>
          <button onClick={()=>atLimit?onUpgrade():send(input)} disabled={!atLimit&&(!input.trim()||ld)} style={{width:32,height:32,borderRadius:8,border:"none",background:atLimit?C.em:(input.trim()&&!ld?C.em:C.s3),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{atLimit?<span style={{fontSize:12}}>🔒</span>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim()&&!ld?C.bg:C.t4} strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ONBOARDING WIZARD
// ═══════════════════════════════════════════
function Onboarding({ onComplete }) {
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

      <div style={{ position: "relative", width: 520, maxHeight: "90vh", overflowY: "auto", opacity: animating ? 0 : 1, transform: animating ? "translateY(10px)" : "translateY(0)", transition: "all 0.2s ease" }}>

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
    <div style={{width:"100vw",height:"100vh",display:"flex",background:C.bg,fontFamily:ff,overflow:"hidden",color:C.t2,fontSize:13}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {showProfile && <ProfileModal profile={profile} setProfile={setProfile} onClose={()=>setShowProfile(false)} isPro={isPro} onUpgrade={openUpgrade}/>}
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)} onUpgrade={handleUpgrade} onRestore={handleRestore}/>}

      {/* Sidebar */}
      <div style={{width:sbOpen?192:52,flexShrink:0,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",transition:"width 0.2s",overflow:"hidden",background:C.s1}}>
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
          <Row l="Income" r={`$${$$(profile.salary+(isPro?profile.freelance+profile.rentalNet+profile.dividends:0))}`} color={C.em}/><Row l="State" r={ST[profile.state]?.n||""} color={C.t3} sub/>
          <div style={{display:"flex",gap:4,marginTop:6}}>
            <button onClick={()=>setShowProfile(true)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.bd}`,background:"transparent",color:C.t3,cursor:"pointer",fontSize:10,fontFamily:ff}}>✏️ Profile</button>
            {isPro?<select value={costMethod} onChange={e=>setCostMethod(e.target.value)} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.bd}`,background:"transparent",color:C.t3,fontSize:10,fontFamily:ff}}><option value="fifo">FIFO</option><option value="lifo">LIFO</option><option value="hifo">HIFO</option></select>
            :<button onClick={openUpgrade} style={{flex:1,padding:"6px",borderRadius:6,border:`1px solid ${C.emx}0.2)`,background:`${C.emx}0.06)`,color:C.em,cursor:"pointer",fontSize:10,fontFamily:ff,fontWeight:600}}>⚡ Pro</button>}
          </div>
        </div>}
      </div>

      {/* Content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,overflow:"hidden"}}>
          {tab==="dash"&&<Dashboard data={data} go={setTab} profile={profile} isPro={isPro} onUpgrade={openUpgrade}/>}
          {tab==="save"&&<SaveMoney data={data} profile={profile} isPro={isPro} onUpgrade={openUpgrade}/>}
          {tab==="plan"&&<PlanAhead data={data} profile={profile} isPro={isPro} onUpgrade={openUpgrade}/>}
          {tab==="comply"&&<Compliance isPro={isPro} onUpgrade={openUpgrade}/>}
          {tab==="ask"&&<Ask profile={profile} data={data} isPro={isPro} onUpgrade={openUpgrade}/>}
        </div>
        <div style={{padding:"6px 20px",borderTop:`1px solid ${C.bd}`,background:C.s1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:C.t4,fontSize:9.5}}>TaxIQ is for informational purposes only — not tax, legal, or financial advice. Consult a qualified CPA.</span>
          <span style={{color:C.t4,fontSize:9}}>Tax rates: 2025 TY</span>
        </div>
      </div>
    </div>
  );
}
