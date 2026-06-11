"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  Star,
  TicketCheck,
  X,
  Zap,
} from "lucide-react";

/* ─── DATA ─── */

const METRICS = [
  { label: "AI resolution rate", value: 78, suffix: "%" },
  { label: "Median first response", value: 42, suffix: "s" },
  { label: "Urgent tickets routed", value: 3.4, suffix: "k" },
];

const FEATURES = [
  {
    title: "AI replies grounded in brand context",
    description:
      "Give ResolveIQ your brand policies, FAQs, and tone guidelines so routine customer questions receive clear answers immediately.",
    icon: Bot,
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    title: "Human handoff for sensitive cases",
    description:
      "Refunds, angry messages, and uncertain requests are escalated to agents with the full conversation history intact.",
    icon: ShieldCheck,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    title: "One queue for every customer thread",
    description:
      "Agents can filter, assign, reply, and close tickets from one focused workspace built for repeated daily work.",
    icon: TicketCheck,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Analytics for support operations",
    description:
      "Track volume, response patterns, sentiment, intent categories, and bottlenecks without leaving the dashboard.",
    icon: BarChart3,
    gradient: "from-purple-500 to-pink-500",
  },
];

const STEPS = [
  {
    title: "Connect your brand knowledge base",
    description:
      "Add FAQs, policies, tone, and escalation preferences for every brand you support.",
  },
  {
    title: "Embed the portal or support widget",
    description:
      "Give customers a clean place to submit tickets and continue conversations.",
  },
  {
    title: "Let AI answer, route, and summarize",
    description:
      "AI handles routine work while agents focus on high-impact customer cases.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "ResolveIQ gave our support team a cleaner queue and faster first responses without losing our brand tone.",
    founder: "Sarah Jenkins",
    brand: "Aura Skincare",
    role: "Head of Support",
  },
  {
    quote:
      "The handoff workflow is the difference. Our agents see the full customer context before they reply.",
    founder: "Marcus Thorne",
    brand: "Volt Apparel",
    role: "Operations Lead",
  },
  {
    quote:
      "We support multiple storefronts from one workspace now. It is simpler for agents and clearer for managers.",
    founder: "Elena Rostova",
    brand: "Omni Goods",
    role: "Co-Founder",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$0",
    period: "/ month",
    description: "For trials and sandbox testing",
    items: ["1 brand", "100 tickets per month", "FAQ chatbot", "Email support"],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Growth",
    price: "$79",
    period: "/ month",
    description: "For active D2C support teams",
    items: [
      "5 brands",
      "Unlimited tickets",
      "Sentiment routing",
      "Priority support",
    ],
    highlighted: true,
    cta: "Get Started",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large multi-brand operations",
    items: [
      "Unlimited brands",
      "Custom SLA",
      "Dedicated support",
      "SSO & audit log",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

/* ─── HOOKS ─── */

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function useAnimatedCounter(end: number, duration: number = 2000, trigger: boolean = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTime: number;
    let rafId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((eased * end).toFixed(1)));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration, trigger]);

  return value;
}

/* ─── PRODUCT PREVIEW ─── */

