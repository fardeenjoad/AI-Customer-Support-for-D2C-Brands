"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Terminal,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake,
  Bot,
  Activity,
  Star,
  Layers,
  Inbox,
  Lock,
  Menu,
  X,
  ArrowUpRight,
  UserCheck
} from "lucide-react";

// Mock Testimonials data
const TESTIMONIALS = [
  { quote: "ResolveIQ automated 78% of our customer query volume within two weeks. Absolutely game-changing for our operations.", founder: "Sarah Jenkins", brand: "Aura Skincare", rating: 5 },
  { quote: "The negative sentiment auto-escalation routes upset customers directly to our phone queue before they review-bomb us. Pure genius.", founder: "Marcus Thorne", brand: "Volt Apparel", rating: 5 },
  { quote: "Having a multi-brand portal means we support four separate stores from a single clean agent dashboard. The interface is beautiful.", founder: "Elena Rostova", brand: "Omni Goods", rating: 5 },
  { quote: "Groq AI integration makes support responses instant, accurate, and perfectly matched to our brand's unique tone guidelines.", founder: "David Cho", brand: "Peak Nutrition", rating: 5 },
  { quote: "Our CSAT scores rose from 4.1 to 4.9. Our support agents are happier, and customers get refunds resolved in seconds.", founder: "Chloe Moreau", brand: "EcoStyle", rating: 5 }
];

interface StatCounterProps {
  targetValue: string;
  duration?: number;
  suffix?: string;
}

// Stats Bar Counter Component
function StatCounter({ targetValue, duration = 2, suffix = "" }: StatCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(targetValue.replace(/[^0-9]/g, ""), 10);
    if (isNaN(end)) return;

    const totalSteps = 60;
    const stepTime = (duration * 1000) / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.floor((end * step) / totalSteps);
      setCount(current);

      if (step >= totalSteps) {
        clearInterval(timer);
        setCount(end);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetValue, duration]);

  const formattedCount = count.toLocaleString();
  return (
    <span>
      {formattedCount}
      {suffix}
    </span>
  );
}

