import { createElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BarChart3, Boxes, Check, ChevronRight, CircleUserRound,
  Clock3, LayoutDashboard, LockKeyhole, Menu, PackageCheck, ShieldCheck,
  ShoppingBag, Smartphone, Store, Truck, Users, X,
} from "lucide-react";
import heroImage from "../assets/images/landing/smart-store-grocery-hero-v1.jpg";

const roleCards = [
  { title: "User / Customer", subtitle: "Shop easily, track orders and get the best experience.", icon: CircleUserRound, color: "#18b65b", tint: "#effcf5", features: ["Browse products", "Place orders", "Track delivery", "Manage profile & addresses"], button: "Continue as Customer", path: "/login?role=user" },
  { title: "Store Owner", subtitle: "Manage your store, inventory, orders and staff seamlessly.", icon: Store, color: "#2387ed", tint: "#eff7ff", features: ["Manage inventory", "Billing & orders", "Staff management", "Sales reports & analytics"], button: "Continue as Store Owner", path: "/login?role=admin" },
  { title: "Delivery Partner", subtitle: "Deliver orders on time and grow your earnings.", icon: Truck, color: "#f58220", tint: "#fff7ec", features: ["View assigned orders", "Live GPS tracking", "Update delivery status", "Earnings summary"], button: "Continue as Delivery Partner", path: "/login?role=delivery" },
];

const platformFeatures = [
  [Boxes, "All in One Solution", "Store, orders, inventory and billing in one place."],
  [Users, "Real-time Sync", "All data updates in real time across modules."],
  [ShieldCheck, "Secure & Safe", "Strong protection keeps your business data safe."],
  [BarChart3, "Powerful Analytics", "Clear reports help your business grow faster."],
  [Smartphone, "Works Everywhere", "Access from mobile, tablet or desktop."],
];

const navItems = [["Features", "#features"], ["How It Works", "#how-it-works"], ["Roles", "#roles"], ["About Us", "#about"], ["Contact", "#contact"]];

