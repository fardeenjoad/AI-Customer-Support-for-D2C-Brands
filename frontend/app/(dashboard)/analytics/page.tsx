"use client";

import { useAnalytics } from "@/hooks/useAnalytics";
import { StatusPieChart, SentimentBarChart, IntentsBarChart, VolumeAreaChart } from "@/components/dashboard/AnalyticsChart";
import { Card } from "@/components/ui/card";
import { SkeletonCard } from "@/components/common/LoadingSkeleton";
import { TrendingUp, Users, Award } from "lucide-react";

const MOCK_VOLUME_DATA = [
  { date: "May 31", tickets: 24 },
  { date: "Jun 01", tickets: 30 },
  { date: "Jun 02", tickets: 45 },
  { date: "Jun 03", tickets: 35 },
  { date: "Jun 04", tickets: 50 },
  { date: "Jun 05", tickets: 62 },
  { date: "Jun 06", tickets: 75 },
];

export default function AnalyticsReportsPage() {
  const { useGetAnalytics } = useAnalytics();
  const { data: analyticsRes, isLoading } = useGetAnalytics();
  const stats = analyticsRes?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left animate-fadeIn">
      <div className="flex flex-col space-y-1">
        <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
          Deep Analytics
        </h2>
        <p className="text-xs text-text-muted">
          Review resolution metrics, sentiment balances, and AI-categorized customer intents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">CSAT Score</span>
            <span className="text-lg font-bold font-heading text-text-primary mt-0.5">4.8 / 5.0</span>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center shadow-sm shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Active Agents</span>
            <span className="text-lg font-bold font-heading text-text-primary mt-0.5">12 Specialists</span>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-success/10 text-success border border-success/20 flex items-center justify-center shadow-sm shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">AI Match Rate</span>
            <span className="text-lg font-bold font-heading text-text-primary mt-0.5">72.4% Resolved</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VolumeAreaChart
          title="Weekly Ticket Volumes History"
          data={MOCK_VOLUME_DATA}
        />
        <StatusPieChart
          title="Queue Status Distribution"
          data={stats?.tickets_by_status ?? {}}
        />
        <SentimentBarChart
          title="Tone Sentiment Balance"
          data={stats?.tickets_by_sentiment ?? {}}
        />
        <IntentsBarChart
          title="AI Categorized Customer Intents"
          data={stats?.most_common_intents ?? {}}
        />
      </div>
    </div>
  );
}