export default function MarketingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  // Auth Redirection
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "customer") {
        router.replace("/portal");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  // Handle Navbar visibility & backdrop on Scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setNavVisible(false); // Hide on scroll down
      } else {
        setNavVisible(true);  // Show on scroll up
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary overflow-x-hidden selection:bg-primary/30 selection:text-text-primary">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] rounded-full bg-primary/10 blur-[150px] animate-pulse" style={{ animationDuration: "15s" }} />
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[50%] rounded-full bg-accent/5 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute bottom-[10%] left-[10%] w-[70%] h-[55%] rounded-full bg-primary/5 blur-[160px]" />
      </div>

      {/* 1. NAVBAR */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: navVisible ? 0 : -80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed top-0 left-0 w-full h-16 border-b z-50 transition-colors duration-300 ${
          isScrolled 
            ? "border-border/80 bg-surface/75 backdrop-blur-md shadow-glow" 
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8.5 h-8.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-all duration-300 shadow-glow">
              <Terminal className="h-4 w-4 text-glow" />
            </div>
            <span className="font-bold text-text-primary text-sm font-heading tracking-wider flex items-center">
              RESOLVE<span className="text-accent">IQ</span>
              <Zap className="h-3 w-3 text-accent ml-1 fill-accent" />
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-text-muted">
            <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
            <Link href="/portal" className="hover:text-text-primary transition-colors">Customer Portal</Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-xs text-text-muted hover:text-text-primary">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm" className="font-semibold text-xs shadow-glow">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 w-full bg-surface border-b border-border px-6 py-6 flex flex-col space-y-4 text-left z-40 md:hidden shadow-2xl"
            >
              <a 
                href="#features" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                How It Works
              </a>
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Pricing
              </a>
              <Link 
                href="/portal" 
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                Customer Portal
              </Link>
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-4">
                <Link href="/login" className="flex-1">
                  <Button variant="ghost" className="w-full text-xs">Log In</Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button variant="primary" className="w-full text-xs shadow-glow">Start Free</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center z-10">
        {/* Floating particles */}
        <div className="absolute top-[40%] left-[15%] w-2.5 h-2.5 bg-accent/25 rounded-full blur-[2px] animate-bounce" style={{ animationDuration: "6s" }} />
        <div className="absolute top-[60%] right-[15%] w-3 h-3 bg-primary/20 rounded-full blur-[3px] animate-bounce" style={{ animationDuration: "8s" }} />

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 px-3.5 py-1.5 rounded-full text-primary text-[10px] font-bold tracking-wider uppercase mb-6 shadow-glow"
        >
          <Sparkles className="h-3 w-3 animate-spin" style={{ animationDuration: "4s" }} />
          <span>Powered by Groq AI ⚡</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-heading text-text-primary tracking-tight leading-[1.08] max-w-4xl"
        >
          Automate D2C Support with{" "}
          <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent drop-shadow-sm">
            Neural Sentiment Intelligence
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm sm:text-base md:text-lg text-text-muted leading-relaxed max-w-2xl mt-6 font-medium"
        >
          ResolveIQ instantly answers 70% of common queries using brand context, analyzes customer emotions, and auto-routes urgent refund requests directly to agent queues.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap gap-4 justify-center mt-10"
        >
          <Link href="/register">
            <Button variant="primary" size="lg" className="flex items-center space-x-2 px-8 py-3 text-sm shadow-glow transition-all duration-300 hover:scale-[1.02]">
              <span>Start Free Trial</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="secondary" size="lg" className="px-8 py-3 text-sm border-border/80 hover:bg-surface/30">
              Try Demo Portal
            </Button>
          </Link>
        </motion.div>

        {/* Animated Mockup Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="mt-16 w-full max-w-5xl rounded-2xl border border-border bg-surface/25 backdrop-blur-sm p-3 relative shadow-2xl group overflow-hidden"
        >
          {/* Glowing border details */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          {/* Header styling */}
          <div className="h-8 border-b border-border/60 bg-surface/20 flex items-center justify-between px-4 rounded-t-xl select-none">
            <div className="flex space-x-1.5">
              <span className="w-2.5 h-2.5 bg-danger/55 rounded-full" />
              <span className="w-2.5 h-2.5 bg-warning/55 rounded-full" />
              <span className="w-2.5 h-2.5 bg-success/55 rounded-full" />
            </div>
            <div className="text-[10px] text-text-muted font-mono bg-background px-3 py-0.5 rounded border border-border/40">
              app.resolveiq.com/dashboard
            </div>
            <div className="w-10" />
          </div>

          {/* Screenshot/Representation */}
          <div className="aspect-[1.6] w-full rounded-b-xl overflow-hidden relative bg-background flex items-center justify-center p-6 text-left border-t border-border/40 select-none">
            {/* Visual background graphs */}
            <div className="grid grid-cols-3 gap-6 w-full h-full relative z-10 text-xs">
              <div className="border border-border/80 bg-surface/60 rounded-xl p-5 flex flex-col justify-between h-full">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">EcoStyle Support Queue</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-text-primary text-sm font-heading">Active Workstation</h4>
                </div>
                <div className="space-y-3.5 my-4 flex-1 flex flex-col justify-center">
                  <div className="space-y-1 bg-background/50 border border-border/60 p-2.5 rounded-lg">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-text-primary">Refund Request</span>
                      <span className="text-danger font-semibold bg-danger/10 px-1.5 py-0.25 rounded border border-danger/25">High Priority</span>
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-1">Sentiment analysis: Negative intent</p>
                  </div>
                  <div className="space-y-1 bg-background/30 border border-border/40 p-2.5 rounded-lg opacity-60">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-text-primary">Where is order #2034?</span>
                      <span className="text-primary font-semibold bg-primary/10 px-1.5 py-0.25 rounded border border-primary/25">Medium Priority</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-text-muted">
                  <Activity className="h-3.5 w-3.5 text-accent animate-pulse" />
                  <span>AI Sentiment auto-routing enabled</span>
                </div>
              </div>

              <div className="col-span-2 border border-border/80 bg-surface/60 rounded-xl p-5 flex flex-col justify-between h-full relative">
                {/* Glowing area */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="border-b border-border/60 pb-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-text-primary font-bold font-heading">AI Intent & Analytics</span>
                    <span className="text-[10px] text-text-muted">Realtime Groq inference logging</span>
                  </div>
                  <span className="text-[9px] bg-accent/15 text-accent border border-accent/25 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                    Inference: 42ms
                  </span>
                </div>

                <div className="flex-1 my-4 flex flex-col justify-center space-y-3">
                  <div className="flex justify-between items-center text-[11px] border-b border-border/40 pb-2">
                    <span className="text-text-muted">Customer query sentiment</span>
                    <span className="text-success font-semibold flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />Positive (14%)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] border-b border-border/40 pb-2">
                    <span className="text-text-muted">Refund complaints escalated</span>
                    <span className="text-danger font-semibold flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-danger mr-1.5" />Escalated (3)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] border-b border-border/40 pb-2">
                    <span className="text-text-muted">AI Chatbot resolution accuracy</span>
                    <span className="text-accent font-semibold flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5" />94.2%</span>
                  </div>
                </div>

                <div className="bg-background/80 border border-border/80 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Bot className="h-4.5 w-4.5 text-primary" />
                    <span className="text-[11px] font-medium text-text-primary">Groq LLM is replying to #2036...</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                </div>
              </div>
            </div>
            {/* Dark mask overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-85 pointer-events-none" />
          </div>
        </motion.div>
      </section>

      {/* 3. STATS BAR */}
      <section className="border-y border-border/60 bg-surface/20 py-10 px-6 relative z-10 select-none">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight">
              <StatCounter targetValue="10000" suffix="+" />
            </div>
            <p className="text-[11px] text-text-muted font-bold tracking-wider uppercase">Tickets Resolved</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-primary tracking-tight">
              <StatCounter targetValue="99" suffix=".9%" />
            </div>
            <p className="text-[11px] text-text-muted font-bold tracking-wider uppercase">System Uptime</p>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-heading text-accent tracking-tight">
              <span>&lt; </span>
              <StatCounter targetValue="2" suffix="s" />
            </div>
            <p className="text-[11px] text-text-muted font-bold tracking-wider uppercase">AI Response Time</p>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION (Bento Grid) */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative z-10 text-left">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center space-x-2 bg-accent/10 border border-accent/20 px-3 py-1 rounded-full text-accent text-[9px] font-bold tracking-wider uppercase">
            <span>Core Engines</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-text-primary tracking-tight leading-tight">
            Designed for scaling support teams.
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Every component and pipeline is built with high-fidelity telemetry, micro-interactions, and instant AI processing.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: AI Chatbot */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-primary/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group overflow-hidden md:col-span-2"
          >
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
              <Bot className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary flex items-center">
                AI Knowledge Chatbot
                <span className="ml-2 text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Groq Powered</span>
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Connects customer tickets directly to your brand specific FAQ documents using LLM retrieval context. Instantly generates customer-facing support messages with 94%+ accuracy.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Sentiment Analysis */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-accent/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group overflow-hidden"
          >
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-accent/5 rounded-full blur-2xl pointer-events-none group-hover:bg-accent/10 transition-colors" />
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center mb-6">
              <Activity className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary">Emotion & Sentiment Analysis</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Tracks ticket urgency based on client tone. Instantly escalates negative sentiments or refund complaints to high priority.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Ticket Management */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-accent/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center mb-6">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary">Dynamic Ticket Queues</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Filter, paginate, assign, and update ticket properties effortlessly. Role-based scopes keep agents focused on brand tasks.
              </p>
            </div>
          </motion.div>

          {/* Card 4: Multi-brand Config */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-primary/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group overflow-hidden md:col-span-2"
          >
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
              <Layers className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary">Multi-brand Workspace Configuration</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Connect and support multiple D2C brands. Seed specific FAQs, email configs, and custom greetings for each store queue. Agents handle scoped domains from a unified, elegant tab system.
              </p>
            </div>
          </motion.div>

          {/* Card 5: Email Notifications */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-primary/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary">Branded Email Notifications</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Triggers customized transactional HTML emails (via Resend) when tickets are initialized, resolved, or assigned to agents.
              </p>
            </div>
          </motion.div>

          {/* Card 6: Analytics Reports */}
          <motion.div
            whileHover={{ y: -4 }}
            className="border border-border/80 bg-surface/30 p-6 rounded-2xl flex flex-col justify-between hover:border-accent/40 hover:bg-surface/50 hover:shadow-glow transition-all duration-300 relative group overflow-hidden md:col-span-2"
          >
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-accent/5 rounded-full blur-2xl pointer-events-none group-hover:bg-accent/10 transition-colors" />
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold font-heading text-text-primary">Deep Analytics & Reports</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Visual charts powered by Recharts track CSAT trends, ticket queue loads, intent spreads, and agent performance. Resolve bottlenecks with beautiful, actionable reports.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6 bg-surface/10 border-y border-border/60 relative z-10 text-left">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-20">
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-text-primary tracking-tight">
              Installs in minutes.
            </h2>
            <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
              An elite pipeline connecting your customer requests directly to brand knowledge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Step 1 */}
            <div className="space-y-4 relative flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold font-heading flex items-center justify-center text-sm shadow-glow mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-text-primary font-heading">Register Your Brand</h3>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm">
                Add your brand detail configuration, setup tone guidelines (formal vs. casual), custom email alerts, and copy-paste your FAQ documents.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-4 relative flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold font-heading flex items-center justify-center text-sm shadow-glow mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-text-primary font-heading">Embed Customer Widgets</h3>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm">
                Deploy the ResolveIQ chat widget on your store or direct clients to their secure, private customer portal link to tracking transcripts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-4 relative flex flex-col items-start">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold font-heading flex items-center justify-center text-sm shadow-glow mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-text-primary font-heading">AI Automation Active</h3>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm">
                Watch the chatbot answer FAQs instantly. Angry tickets or complex refund queries auto-route priority queues for agent replies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-24 px-6 overflow-hidden relative z-10 select-none bg-background">
        <div className="max-w-7xl mx-auto text-center space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-text-primary tracking-tight">
            Trusted by fast-growing D2C founders.
          </h2>
          <p className="text-xs text-text-muted">
            See how brands automate support logs without losing brand tone.
          </p>
        </div>

        {/* Marquee Row */}
        <div className="relative w-full flex items-center overflow-x-hidden">
          {/* Left/Right blur overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#08080c] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#08080c] to-transparent z-10 pointer-events-none" />

          {/* Scrolling items wrapper */}
          <div className="flex animate-marquee space-x-6 min-w-full">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
              <div
                key={idx}
                className="w-72 sm:w-80 shrink-0 border border-border/80 bg-surface/40 p-5.5 rounded-2xl space-y-4 text-left"
              >
                <div className="flex items-center space-x-1">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-[11px] sm:text-xs text-text-primary italic leading-relaxed">
                  &quot;{t.quote}&quot;
                </p>
                <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px]">
                  <span className="font-bold text-text-primary">{t.founder}</span>
                  <span className="text-text-muted bg-surface/50 border border-border/60 px-2 py-0.5 rounded font-medium">{t.brand}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto relative z-10 text-left">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-text-primary tracking-tight">
            Transparent, predictable pricing.
          </h2>
          <p className="text-xs text-text-muted">
            All plans scale dynamically with your brand ticket volume. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Free */}
          <Card className="flex flex-col justify-between p-8 space-y-8 bg-surface/20 border-border/80 h-full">
            <div className="space-y-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Starter</span>
              <h3 className="text-2xl font-extrabold text-text-primary font-heading">Free Sandbox</h3>
              <p className="text-xs text-text-muted leading-relaxed">Perfect for testing local connections and API sandboxing.</p>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold font-heading text-text-primary">$0</span>
                <span className="text-xs text-text-muted ml-2">/ month</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-text-muted py-6 border-y border-border/40">
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>1 Brand Configuration</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>Up to 100 tickets / month</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>Standard FAQ chatbot routing</span>
              </li>
            </ul>

            <Link href="/register">
              <Button variant="secondary" className="w-full text-xs">Deploy Sandbox</Button>
            </Link>
          </Card>

          {/* Plan 2: Pro */}
          <Card className="flex flex-col justify-between p-8 space-y-8 bg-surface border-primary/50 shadow-glow shadow-primary/10 relative h-full">
            {/* Highlight ribbon */}
            <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-primary text-text-primary text-[9px] font-bold uppercase tracking-wider px-3.5 py-1.25 rounded-full border border-primary-light">
              Most Popular
            </div>

            <div className="space-y-4">
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Growth</span>
              <h3 className="text-2xl font-extrabold text-text-primary font-heading">Pro Scale</h3>
              <p className="text-xs text-text-muted leading-relaxed">For fast growing D2C brands automating support flows.</p>
              <div className="pt-4 flex items-baseline">
                <span className="text-4xl font-extrabold font-heading text-text-primary">$79</span>
                <span className="text-xs text-text-muted ml-2">/ month</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-text-muted py-6 border-y border-border/40">
              <li className="flex items-center space-x-2.5 text-text-primary">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Up to 5 Brand Configs</span>
              </li>
              <li className="flex items-center space-x-2.5 text-text-primary">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Unlimited Support Tickets</span>
              </li>
              <li className="flex items-center space-x-2.5 text-text-primary">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Groq AI Sentiment routing</span>
              </li>
              <li className="flex items-center space-x-2.5 text-text-primary">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Branded Resend HTML emails</span>
              </li>
            </ul>

            <Link href="/register">
              <Button variant="primary" className="w-full text-xs shadow-glow">Start Pro Trial</Button>
            </Link>
          </Card>

          {/* Plan 3: Enterprise */}
          <Card className="flex flex-col justify-between p-8 space-y-8 bg-surface/20 border-border/80 h-full">
            <div className="space-y-4">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Custom</span>
              <h3 className="text-2xl font-extrabold text-text-primary font-heading">Enterprise</h3>
              <p className="text-xs text-text-muted leading-relaxed">For large operations requiring custom models and SLAs.</p>
              <div className="pt-4 flex items-baseline">
                <span className="text-3xl font-extrabold font-heading text-text-primary">Contact Sales</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-text-muted py-6 border-y border-border/40">
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>Unlimited Brand Domains</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>Dedicated model fine-tuning</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>24/7 dedicated support team</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span>99.99% custom SLA uptime</span>
              </li>
            </ul>

            <Link href="/register">
              <Button variant="secondary" className="w-full text-xs">Request custom quote</Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* 8. CTA SECTION */}
      <section className="py-24 px-6 max-w-5xl mx-auto relative z-10 select-none">
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-primary/10 via-surface/40 to-transparent p-12 text-center space-y-6 relative overflow-hidden">
          {/* Decorative blur */}
          <div className="absolute bottom-[-50px] left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-text-primary tracking-tight max-w-xl mx-auto leading-tight">
            Supercharge your customer operations today.
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
            Deploy ResolveIQ on your brand domains and let AI answer tickets, parse sentiments, and coordinate human workflows.
          </p>

          <div className="pt-4">
            <Link href="/register">
              <Button variant="primary" size="lg" className="px-8 shadow-glow transition-all duration-300 hover:scale-[1.02] text-xs font-semibold">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-border bg-surface/30 py-16 px-8 relative z-10 text-left select-none">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4 col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="font-bold text-text-primary text-xs font-heading tracking-wider">
                RESOLVE<span className="text-accent">IQ</span>
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed max-w-xs">
              AI-native customer service workspace configurations built for modern D2C brands.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] text-text-primary font-bold uppercase tracking-wider font-heading">Product</h4>
            <div className="flex flex-col space-y-2 text-[11px] text-text-muted">
              <a href="#features" className="hover:text-text-primary transition-colors">Features</a>
              <a href="#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
              <Link href="/portal" className="hover:text-text-primary transition-colors">Portal Demo</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] text-text-primary font-bold uppercase tracking-wider font-heading">Developer Docs</h4>
            <div className="flex flex-col space-y-2 text-[11px] text-text-muted">
              <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center">
                API Reference
                <ArrowUpRight className="h-2.5 w-2.5 ml-0.5" />
              </span>
              <span className="hover:text-text-primary transition-colors cursor-pointer">FastAPI Swagger</span>
              <span className="hover:text-text-primary transition-colors cursor-pointer">Supabase Seeds</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] text-text-primary font-bold uppercase tracking-wider font-heading">Trust & Security</h4>
            <div className="flex flex-col space-y-2 text-[11px] text-text-muted">
              <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                ISO 27001 Certified
              </span>
              <span className="hover:text-text-primary transition-colors cursor-pointer flex items-center">
                <UserCheck className="h-3 w-3 mr-1" />
                GDPR Compliant
              </span>
              <span className="hover:text-text-primary transition-colors cursor-pointer">Privacy & Terms</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-border/40 mt-12 pt-6 flex flex-wrap items-center justify-between text-[10px] text-text-muted">
          <span>© 2026 ResolveIQ Inc. All rights reserved. Built with Next.js 14 and Groq AI.</span>
          <div className="flex space-x-4 max-sm:mt-2">
            <span className="hover:text-text-primary cursor-pointer transition-colors">Twitter</span>
            <span className="hover:text-text-primary cursor-pointer transition-colors">GitHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
