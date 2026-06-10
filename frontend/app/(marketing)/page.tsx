"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  LifeBuoy,
  Lock,
  Menu,
  MessageSquare,
  ShieldCheck,
  Star,
  TicketCheck,
  X,
} from "lucide-react";

const METRICS = [
  { label: "AI resolution rate", value: "78%" },
  { label: "Median first response", value: "42s" },
  { label: "Urgent tickets routed", value: "3.4k" },
];

const FEATURES = [
  {
    title: "AI replies grounded in brand context",
    description:
      "Give ResolveIQ your brand policies, FAQs, and tone guidelines so routine customer questions receive clear answers immediately.",
    icon: Bot,
  },
  {
    title: "Human handoff for sensitive cases",
    description:
      "Refunds, angry messages, and uncertain requests are escalated to agents with the full conversation history intact.",
    icon: ShieldCheck,
  },
  {
    title: "One queue for every customer thread",
    description:
      "Agents can filter, assign, reply, and close tickets from one focused workspace built for repeated daily work.",
    icon: TicketCheck,
  },
  {
    title: "Analytics for support operations",
    description:
      "Track volume, response patterns, sentiment, intent categories, and bottlenecks without leaving the dashboard.",
    icon: BarChart3,
  },
];

const STEPS = [
  "Connect your brand knowledge base",
  "Embed the portal or support widget",
  "Let AI answer, route, and summarize",
];

const TESTIMONIALS = [
  {
    quote:
      "ResolveIQ gave our support team a cleaner queue and faster first responses without losing our brand tone.",
    founder: "Sarah Jenkins",
    brand: "Aura Skincare",
  },
  {
    quote:
      "The handoff workflow is the difference. Our agents see the full customer context before they reply.",
    founder: "Marcus Thorne",
    brand: "Volt Apparel",
  },
  {
    quote:
      "We support multiple storefronts from one workspace now. It is simpler for agents and clearer for managers.",
    founder: "Elena Rostova",
    brand: "Omni Goods",
  },
];

