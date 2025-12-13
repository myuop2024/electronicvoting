'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity } from 'lucide-react';

interface TurnoutData {
  time: string;
  votes: number;
  percent: number;
}

export function TurnoutChart({ electionId }: { electionId: string }) {
  const [data, setData] = useState<TurnoutData[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Mock data - in production, fetch from WebSocket
    const mockData: TurnoutData[] = [
      { time: '09:00', votes: 234, percent: 4.68 },
      { time: '10:00', votes: 567, percent: 11.34 },
      { time: '11:00', votes: 945, percent: 18.9 },
      { time: '12:00', votes: 1423, percent: 28.46 },
      { time: '13:00', votes: 1876, percent: 37.52 },
      { time: '14:00', votes: 2234, percent: 44.68 },
      { time: '15:00', votes: 2567, percent: 51.34 },
      { time: '16:00', votes: 2847, percent: 56.94 },
    ];

    setData(mockData);

    // Simulate WebSocket updates
    const interval = setInterval(() => {
      setData(prev => {
        const last = prev[prev.length - 1];
        const newVotes = last.votes + Math.floor(Math.random() * 20);
        const newPercent = (newVotes / 5000) * 100;

        return [
          ...prev,
          {
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            votes: newVotes,
            percent: newPercent,
          },
        ].slice(-20); // Keep last 20 data points
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [electionId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-400 animate-pulse" />
          <span className="text-sm text-gray-400">Live updates every 5 seconds</span>
        </div>
        {isLive && (
          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30">
            ● Live
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Area
            type="monotone"
            dataKey="votes"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorVotes)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Current</p>
          <p className="text-2xl font-bold text-white">
            {data[data.length - 1]?.votes.toLocaleString() || 0}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Turnout %</p>
          <p className="text-2xl font-bold text-blue-400">
            {data[data.length - 1]?.percent.toFixed(2) || 0}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">Growth Rate</p>
          <p className="text-2xl font-bold text-green-400">
            +{Math.floor(Math.random() * 50 + 10)}/hr
          </p>
        </div>
      </div>
    </div>
  );
}
