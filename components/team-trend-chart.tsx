'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type TeamTrend = {
  matchKey: string;
  matchNumber: number;
  points: number;
  activeFuel: number;
  cycleSeconds: number;
};

export function TeamTrendChart({ trends }: { trends: TeamTrend[] }) {
  if (trends.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No synchronized matches to chart yet.
      </p>
    );
  const data = trends.map((trend) => ({
    ...trend,
    match: `Q${trend.matchNumber}`,
  }));
  return (
    <div className="h-72 w-full" aria-label="Team performance trends by match">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="match" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="points"
            name="Observed points"
            stroke="#0ea5e9"
            strokeWidth={3}
          />
          <Line
            type="monotone"
            dataKey="activeFuel"
            name="Active FUEL"
            stroke="#f59e0b"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="cycleSeconds"
            name="Cycle seconds"
            stroke="#22c55e"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
