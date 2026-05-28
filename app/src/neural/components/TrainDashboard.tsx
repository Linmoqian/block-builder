import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type TrainStatus = 'idle' | 'running' | 'done' | 'error';

export interface LossPoint {
  epoch: number;
  box: number;
  cls: number;
  dfl: number;
}

interface TrainDashboardProps {
  status: TrainStatus;
  log: string;
  lossHistory: LossPoint[];
  totalEpochs: number;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[K/g, '');
}

// ---------------------------------------------------------------------------
// Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none"
          stroke="#3b82f6" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-blue-400">{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animated Number
// ---------------------------------------------------------------------------

function AnimNum({ value, decimals = 4 }: { value: number; decimals?: number }) {
  return (
    <motion.span
      key={value.toFixed(decimals)}
      initial={{ opacity: 0.4, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="font-mono"
    >
      {value.toFixed(decimals)}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({ label, value, color, prev }: {
  label: string;
  value: number;
  color: string;
  prev?: number;
}) {
  const diff = prev != null ? value - prev : undefined;
  return (
    <div className="flex-1 bg-white/5 rounded-lg px-2.5 py-2 border border-white/5">
      <div className="text-xs text-zinc-400 font-medium mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>
        <AnimNum value={value} />
      </div>
      {diff != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-xs mt-0.5 ${diff <= 0 ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {diff <= 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(4)}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loss Chart
// ---------------------------------------------------------------------------

function LossChart({ data }: { data: LossPoint[] }) {
  if (data.length < 2) return null;

  return (
    <div className="w-full h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="epoch"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 11,
              color: '#e5e7eb',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10, color: '#9ca3af' }} />
          <Line type="monotone" dataKey="box" stroke="#3b82f6" strokeWidth={2} dot={false} name="box" />
          <Line type="monotone" dataKey="cls" stroke="#f59e0b" strokeWidth={2} dot={false} name="cls" />
          <Line type="monotone" dataKey="dfl" stroke="#10b981" strokeWidth={2} dot={false} name="dfl" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Summary
// ---------------------------------------------------------------------------

function ResultsSummary({ log }: { log: string }) {
  const clean = stripAnsi(log);
  const params = clean.match(/summary[^:]*:\s*\d+ layers,\s*([\d,]+)\s+parameters/)?.[1];
  const duration = clean.match(/(\d+)\s+epochs?\s+completed\s+in\s+(.+)/)?.[2]?.trim();
  const savePath = clean.match(/Results saved to\s+(.+)/)?.[1]?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        训练完成
      </div>
      <div className="text-xs text-zinc-400 space-y-0.5">
        {params && <p>{params} 参数{duration ? ` · ${duration}` : ''}</p>}
        {savePath && <p className="truncate" title={savePath}>{savePath}</p>}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Idle Placeholder
// ---------------------------------------------------------------------------

function IdlePlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-zinc-500">
        <div className="text-2xl mb-2 opacity-30">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
            <path d="M12 6V18M6 12H18" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-xs">配置训练参数后点击「开始训练」</p>
        <p className="text-xs mt-0.5 text-zinc-600">训练过程将在此处实时可视化展示</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raw Log Section
// ---------------------------------------------------------------------------

function RawLogSection({ log }: { log: string }) {
  const [open, setOpen] = useState(false);
  const clean = stripAnsi(log);
  if (!clean) return null;

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="inline-block"
        >
          ▸
        </motion.span>
        原始日志
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <pre className="px-3 pb-2 text-xs text-zinc-500 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
              {clean}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export function TrainDashboard({ status, log, lossHistory, totalEpochs }: TrainDashboardProps) {
  if (status === 'idle') {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <IdlePlaceholder />
      </div>
    );
  }

  const current = lossHistory.length;
  const latest = lossHistory[lossHistory.length - 1];
  const prev = lossHistory.length >= 2 ? lossHistory[lossHistory.length - 2] : undefined;

  return (
    <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">
      {/* Progress + Metrics */}
      {(status === 'running' || status === 'done') && latest && (
        <div className="flex items-start gap-3">
          <ProgressRing current={current} total={totalEpochs} />
          <div className="flex-1 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">
              Epoch <span className="text-white font-bold">{current}</span> / {totalEpochs}
            </div>
            <div className="flex gap-1.5">
              <MetricCard label="Box Loss" value={latest.box} color="text-blue-400" prev={prev?.box} />
              <MetricCard label="Cls Loss" value={latest.cls} color="text-amber-400" prev={prev?.cls} />
              <MetricCard label="DFL Loss" value={latest.dfl} color="text-emerald-400" prev={prev?.dfl} />
            </div>
          </div>
        </div>
      )}

      {/* Done results */}
      {status === 'done' && <ResultsSummary log={log} />}

      {/* Error */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            训练出错
          </div>
        </motion.div>
      )}

      {/* Loss Chart */}
      {lossHistory.length >= 2 && (
        <div className="bg-white/[0.02] rounded-lg px-1 py-1 border border-white/5">
          <LossChart data={lossHistory} />
        </div>
      )}

      {/* Running but no data yet */}
      {status === 'running' && !latest && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            等待训练数据...
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Raw Log Toggle */}
      <RawLogSection log={log} />
    </div>
  );
}