function ProductPreview() {
  return (
    <div className="product-preview w-full max-w-6xl mx-auto">
      {/* Browser chrome */}
      <div className="preview-header h-11 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex-1 max-w-xs mx-auto">
          <div className="bg-white/5 rounded-md px-3 py-1 text-center">
            <span className="text-[10px] font-mono text-white/40">
              app.resolveiq.com/dashboard
            </span>
          </div>
        </div>
        <div className="w-14" />
      </div>

      {/* Dashboard content */}
      <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[240px_1fr] bg-white">
        <aside className="hidden lg:block border-r border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold tracking-wide">
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </div>
          <div className="space-y-1 text-xs font-semibold">
            {["Overview", "Human Handoff Queue", "Live Conversations", "Analytics"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`rounded-lg px-3 py-2.5 transition-colors ${
                    index === 1
                      ? "bg-primary/10 text-primary"
                      : "text-text-muted hover:bg-surface-light"
                  }`}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </aside>

        <main className="bg-background p-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Workspace
                </span>
                <h3 className="text-xl font-bold text-text-primary">
                  Support queue
                </h3>
              </div>
              <Button size="sm" variant="secondary">
                <Activity className="h-4 w-4" />
                Live routing
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METRICS.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-border bg-white p-4"
                >
                  <div className="text-2xl font-bold text-text-primary">
                    {metric.value}
                    {metric.suffix}
                  </div>
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
                    <span className="font-semibold text-text-primary">
                      {subject}
                    </span>
                    <span className="text-text-muted">{status}</span>
                    <span
                      className={
                        priority === "Urgent"
                          ? "text-danger font-semibold"
                          : "text-text-muted"
                      }
                    >
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
                  Customer reports a delayed delivery and requests refund
                  status. Sentiment is negative. Suggested action: escalate to
                  agent and provide updated shipment timeline.
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

/* ─── ANIMATED METRIC ─── */

function AnimatedMetric({
  label,
  value,
  suffix,
  trigger,
}: {
  label: string;
  value: number;
  suffix: string;
  trigger: boolean;
}) {
  const animated = useAnimatedCounter(value, 2000, trigger);
  const display = suffix === "%" || suffix === "s" ? Math.round(animated) : animated;

  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl font-extrabold hero-metric-value">
        {display}
        {suffix}
      </div>
      <div className="text-xs font-semibold text-indigo-200/60 mt-2 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */

export default function MarketingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [authHydrated, setAuthHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Scroll animation refs
  const metricsAnim = useScrollAnimation();
  const featuresAnim = useScrollAnimation();
  const workflowAnim = useScrollAnimation();
  const testimonialsAnim = useScrollAnimation();
  const pricingAnim = useScrollAnimation();
  const ctaAnim = useScrollAnimation();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() =>
        setAuthHydrated(true)
      );
      return unsub;
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 40);
      setNavVisible(
        currentScrollY <= lastScrollY.current || currentScrollY < 96
      );
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showWorkspaceCta = authHydrated && isAuthenticated;
  const workspaceHref =
    user?.role === "customer" ? "/portal" : "/dashboard";

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* ─── NAVBAR ─── */}
      <header
        className={`fixed top-0 left-0 w-full h-16 z-50 transition-all duration-300 ${
          navVisible ? "translate-y-0" : "-translate-y-full"
        } ${
          isScrolled
            ? "navbar-glass border-b border-border/50 shadow-sm"
            : "navbar-dark border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <span
              className={`font-extrabold text-sm tracking-wide ${
                isScrolled ? "text-text-primary" : "text-white"
              }`}
            >
              RESOLVE<span className="text-primary">IQ</span>
            </span>
          </Link>

          <nav
            className={`hidden md:flex items-center space-x-8 text-xs font-semibold ${
              isScrolled ? "text-text-muted" : "text-white/60"
            }`}
          >
            <a
              href="#features"
              className={`transition-colors ${
                isScrolled
                  ? "hover:text-text-primary"
                  : "hover:text-white"
              }`}
            >
              Features
            </a>
            <a
              href="#workflow"
              className={`transition-colors ${
                isScrolled
                  ? "hover:text-text-primary"
                  : "hover:text-white"
              }`}
            >
              Workflow
            </a>
            <a
              href="#pricing"
              className={`transition-colors ${
                isScrolled
                  ? "hover:text-text-primary"
                  : "hover:text-white"
              }`}
            >
              Pricing
            </a>
            <Link
              href="/portal"
              className={`transition-colors ${
                isScrolled
                  ? "hover:text-text-primary"
                  : "hover:text-white"
              }`}
            >
              Customer Portal
            </Link>
          </nav>

          <div className={`hidden md:flex items-center space-x-3 transition-opacity duration-300 ${authHydrated ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {showWorkspaceCta ? (
              <Link href={workspaceHref}>
                <Button variant="primary" size="sm" className="btn-shine">
                  Go to Workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      isScrolled
                        ? ""
                        : "!text-white/70 hover:!text-white hover:!bg-white/10"
                    }
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm" className="btn-shine">
                    Start Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={`md:hidden p-1.5 transition-colors ${
              isScrolled
                ? "text-text-muted hover:text-text-primary"
                : "text-white/60 hover:text-white"
            }`}
            title="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
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
            <Link
              href="/portal"
              className="text-sm font-medium text-text-muted hover:text-text-primary"
            >
              Customer Portal
            </Link>
            <div className={`pt-4 border-t border-border flex gap-3 transition-opacity duration-300 ${authHydrated ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {showWorkspaceCta ? (
                <Link href={workspaceHref} className="flex-1">
                  <Button variant="primary" className="w-full text-xs">
                    Go to Workspace
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1">
                    <Button
                      variant="secondary"
                      className="w-full text-xs"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <Button
                      variant="primary"
                      className="w-full text-xs"
                    >
                      Start Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ─── HERO ─── */}
        <section className="hero-section pt-32 pb-20 px-6">
          {/* Animated background elements */}
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <div className="hero-badge mb-6">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                Built for modern D2C support teams
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.05] gradient-heading">
                Customer support automation for D2C&nbsp;brands.
              </h1>

              <p className="mt-6 text-base sm:text-lg text-indigo-200/60 leading-relaxed max-w-2xl">
                Answer common questions instantly, detect negative sentiment,
                and route urgent requests to agents from one clean workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/register">
                  <Button
                    variant="primary"
                    size="lg"
                    className="btn-shine !px-7 !py-3.5 text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/portal">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="!bg-white/5 !border-white/10 !text-white hover:!bg-white/10 hover:!border-white/20 !px-7 !py-3.5 text-base"
                  >
                    Try Demo Portal
                  </Button>
                </Link>
              </div>
            </div>

            {/* Product Preview */}
            <div className="mt-16">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ─── METRICS BAR ─── */}
        <section
          ref={metricsAnim.ref}
          className="hero-section border-y border-white/5 py-12 px-6"
        >
          <div className="hero-grid" style={{ opacity: 0.3 }} />
          <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            {METRICS.map((metric) => (
              <AnimatedMetric
                key={metric.label}
                {...metric}
                trigger={metricsAnim.isVisible}
              />
            ))}
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-24 px-6">
          <div
            ref={featuresAnim.ref}
            className={`max-w-7xl mx-auto animate-on-scroll ${
              featuresAnim.isVisible ? "visible" : ""
            }`}
          >
            <div className="max-w-2xl mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-5">
                <Zap className="h-3.5 w-3.5" />
                Features
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
                Professional support workflows{" "}
                <span className="text-primary">without the clutter.</span>
              </h2>
              <p className="mt-4 text-base text-text-muted leading-relaxed">
                ResolveIQ is designed around the daily work of support managers
                and agents: clear queues, fast context, and reliable routing.
              </p>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 stagger-children ${
                featuresAnim.isVisible ? "visible" : ""
              }`}
            >
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="premium-card">
                    <div className="icon-container mb-5">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-text-primary">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-text-muted leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── WORKFLOW ─── */}
        <section
          id="workflow"
          className="py-24 px-6 section-gradient-top bg-white"
        >
          <div
            ref={workflowAnim.ref}
            className={`max-w-7xl mx-auto animate-on-scroll ${
              workflowAnim.isVisible ? "visible" : ""
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-14 items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-5">
                  <Activity className="h-3.5 w-3.5" />
                  How it works
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
                  A practical{" "}
                  <span className="text-primary">launch workflow.</span>
                </h2>
                <p className="mt-4 text-base text-text-muted leading-relaxed">
                  Configure the support flow once, then manage customer
                  requests from a stable queue-based workspace.
                </p>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children ${
                  workflowAnim.isVisible ? "visible" : ""
                }`}
              >
                {STEPS.map((step, index) => (
                  <div key={step.title} className="workflow-step">
                    <div className="step-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-5 text-sm font-bold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 px-6">
          <div
            ref={testimonialsAnim.ref}
            className={`max-w-7xl mx-auto animate-on-scroll ${
              testimonialsAnim.isVisible ? "visible" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-5">
                  <Star className="h-3.5 w-3.5" />
                  Testimonials
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
                  Trusted by operators who need{" "}
                  <span className="text-primary">support to scale.</span>
                </h2>
                <p className="mt-4 text-base text-text-muted">
                  A clean workspace for busy customer support teams.
                </p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-5 w-5 text-amber-400 fill-current"
                  />
                ))}
              </div>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children ${
                testimonialsAnim.isVisible ? "visible" : ""
              }`}
            >
              {TESTIMONIALS.map((testimonial) => (
                <div
                  key={testimonial.founder}
                  className="testimonial-card"
                >
                  <span className="quote-mark">&ldquo;</span>
                  <p className="text-sm leading-relaxed text-text-primary relative z-10 pt-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-6 border-t border-border pt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                      {testimonial.founder.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-text-primary">
                        {testimonial.founder}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {testimonial.role} · {testimonial.brand}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRICING ─── */}
        <section
          id="pricing"
          className="py-24 px-6 section-gradient-top bg-white"
        >
          <div
            ref={pricingAnim.ref}
            className={`max-w-7xl mx-auto animate-on-scroll ${
              pricingAnim.isVisible ? "visible" : ""
            }`}
          >
            <div className="max-w-2xl mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-[11px] font-semibold text-indigo-600 uppercase tracking-wider mb-5">
                <TicketCheck className="h-3.5 w-3.5" />
                Pricing
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
                Simple plans for{" "}
                <span className="text-primary">growing support teams.</span>
              </h2>
              <p className="mt-4 text-base text-text-muted">
                Start small, then scale with brand volume and agent needs.
              </p>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children ${
                pricingAnim.isVisible ? "visible" : ""
              }`}
            >
              {PRICING.map((plan) => (
                <div
                  key={plan.name}
                  className={`premium-card ${
                    plan.highlighted ? "pricing-highlight" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[10px] font-bold text-white shadow-sm">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-text-muted">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-text-muted leading-relaxed">
                    {plan.description}
                  </p>
                  <ul className="mt-6 space-y-3 border-y border-border py-5">
                    {plan.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-text-primary"
                      >
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-6 block">
                    <Button
                      variant={plan.highlighted ? "primary" : "secondary"}
                      className={`w-full text-sm ${
                        plan.highlighted ? "btn-shine" : ""
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 px-6">
          <div
            ref={ctaAnim.ref}
            className={`max-w-5xl mx-auto animate-on-scroll ${
              ctaAnim.isVisible ? "visible" : ""
            }`}
          >
            <div className="cta-section p-10 sm:p-16 text-center">
              <div className="relative z-10">
                <div className="mx-auto mb-6 h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-heading">
                  Bring every customer thread into one professional workspace.
                </h2>
                <p className="mt-4 text-base text-indigo-200/60 leading-relaxed max-w-xl mx-auto">
                  Launch ResolveIQ for your brand queues and give customers
                  faster answers with cleaner escalation paths.
                </p>
                <Link href="/register" className="mt-8 inline-block">
                  <Button
                    variant="primary"
                    size="lg"
                    className="btn-shine !px-8 !py-4 text-base shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
                  >
                    Get Started for Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="footer-gradient border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <span className="font-extrabold text-text-primary tracking-wide text-sm">
                RESOLVE<span className="text-primary">IQ</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-text-muted">
              <a href="#features" className="hover:text-text-primary transition-colors">
                Features
              </a>
              <a href="#workflow" className="hover:text-text-primary transition-colors">
                Workflow
              </a>
              <a href="#pricing" className="hover:text-text-primary transition-colors">
                Pricing
              </a>
              <Link href="/portal" className="hover:text-text-primary transition-colors">
                Customer Portal
              </Link>
            </div>
            <span className="text-xs text-text-muted">
              © 2026 ResolveIQ Inc. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
