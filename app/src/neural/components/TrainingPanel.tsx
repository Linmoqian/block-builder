import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrainDashboard, LossPoint } from './TrainDashboard';

const API = 'http://localhost:8080';

type TrainStatus = 'idle' | 'running' | 'done' | 'error';

const STATUS_VARIANT: Record<TrainStatus, 'outline' | 'secondary' | 'default' | 'destructive'> = {
  idle: 'outline',
  running: 'secondary',
  done: 'default',
  error: 'destructive',
};

const STATUS_LABEL: Record<TrainStatus, string> = { idle: '就绪', running: '训练中', done: '已完成', error: '出错' };
const STATUS_DOT: Record<TrainStatus, string> = {
  idle: 'bg-zinc-300', running: 'bg-blue-500 animate-pulse', done: 'bg-emerald-500', error: 'bg-red-500',
};

const DATASETS = [
  { value: 'coco128.yaml', label: 'COCO 128' },
  { value: 'coco8.yaml', label: 'COCO 8' },
  { value: 'VOC.yaml', label: 'VOC' },
];

const MODELS = [
  { group: 'YOLOv5', items: [
    { value: 'yolov5n.yaml', label: 'Nano' }, { value: 'yolov5s.yaml', label: 'Small' },
    { value: 'yolov5m.yaml', label: 'Medium' }, { value: 'yolov5l.yaml', label: 'Large' },
    { value: 'yolov5x.yaml', label: 'XL' },
  ]},
  { group: 'YOLOv8', items: [
    { value: 'yolov8n.yaml', label: 'Nano' }, { value: 'yolov8s.yaml', label: 'Small' },
    { value: 'yolov8m.yaml', label: 'Medium' }, { value: 'yolov8l.yaml', label: 'Large' },
    { value: 'yolov8x.yaml', label: 'XL' },
  ]},
  { group: 'YOLO11', items: [
    { value: 'yolo11n.yaml', label: 'Nano' }, { value: 'yolo11s.yaml', label: 'Small' },
    { value: 'yolo11m.yaml', label: 'Medium' }, { value: 'yolo11l.yaml', label: 'Large' },
    { value: 'yolo11x.yaml', label: 'XL' },
  ]},
];

const OPTIMIZERS = [
  { value: 'auto', label: 'Auto' },
  { value: 'SGD', label: 'SGD' },
  { value: 'Adam', label: 'Adam' },
  { value: 'AdamW', label: 'AdamW' },
];

interface HistoryRun {
  name: string;
  has_weights: boolean;
  model?: string;
  epochs?: number;
  data?: string;
  imgsz?: number;
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[K/g, '');
}

function parseAllProgress(log: string): LossPoint[] {
  const lines = stripAnsi(log).split('\n');
  const points: LossPoint[] = [];
  for (const line of lines) {
    const m = line.match(/(\d+)\/\d+\s+\d+G\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+\d+\s+\d+/);
    if (m) {
      const epoch = parseInt(m[1], 10);
      const pt: LossPoint = { epoch, box: parseFloat(m[2]), cls: parseFloat(m[3]), dfl: parseFloat(m[4]) };
      const last = points[points.length - 1];
      if (!last || last.epoch !== epoch) {
        points.push(pt);
      }
    }
  }
  return points;
}

