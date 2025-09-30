"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Flame, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type WorkoutStatsProps = {
  userId: string;
};

export default function WorkoutStats({ userId }: WorkoutStatsProps) {
  const stats = useQuery(api.workouts.getWorkoutStats, { userId });

  if (!stats) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-20 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  // Transform data for chart
  const chartData = stats.lastSevenDays.map(
    (day: { date: string; workouts: number }) => ({
      date: new Date(day.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      workouts: day.workouts,
    })
  );

  const chartConfig = {
    workouts: {
      label: "Workouts",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-lg border border-gray-300 border-dashed bg-gray-50/50 p-3">
          <div className="flex items-center gap-1.5">
            <Flame className="size-4 text-orange-500" />
            <span className="text-muted-foreground text-xs">Streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-2xl">{stats.currentStreak}</span>
            <span className="text-muted-foreground text-xs">days</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-gray-300 border-dashed bg-gray-50/50 p-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-4 text-primary" />
            <span className="text-muted-foreground text-xs">Total</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-2xl">
              {stats.completedWorkouts}
            </span>
            <span className="text-muted-foreground text-xs">workouts</span>
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      {stats.completedWorkouts > 0 && (
        <div className="rounded-lg border border-gray-300 border-dashed bg-gray-50/50 p-3">
          <h3 className="mb-3 font-medium text-muted-foreground text-xs">
            This Week
          </h3>
          <ChartContainer className="h-24 w-full" config={chartConfig}>
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Bar dataKey="workouts" fill="var(--color-workouts)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