function ProductPreview() {
  return (
    <div className="w-full max-w-6xl mx-auto rounded-lg border border-border bg-white shadow-xl overflow-hidden">
      <div className="h-10 border-b border-border bg-surface-light flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[10px] font-mono text-text-muted">app.resolveiq.com/dashboard</span>
        <div className="w-14" />
      </div>

      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block border-r border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </div>
          <div className="space-y-2 text-xs font-semibold">
            {["Overview", "Human Handoff Queue", "Live Conversations", "Analytics"].map((item, index) => (
              <div
                key={item}
                className={`rounded-lg px-3 py-2 ${
                  index === 1 ? "bg-primary/10 text-primary" : "text-text-muted"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <main className="bg-background p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Workspace
                </span>
                <h3 className="text-xl font-bold text-text-primary">Support queue</h3>
              </div>
              <Button size="sm" variant="secondary">
                <Activity className="h-4 w-4" />
                Live routing
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METRICS.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-border bg-white p-4">
                  <div className="text-2xl font-bold text-text-primary">{metric.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-1">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
              <div className="rounded-lg border border-border bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_120px_110px] gap-3 border-b border-border bg-surface-light px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-muted max-sm:hidden">
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Priority</span>
                  <span>Owner</span>
                </div>
                {[
                  ["Refund request after delayed shipment", "Open", "Urgent", "Nadia"],
                  ["Need size exchange for order #2048", "In progress", "Medium", "Arjun"],
                  ["Product ingredient question", "AI resolved", "Low", "AI"],
                ].map(([subject, status, priority, owner]) => (
                  <div
                    key={subject}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_110px] gap-2 sm:gap-3 border-b border-border last:border-b-0 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-text-primary">{subject}</span>
                    <span className="text-text-muted">{status}</span>
                    <span className={priority === "Urgent" ? "text-danger font-semibold" : "text-text-muted"}>
                      {priority}
                    </span>
                    <span className="text-text-muted">{owner}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <MessageSquare className="h-4 w-4" />
                  AI summary
                </div>
                <p className="mt-3 text-xs leading-relaxed text-text-muted">
                  Customer reports a delayed delivery and requests refund status. Sentiment is negative.
                  Suggested action: escalate to agent and provide updated shipment timeline.
                </p>
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/15 p-3 text-xs text-text-primary">
                  Draft reply ready for review.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [authHydrated, setAuthHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
      return unsub;
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 40);
      setNavVisible(currentScrollY <= lastScrollY.current || currentScrollY < 96);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showWorkspaceCta = authHydrated && isAuthenticated;
  const workspaceHref = user?.role === "customer" ? "/portal" : "/dashboard";

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header
        className={`fixed top-0 left-0 w-full h-16 border-b z-50 transition-all duration-200 ${
          navVisible ? "translate-y-0" : "-translate-y-full"
        } ${isScrolled ? "border-border bg-white/95 backdrop-blur-md shadow-sm" : "border-transparent bg-white/80"}`}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-text-primary text-sm tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-text-muted">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#workflow" className="hover:text-text-primary transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
            <Link href="/portal" className="hover:text-text-primary transition-colors">Customer Portal</Link>
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {showWorkspaceCta ? (
              <Link href={workspaceHref}>
                <Button variant="primary" size="sm">
                  Go to Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Log In</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Start Free</Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="md:hidden p-1.5 text-text-muted hover:text-text-primary transition-colors"
            title="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white border-b border-border px-6 py-5 flex flex-col space-y-4 text-left md:hidden shadow-lg">
            {["features", "workflow", "pricing"].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-text-muted hover:text-text-primary capitalize"
              >
                {id}
              </a>
            ))}
            <Link href="/portal" className="text-sm font-medium text-text-muted hover:text-text-primary">
              Customer Portal
            </Link>
            <div className="pt-4 border-t border-border flex gap-3">
              {showWorkspaceCta ? (
                <Link href={workspaceHref} className="flex-1">
                  <Button variant="primary" className="w-full text-xs">Go to Workspace</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button variant="secondary" className="w-full text-xs">Log In</Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button variant="primary" className="w-full text-xs">Start Free</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="pt-28 pb-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-5">
                <Clock className="h-3.5 w-3.5" />
                Built for modern D2C support teams
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                ResolveIQ customer support automation for D2C brands.
              </h1>
              <p className="mt-6 text-base sm:text-lg text-text-muted leading-relaxed max-w-2xl">
                Answer common questions instantly, detect negative sentiment, and route urgent requests to agents from one clean light workspace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register">
                  <Button variant="primary" size="lg">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/portal">
                  <Button variant="secondary" size="lg">Try Demo Portal</Button>
                </Link>
              </div>
            </div>

            <div className="mt-12">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-white py-8 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
            {METRICS.map((metric) => (
              <div key={metric.label} className="flex items-baseline justify-between sm:block">
                <div className="text-3xl font-extrabold text-text-primary">{metric.value}</div>
                <div className="text-xs font-semibold text-text-muted mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight">Professional support workflows without the clutter.</h2>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">
                ResolveIQ is designed around the daily work of support managers and agents: clear queues, fast context, and reliable routing.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="h-full">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary">{feature.title}</h3>
                    <p className="mt-2 text-xs text-text-muted leading-relaxed">{feature.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20 px-6 bg-white border-y border-border">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 items-start">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">A practical launch workflow.</h2>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">
                Configure the support flow once, then manage customer requests from a stable queue-based workspace.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {STEPS.map((step, index) => (
                <div key={step} className="rounded-lg border border-border bg-white p-5">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center text-sm font-bold">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-text-primary">{step}</h3>
                  <p className="mt-2 text-xs text-text-muted leading-relaxed">
                    {index === 0 &&
                      "Add FAQs, policies, tone, and escalation preferences for every brand you support."}
                    {index === 1 &&
                      "Give customers a clean place to submit tickets and continue conversations."}
                    {index === 2 &&
                      "AI handles routine work while agents focus on high-impact customer cases."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Trusted by operators who need support to scale.</h2>
                <p className="mt-3 text-sm text-text-muted">A clean workspace for busy customer support teams.</p>
              </div>
              <div className="flex text-warning">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.founder}>
                  <p className="text-sm leading-relaxed text-text-primary">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-5 border-t border-border pt-4 text-xs">
                    <div className="font-bold text-text-primary">{testimonial.founder}</div>
                    <div className="text-text-muted mt-1">{testimonial.brand}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-6 bg-white border-y border-border">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight">Simple plans for growing support teams.</h2>
              <p className="mt-3 text-sm text-text-muted">Start small, then scale with brand volume and agent needs.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                ["Starter", "$0", "For trials and sandbox testing", ["1 brand", "100 tickets per month", "FAQ chatbot"]],
                ["Growth", "$79", "For active D2C support teams", ["5 brands", "Unlimited tickets", "Sentiment routing"]],
                ["Enterprise", "Custom", "For large multi-brand operations", ["Unlimited brands", "Custom SLA", "Dedicated support"]],
              ].map(([name, price, description, items]) => (
                <Card
                  key={name as string}
                  className={(name as string) === "Growth" ? "border-primary shadow-glow" : undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{name as string}</h3>
                    {(name as string) === "Growth" && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">{price as string}</span>
                    {(price as string).startsWith("$") && <span className="text-xs text-text-muted">/ month</span>}
                  </div>
                  <p className="mt-3 text-xs text-text-muted leading-relaxed">{description as string}</p>
                  <ul className="mt-6 space-y-3 border-y border-border py-5">
                    {(items as string[]).map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-xs text-text-primary">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-6 block">
                    <Button variant={(name as string) === "Growth" ? "primary" : "secondary"} className="w-full text-xs">
                      {(name as string) === "Enterprise" ? "Contact Sales" : "Get Started"}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto rounded-lg border border-border bg-white p-8 sm:p-12 text-center">
            <div className="mx-auto mb-5 h-11 w-11 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">Bring every customer thread into one professional workspace.</h2>
            <p className="mt-3 text-sm text-text-muted leading-relaxed max-w-xl mx-auto">
              Launch ResolveIQ for your brand queues and give customers faster answers with cleaner escalation paths.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button variant="primary" size="lg">Get Started for Free</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-text-primary tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </div>
          <span>© 2026 ResolveIQ Inc. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