export default function Home() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (path) => { setMenuOpen(false); navigate(path); };

  return (
    <div className="landing-page">
      <style>{landingStyles}</style>
      <nav className="landing-nav">
        <div className="landing-container nav-inner">
          <button onClick={() => go("/")} className="brand" aria-label="ApnaStore home">
            <span className="brand-icon"><ShoppingBag size={25} strokeWidth={2.4} /></span>
            <span><strong>Apna<span>Store</span></strong><small>Your Store. Your Control.</small></span>
          </button>
          <div className="nav-links" aria-label="Main navigation">
            {navItems.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
          </div>
          <div className="nav-actions">
            <button className="nav-login" onClick={() => go("/login")}><CircleUserRound size={17} /> Login</button>
            <button className="nav-primary" onClick={() => go("/register")}>Get Started</button>
          </div>
          <button className="mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="mobile-menu">{navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}<button onClick={() => go("/login")}>Login</button><button onClick={() => go("/register")}>Get Started</button></div>}
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span>✦</span> All-in-one smart platform</div>
              <h1>One Platform for <span>Store Owners, Customers</span> &amp; <span>Delivery Partners</span></h1>
              <p>Manage stores, shop products, track orders and handle deliveries from one smart system.</p>
              <div className="hero-actions">
                <button className="button primary-button" onClick={() => go("/register")}>Get Started Free <ArrowRight size={18} /></button>
                <button className="button secondary-button" onClick={() => go("/login")}><CircleUserRound size={18} /> Login to Your Account</button>
              </div>
              <div className="hero-benefits">
                <span><ShieldCheck /> Secure &amp; Reliable</span><span><Check /> Easy to Use</span><span><Smartphone /> Supports All Devices</span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card"><img src={heroImage} alt="Smart Store grocery bag filled with fresh produce" /></div>
              <div className="floating-note"><span><Users size={23} /></span><p>One smart platform for shopping, store management and reliable delivery.</p></div>
            </div>
          </div>
        </section>

        <section id="roles" className="page-section">
          <div className="landing-container">
            <div className="section-heading"><p>Choose your role</p><h2>Login and continue as <span>per your role</span></h2></div>
            <div className="role-grid">
              {roleCards.map((role) => <article key={role.title} className="role-card" style={{ "--role-color": role.color, "--role-tint": role.tint }}>
                <div className="role-heading"><span className="role-icon"><role.icon /></span><div><h3>{role.title}</h3><p>{role.subtitle}</p></div></div>
                <div className="role-art"><role.icon /></div>
                <ul>{role.features.map((feature) => <li key={feature}><span><Check /></span>{feature}</li>)}</ul>
                <button onClick={() => go(role.path)}>{role.button}<ArrowRight /></button>
              </article>)}
            </div>
          </div>
        </section>

        <section id="features" className="page-section soft-section">
          <div className="landing-container">
            <div className="section-heading"><p>Why choose Apna Store?</p><h2>Everything you need, in one powerful platform</h2></div>
            <div className="feature-grid">{platformFeatures.map(([Icon, title, copy]) => <article className="feature-card" key={title}><span>{createElement(Icon, { size: 27 })}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="how-it-works" className="page-section">
          <div className="landing-container">
            <div className="section-heading"><p>Simple from day one</p><h2>Get started in three easy steps</h2></div>
            <div className="steps-grid">{[[CircleUserRound, "1. Create account", "Register and choose the right role."], [PackageCheck, "2. Start managing", "Shop or manage daily store operations."], [Clock3, "3. Track everything", "Follow inventory, orders and delivery live."]].map(([Icon, title, copy]) => <article key={title}>{createElement(Icon)}<h3>{title}</h3><p>{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="about" className="about-wrap">
          <div className="landing-container about-panel">
            <div><p className="about-label">Built for modern local commerce</p><h2>One connected system for every person in the order journey.</h2><p>ApnaStore connects customers, store teams and delivery partners with simple tools for faster, safer local shopping.</p></div>
            <div className="about-stats"><span><LayoutDashboard /><strong>One</strong><small>Unified dashboard</small></span><span><LockKeyhole /><strong>Secure</strong><small>Role-based access</small></span></div>
          </div>
        </section>
      </main>

      <footer id="contact"><div className="landing-container footer-inner"><div><strong>Apna<span>Store</span></strong><p>Your Store. Your Control.</p></div><div><a href="mailto:support@apnastore.com">Contact</a><button onClick={() => go("/login")}>Login <ChevronRight /></button></div></div></footer>
    </div>
  );
}

const landingStyles = `
  .landing-page{--green:#20bf63;--green-dark:#149c4d;--ink:#101a30;--muted:#607086;background:#fff;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.landing-page *{box-sizing:border-box}.landing-page button,.landing-page a{font:inherit}.landing-page button{cursor:pointer}.landing-container{width:100%;max-width:1280px;margin:0 auto;padding-left:32px;padding-right:32px}
  .landing-nav{height:80px;position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);border-bottom:1px solid #edf2ef;backdrop-filter:blur(18px)}.nav-inner{height:80px;display:flex;justify-content:space-between;align-items:center;gap:28px}.brand{border:0;background:none;padding:0;display:flex;align-items:center;gap:12px;color:var(--ink);text-align:left;flex:0 0 auto}.brand-icon{width:44px;height:44px;display:grid;place-items:center;border:2px solid var(--green);border-radius:13px;background:#f2fff7;color:var(--green-dark)}.brand strong{display:block;font-size:21px;font-weight:850;letter-spacing:-.5px;line-height:1.15}.brand strong span,.section-heading h2 span,footer strong span{color:var(--green)}.brand small{display:block;margin-top:3px;color:#718096;font-size:11px}.nav-links{display:flex;align-items:center;justify-content:center;gap:40px;white-space:nowrap}.nav-links a{display:block;padding:10px 0;color:#526076;text-decoration:none;font-size:14px;font-weight:650;transition:.2s}.nav-links a:hover{color:var(--green-dark)}.nav-actions{display:flex;align-items:center;gap:12px;flex:0 0 auto}.nav-actions button{height:46px;border-radius:12px;padding:0 20px;font-size:14px;font-weight:750}.nav-login{display:flex;align-items:center;gap:8px;color:var(--green-dark);border:1.5px solid var(--green);background:#fff}.nav-primary{border:1.5px solid var(--green);background:var(--green);color:#fff;box-shadow:0 10px 25px rgba(32,191,99,.2)}.mobile-toggle,.mobile-menu{display:none}
  .hero-section{position:relative;overflow:hidden;background:radial-gradient(circle at 72% 40%,rgba(192,244,212,.26),transparent 28%),linear-gradient(135deg,#fff 0%,#fff 65%,#f3fff7 100%)}.hero-orb{position:absolute;border-radius:999px;filter:blur(4px);pointer-events:none}.hero-orb-one{width:360px;height:360px;right:-120px;top:30px;background:rgba(190,241,209,.35)}.hero-orb-two{width:160px;height:160px;left:44%;bottom:-90px;background:rgba(214,248,226,.46)}.hero-grid{position:relative;display:grid;grid-template-columns:1fr 1.15fr;gap:80px;align-items:center;padding-top:70px;padding-bottom:90px}.hero-copy{position:relative;z-index:2}.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;background:#eafaf0;color:#159e4d;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.hero-copy h1{max-width:610px;margin:24px 0 0;font-size:64px;font-weight:800;line-height:1.05;letter-spacing:-.055em}.hero-copy h1 span{color:var(--green)}.hero-copy>p{max-width:580px;margin:26px 0 0;color:var(--muted);font-size:20px;line-height:1.8}.hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:32px}.button{height:56px;display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:0 24px;border-radius:14px;font-size:15px;font-weight:800;transition:.2s}.primary-button{border:1px solid var(--green);background:var(--green);color:#fff;box-shadow:0 14px 28px rgba(32,191,99,.22)}.secondary-button{border:1.5px solid #d7dee6;background:#fff;color:#334155}.button:hover{transform:translateY(-2px)}.hero-benefits{display:flex;flex-wrap:wrap;gap:22px;margin-top:30px;color:#526076;font-size:12px;font-weight:700}.hero-benefits span{display:flex;align-items:center;gap:7px}.hero-benefits svg{width:18px;height:18px;color:var(--green)}.hero-visual{position:relative;z-index:2;min-width:0}.hero-card{padding:18px;border-radius:32px;overflow:hidden;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.08)}.hero-card img{display:block;width:100%;height:auto;aspect-ratio:1/1.04;object-fit:cover;object-position:center;border-radius:20px}.floating-note{position:absolute;left:32px;right:32px;bottom:-34px;display:flex;align-items:center;gap:13px;padding:16px 18px;border:1px solid rgba(32,191,99,.14);border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 18px 40px rgba(21,75,42,.12);backdrop-filter:blur(12px)}.floating-note span{width:44px;height:44px;display:grid;place-items:center;flex:none;border-radius:13px;background:#e8f9ef;color:var(--green-dark)}.floating-note p{margin:0;color:#526076;font-size:13px;font-weight:650;line-height:1.55}
  .page-section{padding-top:100px;padding-bottom:100px}.soft-section{background:#f8fcfa}.section-heading{text-align:center;margin-bottom:60px}.section-heading>p{margin:0;color:var(--green-dark);font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.1em}.section-heading h2{margin:10px auto 0;max-width:800px;font-size:38px;line-height:1.15;letter-spacing:-.035em;font-weight:800}.role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}.role-card{display:flex;flex-direction:column;min-width:0;padding:32px;border:1px solid color-mix(in srgb,var(--role-color) 22%,white);border-radius:24px;background:linear-gradient(155deg,#fff 45%,var(--role-tint));box-shadow:0 12px 38px rgba(15,23,42,.055);transition:transform .25s,box-shadow .25s}.role-card:hover{transform:translateY(-8px);box-shadow:0 24px 55px rgba(15,23,42,.13)}.role-heading{display:flex;align-items:flex-start;gap:14px}.role-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border-radius:14px;background:var(--role-color);color:#fff}.role-icon svg{width:25px}.role-card h3{margin:0;font-size:21px;font-weight:800}.role-card p{margin:5px 0 0;color:var(--muted);font-size:14px;line-height:1.6}.role-art{height:140px;display:grid;place-items:center;margin:25px 0;border-radius:18px;background:var(--role-tint);color:var(--role-color)}.role-art svg{width:76px;height:76px;stroke-width:1.35}.role-card ul{display:grid;gap:12px;margin:0;padding:0;list-style:none}.role-card li{display:flex;align-items:center;gap:10px;color:#526076;font-size:14px;font-weight:650}.role-card li span{width:20px;height:20px;display:grid;place-items:center;flex:none;border-radius:50%;background:var(--role-color);color:#fff}.role-card li svg{width:12px}.role-card>button{height:50px;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:28px;border:2px solid var(--role-color);border-radius:12px;background:#fff;color:var(--role-color);font-size:14px;font-weight:800}.role-card>button svg{width:16px}.feature-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}.feature-card{padding:30px 20px;border:1px solid #e8f1eb;border-radius:20px;background:#fff;text-align:center;box-shadow:0 10px 32px rgba(15,23,42,.045)}.feature-card>span{width:56px;height:56px;display:grid;place-items:center;margin:auto;border-radius:16px;background:#eaf9f0;color:var(--green-dark)}.feature-card h3{margin:18px 0 0;font-size:16px}.feature-card p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.65}.steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:32px}.steps-grid article{padding:32px;border:1px solid #e9eef0;border-radius:22px;background:#fff;box-shadow:0 8px 25px rgba(15,23,42,.05)}.steps-grid svg{color:var(--green)}.steps-grid h3{margin:20px 0 0;font-size:20px}.steps-grid p{margin:10px 0 0;color:var(--muted);line-height:1.65}.about-wrap{padding:0 0 100px}.about-panel{display:grid;grid-template-columns:1.25fr .75fr;padding-left:0;padding-right:0;overflow:hidden;border-radius:30px;background:linear-gradient(120deg,#17a752,#52c882);color:#fff}.about-panel>div:first-child{padding:50px}.about-label{margin:0 0 10px!important;color:#d9fbe6!important;font-size:13px;font-weight:800}.about-panel h2{max-width:700px;margin:0;font-size:36px;line-height:1.2}.about-panel p{max-width:720px;margin:20px 0 0;color:#ebfff2;line-height:1.75}.about-stats{display:grid;grid-template-columns:1fr 1fr;background:rgba(255,255,255,.12)}.about-stats span{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-left:1px solid rgba(255,255,255,.16)}.about-stats strong{margin-top:12px;font-size:24px}.about-stats small{margin-top:5px;color:#d9fbe6}footer{border-top:1px solid #edf0ee;background:#fff}.footer-inner{display:flex;align-items:center;justify-content:space-between;padding-top:34px;padding-bottom:34px}.footer-inner strong{font-size:20px}.footer-inner p{margin:4px 0 0;color:var(--muted);font-size:13px}.footer-inner>div:last-child{display:flex;align-items:center;gap:28px}.footer-inner a,.footer-inner button{color:#526076;text-decoration:none}.footer-inner button{display:flex;align-items:center;gap:3px;border:0;background:none;color:var(--green-dark);font-weight:750}.footer-inner button svg{width:15px}
  @media(max-width:1120px){.nav-links{gap:22px}.hero-grid{gap:46px}.hero-copy h1{font-size:52px}.hero-copy>p{font-size:18px}.role-card{padding:26px}.feature-grid{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:900px){.landing-container{padding-left:24px;padding-right:24px}.nav-links,.nav-actions{display:none}.mobile-toggle{display:grid;place-items:center;border:0;background:#effaf3;color:var(--green-dark);width:44px;height:44px;border-radius:12px}.mobile-menu{display:flex;position:absolute;top:80px;left:0;right:0;flex-direction:column;gap:4px;padding:18px 24px 24px;border-bottom:1px solid #e8efeb;background:#fff;box-shadow:0 18px 28px rgba(15,23,42,.08)}.mobile-menu a,.mobile-menu button{padding:12px;border:0;border-radius:9px;background:#fff;color:#334155;text-align:left;text-decoration:none;font-weight:700}.mobile-menu button:last-child{background:var(--green);color:#fff}.hero-grid{grid-template-columns:1fr 1fr;gap:34px;padding-top:56px;padding-bottom:76px}.hero-copy h1{font-size:44px}.hero-copy>p{font-size:17px;line-height:1.65}.hero-actions{flex-direction:column;align-items:stretch}.role-grid{grid-template-columns:1fr}.feature-grid{grid-template-columns:repeat(2,1fr)}.about-panel{grid-template-columns:1fr}.about-stats{min-height:220px}}
  @media(max-width:680px){.landing-container{padding-left:20px;padding-right:20px}.brand small{display:none}.hero-grid{grid-template-columns:1fr;gap:64px;padding-top:46px;padding-bottom:78px}.hero-copy h1{font-size:42px;line-height:1.07}.hero-copy>p{font-size:17px}.hero-visual{width:100%;max-width:520px;margin:auto}.hero-card{padding:12px;border-radius:25px}.hero-card img{border-radius:17px}.floating-note{left:18px;right:18px;bottom:-30px}.page-section{padding-top:76px;padding-bottom:76px}.section-heading{margin-bottom:42px}.section-heading h2{font-size:31px}.feature-grid,.steps-grid{grid-template-columns:1fr}.about-wrap{padding-bottom:76px}.about-panel{border-radius:0}.about-panel>div:first-child{padding:42px 24px}.about-panel h2{font-size:30px}.footer-inner{align-items:flex-start;flex-direction:column;gap:22px}.hero-benefits{gap:14px}}
  @media(max-width:390px){.hero-copy h1{font-size:37px}.brand strong{font-size:19px}.brand-icon{width:40px;height:40px}.landing-container{padding-left:16px;padding-right:16px}}
`;
