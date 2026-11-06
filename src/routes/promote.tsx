import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Check, Diamond, Flame, HeartHandshake, Play, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import progression from "@/assets/promote/progression.webp.asset.json";
import shop from "@/assets/promote/shop.webp.asset.json";

const appUrl = "https://resetapprecovery.lovable.app";

export const Route = createFileRoute("/promote")({
  head: () => ({ meta: [
    { title: "RESET — Your gamified recovery journey" },
    { name: "description", content: "Meet RESET: tailored recovery quests, daily sober check-ins, streaks, XP, unlimited levels and collectible rewards. Take your next step today." },
    { property: "og:title", content: "RESET — Your gamified recovery journey" },
    { property: "og:description", content: "Small steps. Daily quests. A recovery journey that grows with you. Explore RESET and try the app." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: PromotePage,
});

const features = [
  { icon: Sparkles, title: "Quests made for you", copy: "Daily goals and activities tailored to your triggers and recovery focus." },
  { icon: Flame, title: "One honest day at a time", copy: "Log sober days, track streaks, and record setbacks without erasing your story." },
  { icon: Trophy, title: "Progress with no ceiling", copy: "Earn XP, climb unlimited levels, and discover what your next milestone unlocks." },
  { icon: Diamond, title: "A little reward goes a long way", copy: "Collect characters and badges. Spend earned gems in the rotating daily shop." },
  { icon: HeartHandshake, title: "Real support, when you need it", copy: "Find recovery services, therapists, rehab centres and support groups near you." },
];

function OpenApp({ className = "", children = "Open RESET" }: { className?: string; children?: React.ReactNode }) {
  return <Button asChild size="lg" className={`promote-cta ${className}`}><a href={appUrl} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight /></a></Button>;
}

function PromotePage() {
  const [live, setLive] = useState(false);
  const [screen, setScreen] = useState<"levels" | "shop">("levels");
  return (
    <div className="promote-page">
      <header className="promote-nav promote-wrap">
        <a href="/promote" className="promote-wordmark" aria-label="RESET promotional homepage">RESET<span className="promote-brand-star">✦</span></a>
        <OpenApp />
      </header>

      <main>
        <section className="promote-hero promote-wrap">
          <div className="promote-hero-copy">
            <p className="promote-eyebrow"><span /> A NEW DAY. A NEW LEVEL.</p>
            <h1>RESET</h1>
            <p className="promote-script">your gamified recovery journey.</p>
            <p className="promote-intro">Small steps deserve big recognition.<br />Make room for better habits, one quest at a time.</p>
            <div className="promote-hero-actions"><OpenApp /><Button variant="ghost" asChild className="promote-preview-link"><a href="#live-preview"><Play /> Try the live app</a></Button></div>
            <div className="promote-availability"><span><Check /> Available on the web</span><span>Android APK available</span></div>
            <p className="promote-store-note">No verified Google Play or App Store listing yet.</p>
          </div>
          <div className="promote-hero-art">
            <div className="promote-reward-tag promote-tag-top"><Diamond /> LITTLE WINS. REAL PROGRESS.</div>
            <div className="promote-phone">
              <div className="promote-phone-speaker" />
              <div className="promote-phone-top"><span className="promote-wordmark">RESET</span><Diamond /></div>
              <img src={progression.url} alt="Actual RESET progression screen showing level selection, XP and gem rewards using example data" width="722" height="764" />
              <div className="promote-phone-bottom"><Trophy /><span className="promote-script">level by level.</span><Sparkles /></div>
              <div className="promote-home-indicator" />
            </div>
            <div className="promote-reward-tag promote-tag-bottom"><Trophy /><div><strong>YOUR NEXT CHAPTER</strong><span>starts with one small step.</span></div></div>
            <span className="promote-art-star" aria-hidden="true">✧</span>
          </div>
        </section>

        <div className="promote-ticker" aria-hidden="true"><span>DAILY QUESTS</span>✦<span>HONEST CHECK-INS</span>✦<span>LEVEL UP</span>✦<span>COLLECT REWARDS</span>✦<span>KEEP GOING</span></div>

        <section className="promote-features promote-wrap">
          <div className="promote-section-heading"><p className="promote-eyebrow">A JOURNEY, NOT A HIGH SCORE</p><h2>Real life.<br /><span className="promote-script">A little more game.</span></h2><p>Recovery is personal. RESET brings daily structure, encouragement and a reason to keep showing up.</p></div>
          <div className="promote-feature-list">{features.map(({ icon: Icon, title, copy }, i) => <article key={title}><span className="promote-feature-number">0{i + 1}</span><Icon className="promote-feature-icon" /><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div>
        </section>

        <section className="promote-gallery-band">
          <div className="promote-wrap promote-gallery">
            <div><p className="promote-eyebrow">A LOOK INSIDE RESET</p><h2>Earn it.<br />Unlock it.<br /><span className="promote-script">Make it yours.</span></h2><p>Explore your level rewards or meet your next companion in the daily shop.</p><div className="promote-tabs" role="group" aria-label="App screenshots"><Button variant={screen === "levels" ? "default" : "ghost"} onClick={() => setScreen("levels")}><Trophy /> Level rewards</Button><Button variant={screen === "shop" ? "default" : "ghost"} onClick={() => setScreen("shop")}><Diamond /> Daily shop</Button></div><p className="promote-caption">Actual RESET screens with invented example data. Not someone’s recovery record.</p></div>
            <figure className="promote-screenshot"><img key={screen} src={screen === "levels" ? progression.url : shop.url} alt={screen === "levels" ? "RESET’s actual level progression and gem rewards screen" : "RESET’s actual daily item shop with collectible characters"} loading="lazy" /><figcaption>{screen === "levels" ? "01 / THE PROGRESSION PATH" : "02 / THE DAILY DROP"}</figcaption></figure>
          </div>
        </section>

        <section id="live-preview" className="promote-live promote-wrap">
          <div className="promote-live-heading"><div><p className="promote-eyebrow">NOT JUST A SCREENSHOT</p><h2>Meet your next <span className="promote-script">fresh start.</span></h2></div><OpenApp /></div>
          <div className="promote-live-window"><div className="promote-window-bar"><span className="promote-window-dots">● ● ●</span><span>resetapprecovery.lovable.app</span><ArrowUpRight /></div>
            {live ? <iframe title="Live RESET recovery app" src={appUrl} allow="" referrerPolicy="strict-origin-when-cross-origin" /> : <div className="promote-live-cover"><Sparkles /><span className="promote-wordmark">RESET</span><p className="promote-script">Your journey is waiting.</p><Button size="lg" className="promote-cta" onClick={() => setLive(true)}><Play /> Load live preview</Button></div>}
          </div>
          <p className="promote-live-fallback">The live app loads only when you choose. If it doesn’t appear here, <a href={appUrl} target="_blank" rel="noopener noreferrer">open RESET in a new tab <ArrowUpRight /></a>.</p>
        </section>

        <section className="promote-final"><div className="promote-wrap"><p className="promote-eyebrow">YOU DON’T HAVE TO DO IT ALL TODAY</p><h2>Just take the <span className="promote-script">next step.</span></h2><OpenApp>Start with RESET</OpenApp><p>RESET supports habits and self-reflection. It is not a substitute for professional treatment or emergency care.</p></div></section>
      </main>
      <footer className="promote-footer promote-wrap"><span className="promote-wordmark">RESET</span><span>Your gamified recovery journey.</span><a href={appUrl} target="_blank" rel="noopener noreferrer">Open the app <ArrowUpRight /></a></footer>
    </div>
  );
}