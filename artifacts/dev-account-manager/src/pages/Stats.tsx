import { useGetAccountAnalytics } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  available: "#00ff41",
  "in-use": "#00bfff",
  "cooling-down": "#ff8c00",
  archived: "#666",
};

const GREEN_SHADES = ["#00ff41", "#00cc33", "#009926", "#006619", "#00330d"];

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-3xl font-bold text-primary">{value}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border border-border bg-background px-3 py-2 text-xs font-mono">
        <p className="text-muted-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color ?? "#00ff41" }}>
            {p.name}: <span className="text-primary font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Stats() {
  const { data: analytics, isLoading } = useGetAccountAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm animate-pulse">
        {'>'} loading analytics...
      </div>
    );
  }

  if (!analytics) return null;

  const avgCooldown = analytics.averageCooldownHours != null
    ? `${analytics.averageCooldownHours.toFixed(1)}h`
    : "N/A";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {'>'} Usage Statistics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Account activity and distribution breakdown.
        </p>
      </div>

      {/* Summary blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="Total Accounts" value={analytics.totalAccounts} />
        <StatBlock label="Total Uses" value={analytics.totalUses} />
        <StatBlock label="Avg Cooldown" value={avgCooldown} />
        <StatBlock label="Tag Types" value={analytics.tagDistribution.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Status distribution pie chart */}
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Status Distribution
          </h2>
          {analytics.statusDistribution.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={1}
                  stroke="hsl(120 100% 10%)"
                >
                  {analytics.statusDistribution.map((entry, i) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] ?? GREEN_SHADES[i % GREEN_SHADES.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: STATUS_COLORS[value] ?? "#00ff41", fontFamily: "monospace", fontSize: 12 }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tag distribution bar chart */}
        <div className="border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Tags Usage
          </h2>
          {analytics.tagDistribution.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tags found.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.tagDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fill: "#00ff41", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="tag"
                  tick={{ fill: "#00ff41", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="accounts" radius={0}>
                  {analytics.tagDistribution.map((_, i) => (
                    <Cell key={i} fill={GREEN_SHADES[i % GREEN_SHADES.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top accounts by use count */}
      <div className="border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Most Used Accounts
        </h2>
        {analytics.topAccounts.length === 0 || analytics.topAccounts.every(a => a.useCount === 0) ? (
          <p className="text-muted-foreground text-sm">No usage recorded yet. Click "Use Now" on any account to start tracking.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.topAccounts} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <XAxis
                dataKey="email"
                tick={{ fill: "#00ff41", fontSize: 9, fontFamily: "monospace" }}
                angle={-25}
                textAnchor="end"
                interval={0}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#00ff41", fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="useCount" name="uses" radius={0}>
                {analytics.topAccounts.map((entry, i) => (
                  <Cell
                    key={entry.id}
                    fill={STATUS_COLORS[entry.status] ?? GREEN_SHADES[i % GREEN_SHADES.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Legend for colors */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <div className="h-2 w-4" style={{ backgroundColor: color }} />
              {status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