export function TrainingPanel() {
  const [status, setStatus] = useState<TrainStatus>('idle');
  const [log, setLog] = useState('');
  const [model, setModel] = useState('yolov8n.yaml');
  const [epochs, setEpochs] = useState(1);
  const [imgsz, setImgsz] = useState(128);
  const [dataset, setDataset] = useState('coco128.yaml');
  const [batch, setBatch] = useState(16);
  const [lr0, setLr0] = useState(0.01);
  const [optimizer, setOptimizer] = useState('auto');
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [inferencing, setInferencing] = useState(false);
  const [inferenceLog, setInferenceLog] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lossHistory, setLossHistory] = useState<LossPoint[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/train-status`);
      const data = await res.json();
      setStatus(data.status as TrainStatus);
      setLog(data.log || '');
      if (data.log) {
        setLossHistory(parseAllProgress(data.log));
      }
      if (data.status === 'done' || data.status === 'error') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch { /* server not running */ }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/train-history`);
      const data = await res.json();
      setHistory(data.runs || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { pollStatus(); loadHistory(); }, [pollStatus, loadHistory]);

  const startTraining = useCallback(async () => {
    try {
      setStatus('running');
      setLog('');
      setInferenceLog('');
      setLossHistory([]);
      await fetch(`${API}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, epochs, imgsz, data: dataset, batch, lr0, optimizer }),
      });
      pollRef.current = setInterval(pollStatus, 2000);
    } catch (e) {
      setLog(`Failed to start: ${e instanceof Error ? e.message : String(e)}`);
      setStatus('error');
    }
  }, [model, epochs, imgsz, dataset, batch, lr0, optimizer, pollStatus]);

  const stopTraining = useCallback(async () => {
    try {
      await fetch(`${API}/train-stop`, { method: 'POST' });
      setStatus('idle');
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      pollStatus();
    } catch { /* ignore */ }
  }, [pollStatus]);

  const runInference = useCallback(async () => {
    try {
      setInferencing(true);
      setInferenceLog('Running inference...');
      const res = await fetch(`${API}/inference`, { method: 'POST' });
      const data = await res.json();
      setInferenceLog(stripAnsi(data.log || ''));
      loadHistory();
    } catch (e) {
      setInferenceLog(`Inference failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setInferencing(false);
    }
  }, [loadHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Config section */}
      {status !== 'running' && (
        <div className="p-4 space-y-3 border-b border-zinc-100/50">
          <div>
            <Label className="text-xs text-zinc-500 font-medium">Model</Label>
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full mt-0.5 py-1.5 px-2 text-xs font-medium text-zinc-600 bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200 rounded-md cursor-pointer">
              {MODELS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-zinc-500 font-medium">Epochs</Label>
              <Input type="number" min={1} max={100} value={epochs}
                onChange={(e) => setEpochs(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 text-xs rounded-lg mt-0.5" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-zinc-500 font-medium">Image Size</Label>
              <Input type="number" min={32} max={640} step={32} value={imgsz}
                onChange={(e) => setImgsz(Math.max(32, parseInt(e.target.value) || 128))} className="h-8 text-xs rounded-lg mt-0.5" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-zinc-500 font-medium">Dataset</Label>
              <select value={dataset} onChange={(e) => setDataset(e.target.value)}
                className="w-full mt-0.5 py-1.5 px-2 text-xs font-medium text-zinc-600 bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200 rounded-md cursor-pointer">
                {DATASETS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-zinc-500 font-medium">Batch</Label>
              <Input type="number" min={1} max={128} value={batch}
                onChange={(e) => setBatch(Math.max(1, parseInt(e.target.value) || 16))} className="h-8 text-xs rounded-lg mt-0.5" />
            </div>
          </div>

          {/* Advanced toggle */}
          <button onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            {showAdvanced ? '收起高级参数' : '展开高级参数'}
          </button>
          {showAdvanced && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-zinc-500 font-medium">Learning Rate</Label>
                <Input type="number" min={0.0001} max={1} step={0.001} value={lr0}
                  onChange={(e) => setLr0(parseFloat(e.target.value) || 0.01)} className="h-8 text-xs rounded-lg mt-0.5" />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-zinc-500 font-medium">Optimizer</Label>
                <select value={optimizer} onChange={(e) => setOptimizer(e.target.value)}
                  className="w-full mt-0.5 py-1.5 px-2 text-xs font-medium text-zinc-600 bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200 rounded-md cursor-pointer">
                  {OPTIMIZERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-100/50">
        {status !== 'running' ? (
          <Button size="sm" onClick={startTraining}
            className="bg-[#007AFF] hover:bg-[#0066DD] text-white text-xs font-semibold rounded-md">
            开始训练
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={stopTraining}
            className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold rounded-md">
            停止
          </Button>
        )}
        <Badge variant={STATUS_VARIANT[status]} className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {STATUS_LABEL[status]}
        </Badge>
        {status === 'done' && (
          <Button size="sm" variant="outline" onClick={runInference} disabled={inferencing}
            className="ml-auto text-xs font-semibold rounded-md">
            {inferencing ? '验证中...' : '推理验证'}
          </Button>
        )}
      </div>

      {/* Inference result */}
      {inferenceLog && (
        <div className="bg-purple-50/80 rounded-md mx-3 my-1 px-3 py-1.5 border-b border-zinc-100/50">
          <p className="text-xs text-purple-700 font-medium">推理验证</p>
          <pre className="text-xs text-purple-600 whitespace-pre-wrap mt-0.5 max-h-24 overflow-y-auto">{inferenceLog}</pre>
        </div>
      )}

      {/* History */}
      {history.length > 0 && status !== 'running' && (
        <div className="px-3 py-1.5 border-b border-zinc-100/50">
          <p className="text-xs text-zinc-500 font-medium mb-1">训练历史 ({history.length})</p>
          <div className="max-h-20 overflow-y-auto space-y-0.5">
            {history.slice(0, 5).map((run) => (
              <div key={run.name} className="flex items-center gap-1.5 text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${run.has_weights ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                <span className="text-zinc-600 font-medium">{run.name}</span>
                {run.model && <span className="text-zinc-400">{run.model.replace('.yaml', '')}</span>}
                {run.epochs && <span className="text-zinc-400">{run.epochs}ep</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard (replaces old terminal log) */}
      <TrainDashboard status={status} log={log} lossHistory={lossHistory} totalEpochs={epochs} />
    </div>
  );
}
