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
  autoFuel: number;
  activeFuel: number;
  defenseRating: number | null;
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
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="h-72 w-full" aria-label="Team scoring trends by match">
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
            <Line type="monotone" dataKey="points" name="Observed points" stroke="#0ea5e9" strokeWidth={3} />
            <Line type="monotone" dataKey="activeFuel" name="Active FUEL" stroke="#f59e0b" strokeWidth={2} />
            <Line type="monotone" dataKey="autoFuel" name="Autonomous FUEL" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-72 w-full" aria-label="Team defense trends by match">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="match" />
            <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              connectNulls
              dataKey="defenseRating"
              name="Defense rating"
              stroke="#a855f7"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
