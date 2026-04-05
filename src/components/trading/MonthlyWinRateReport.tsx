// SENTINEL X - Monthly Win Rate Report (v5)
// Automatic monthly performance summary by session, pair, and strategy

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Clock,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flame,
  Shield,
  Zap,
  Star,
  FileText
} from "lucide-react";
import {
  getSignalHistory,
  getPerformanceStats,
  type SignalRecord
} from "@/engine/performanceTracker";

interface MonthlyWinRateReportProps {
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MonthlyWinRateReport = ({ className }: MonthlyWinRateReportProps) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const allHistory = getSignalHistory();

  // Filter records for selected month
  const monthRecords = useMemo(() => {
    return allHistory.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && r.result !== "PENDING";
    });
  }, [allHistory, selectedMonth, selectedYear]);

  const wins = monthRecords.filter(r => r.result === "WIN").length;
  const losses = monthRecords.filter(r => r.result === "LOSS").length;
  const misses = monthRecords.filter(r => r.result === "MISS").length;
  const total = monthRecords.length;
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const profitFactor = losses > 0 ? wins / losses : wins;
  const avgConfidence = total > 0
    ? monthRecords.reduce((s, r) => s + r.confidence, 0) / total
    : 0;

  // Session breakdown
  const sessionBreakdown = useMemo(() => {
    const sessions = ["London", "NewYork", "Tokyo", "Sydney"] as const;
    return sessions.map(session => {
      const recs = monthRecords.filter(r => r.session === session);
      const w = recs.filter(r => r.result === "WIN").length;
      return {
        session,
        total: recs.length,
        wins: w,
        losses: recs.filter(r => r.result === "LOSS").length,
        winRate: recs.length > 0 ? (w / recs.length) * 100 : 0,
        avgConf: recs.length > 0 ? recs.reduce((s, r) => s + r.confidence, 0) / recs.length : 0
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }, [monthRecords]);

  // Pair breakdown
  const pairBreakdown = useMemo(() => {
    const pairs = [...new Set(monthRecords.map(r => r.asset))];
    return pairs.map(pair => {
      const recs = monthRecords.filter(r => r.asset === pair);
      const w = recs.filter(r => r.result === "WIN").length;
      return {
        pair,
        total: recs.length,
        wins: w,
        losses: recs.filter(r => r.result === "LOSS").length,
        winRate: recs.length > 0 ? (w / recs.length) * 100 : 0,
        avgConf: recs.length > 0 ? recs.reduce((s, r) => s + r.confidence, 0) / recs.length : 0
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }, [monthRecords]);

  // Strategy breakdown
  const strategyBreakdown = useMemo(() => {
    const strats = [...new Set(monthRecords.map(r => r.strategy))];
    return strats.map(strategy => {
      const recs = monthRecords.filter(r => r.strategy === strategy);
      const w = recs.filter(r => r.result === "WIN").length;
      return {
        strategy,
        total: recs.length,
        wins: w,
        losses: recs.filter(r => r.result === "LOSS").length,
        winRate: recs.length > 0 ? (w / recs.length) * 100 : 0,
        avgConf: recs.length > 0 ? recs.reduce((s, r) => s + r.confidence, 0) / recs.length : 0
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }, [monthRecords]);

  // Best streak in month
  const bestStreak = useMemo(() => {
    let streak = 0, best = 0;
    const sorted = [...monthRecords].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (const r of sorted) {
      if (r.result === "WIN") { streak++; if (streak > best) best = streak; }
      else streak = 0;
    }
    return best;
  }, [monthRecords]);

  // Daily breakdown for the month
  const dailyData = useMemo(() => {
    const days = new Map<number, { wins: number; losses: number; total: number }>();
    monthRecords.forEach(r => {
      const day = new Date(r.timestamp).getDate();
      const d = days.get(day) || { wins: 0, losses: 0, total: 0 };
      d.total++;
      if (r.result === "WIN") d.wins++;
      else if (r.result === "LOSS") d.losses++;
      days.set(day, d);
    });
    return days;
  }, [monthRecords]);

  const navigateMonth = (dir: number) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  const getGrade = (wr: number) => {
    if (wr >= 90) return { label: "S+", color: "text-success", bg: "bg-success/20" };
    if (wr >= 80) return { label: "A", color: "text-primary", bg: "bg-primary/20" };
    if (wr >= 70) return { label: "B", color: "text-warning", bg: "bg-warning/20" };
    if (wr >= 60) return { label: "C", color: "text-orange-400", bg: "bg-orange-400/20" };
    return { label: "D", color: "text-destructive", bg: "bg-destructive/20" };
  };

  const grade = getGrade(winRate);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Month Navigator + Overview */}
      <Card className="p-5 border border-border/50 gradient-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Monthly Win Rate Report</h3>
              <p className="text-xs text-muted-foreground">Automated performance summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold min-w-[140px] text-center">
              {MONTHS[selectedMonth]} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}
              disabled={selectedMonth === now.getMonth() && selectedYear === now.getFullYear()}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {total === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No completed trades for {MONTHS[selectedMonth]} {selectedYear}</p>
            <p className="text-xs mt-1">Start scanning to build your report</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
              {/* Grade */}
              <div className={cn("p-3 rounded-lg border text-center", grade.bg, `border-${grade.color}/30`)}>
                <p className="text-xs text-muted-foreground mb-1">Grade</p>
                <p className={cn("text-3xl font-black", grade.color)}>{grade.label}</p>
              </div>
              {/* Win Rate */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-success" />
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
                <p className={cn("text-2xl font-bold", winRate >= 80 ? "text-success" : winRate >= 60 ? "text-warning" : "text-destructive")}>
                  {winRate.toFixed(1)}%
                </p>
                <Progress value={winRate} className="h-1 mt-1" />
              </div>
              {/* Total */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-primary" />
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">{wins}W / {losses}L / {misses}M</p>
              </div>
              {/* Profit Factor */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <p className="text-xs text-muted-foreground">PF</p>
                </div>
                <p className="text-2xl font-bold">{profitFactor.toFixed(2)}</p>
              </div>
              {/* Best Streak */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-warning" />
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
                <p className="text-2xl font-bold text-warning">+{bestStreak}</p>
              </div>
              {/* Avg Confidence */}
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-accent" />
                  <p className="text-xs text-muted-foreground">Avg Conf</p>
                </div>
                <p className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</p>
              </div>
            </div>

            {/* Breakdown Tabs */}
            <Tabs defaultValue="session" className="space-y-3">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="session" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" /> Sessions
                </TabsTrigger>
                <TabsTrigger value="pairs" className="gap-1 text-xs">
                  <BarChart3 className="w-3 h-3" /> Pairs
                </TabsTrigger>
                <TabsTrigger value="strategy" className="gap-1 text-xs">
                  <Award className="w-3 h-3" /> Strategies
                </TabsTrigger>
                <TabsTrigger value="daily" className="gap-1 text-xs">
                  <CalendarDays className="w-3 h-3" /> Daily
                </TabsTrigger>
              </TabsList>

              {/* SESSION TAB */}
              <TabsContent value="session" className="space-y-2">
                {sessionBreakdown.filter(s => s.total > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No session data</p>
                ) : (
                  sessionBreakdown.filter(s => s.total > 0).map((s, i) => (
                    <div key={s.session} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      i === 0 ? "bg-success/10 border border-success/20" : "bg-secondary/20"
                    )}>
                      {i === 0 && <Star className="w-4 h-4 text-success flex-shrink-0" />}
                      <span className="text-sm font-medium w-20">{s.session}</span>
                      <div className="flex-1">
                        <Progress value={s.winRate} className={cn("h-2",
                          s.winRate >= 80 && "[&>div]:bg-success",
                          s.winRate >= 60 && s.winRate < 80 && "[&>div]:bg-primary"
                        )} />
                      </div>
                      <span className={cn("text-sm font-mono font-bold w-14 text-right",
                        s.winRate >= 80 ? "text-success" : s.winRate >= 60 ? "text-primary" : "text-destructive"
                      )}>
                        {s.winRate.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{s.wins}W/{s.losses}L</span>
                      <Badge variant="outline" className="text-xs">{s.total}</Badge>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* PAIRS TAB */}
              <TabsContent value="pairs" className="space-y-2 max-h-[300px] overflow-y-auto">
                {pairBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pair data</p>
                ) : (
                  pairBreakdown.map((p, i) => (
                    <div key={p.pair} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      i === 0 ? "bg-success/10 border border-success/20" : "bg-secondary/20"
                    )}>
                      {i === 0 && <Star className="w-4 h-4 text-success flex-shrink-0" />}
                      <span className="text-sm font-medium w-24 truncate">{p.pair}</span>
                      <div className="flex-1">
                        <Progress value={p.winRate} className={cn("h-2",
                          p.winRate >= 80 && "[&>div]:bg-success",
                          p.winRate >= 60 && p.winRate < 80 && "[&>div]:bg-primary"
                        )} />
                      </div>
                      <span className={cn("text-sm font-mono font-bold w-14 text-right",
                        p.winRate >= 80 ? "text-success" : p.winRate >= 60 ? "text-primary" : "text-destructive"
                      )}>
                        {p.winRate.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{p.wins}W/{p.losses}L</span>
                      <Badge variant="outline" className="text-xs">{p.total}</Badge>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* STRATEGY TAB */}
              <TabsContent value="strategy" className="space-y-2 max-h-[300px] overflow-y-auto">
                {strategyBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No strategy data</p>
                ) : (
                  strategyBreakdown.map((s, i) => (
                    <div key={s.strategy} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      i === 0 ? "bg-success/10 border border-success/20" : "bg-secondary/20"
                    )}>
                      {i === 0 && <Star className="w-4 h-4 text-success flex-shrink-0" />}
                      <span className="text-sm font-medium flex-1 truncate" title={s.strategy}>{s.strategy}</span>
                      <span className={cn("text-sm font-mono font-bold w-14 text-right",
                        s.winRate >= 80 ? "text-success" : s.winRate >= 60 ? "text-primary" : "text-destructive"
                      )}>
                        {s.winRate.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{s.wins}W/{s.losses}L</span>
                      <Badge variant="outline" className="text-xs">Conf {s.avgConf.toFixed(0)}%</Badge>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* DAILY TAB */}
              <TabsContent value="daily" className="space-y-1">
                {dailyData.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No daily data</p>
                ) : (
                  Array.from(dailyData.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([day, data]) => {
                      const dayWinRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
                      return (
                        <div key={day} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
                          <span className="text-xs font-mono text-muted-foreground w-8">D{day}</span>
                          <div className="flex-1 flex gap-0.5 h-4">
                            {data.wins > 0 && (
                              <div className="bg-success rounded-sm" style={{ width: `${(data.wins / data.total) * 100}%` }} />
                            )}
                            {data.losses > 0 && (
                              <div className="bg-destructive rounded-sm" style={{ width: `${(data.losses / data.total) * 100}%` }} />
                            )}
                          </div>
                          <span className={cn("text-xs font-mono w-12 text-right",
                            dayWinRate >= 80 ? "text-success" : dayWinRate >= 60 ? "text-primary" : "text-destructive"
                          )}>
                            {dayWinRate.toFixed(0)}%
                          </span>
                          <span className="text-xs text-muted-foreground w-16 text-right">{data.wins}W/{data.losses}L</span>
                        </div>
                      );
                    })
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </Card>
    </div>
  );
};
