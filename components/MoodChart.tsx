
import React from 'react';
import { JournalEntry } from '../types';

interface MoodChartProps {
  entries: JournalEntry[];
}

const MoodChart: React.FC<MoodChartProps> = ({ entries }) => {
  // Map moods to scores (1-5)
  const getMoodScore = (mood?: string) => {
    if (!mood) return 3;
    const lower = mood.toLowerCase();
    if (lower.includes('excited') || lower.includes('ecstatic') || lower.includes('great')) return 5;
    if (lower.includes('happy') || lower.includes('good') || lower.includes('motivated')) return 4;
    if (lower.includes('calm') || lower.includes('neutral') || lower.includes('reflective')) return 3;
    if (lower.includes('sad') || lower.includes('tired') || lower.includes('bored')) return 2;
    if (lower.includes('angry') || lower.includes('anxious') || lower.includes('stressed')) return 1;
    return 3;
  };

  // Sort entries by date and take last 7-10
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);

  if (sortedEntries.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
        <p className="text-gray-400 text-sm">Not enough data for analytics yet.</p>
      </div>
    );
  }

  const dataPoints = sortedEntries.map(e => ({
    date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: getMoodScore(e.mood)
  }));

  // Chart Dimensions
  const width = 100;
  const height = 50;
  const padding = 5;

  // Scaling
  const xScale = (index: number) => padding + (index / (dataPoints.length - 1)) * (width - padding * 2);
  const yScale = (score: number) => height - padding - ((score - 1) / 4) * (height - padding * 2);

  // Generate Path
  const pathD = dataPoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(p.score)}`
  ).join(' ');

  // Gradient area
  const areaD = `${pathD} L ${xScale(dataPoints.length - 1)} ${height} L ${padding} ${height} Z`;

  return (
    <div className="w-full glass-panel p-6 rounded-2xl border border-gray-200 dark:border-white/5">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Mood Flow</h3>
      <div className="relative w-full aspect-[2/1]">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[1, 2, 3, 4, 5].map(score => (
               <line 
                 key={score}
                 x1={padding} 
                 y1={yScale(score)} 
                 x2={width - padding} 
                 y2={yScale(score)} 
                 stroke="currentColor" 
                 strokeOpacity="0.1" 
                 strokeWidth="0.2"
                 className="text-gray-500"
               />
            ))}

            {/* Gradient Fill */}
            <defs>
               <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
               </linearGradient>
            </defs>
            <path d={areaD} fill="url(#moodGradient)" />

            {/* Line */}
            <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Points */}
            {dataPoints.map((p, i) => (
               <g key={i} className="group">
                  <circle 
                    cx={xScale(i)} 
                    cy={yScale(p.score)} 
                    r="2" 
                    fill="#fff" 
                    stroke="#6366f1" 
                    strokeWidth="1"
                    className="transition-all duration-300 group-hover:r-3" 
                  />
                  {/* Tooltip on hover (simple svg text) */}
                  <text 
                     x={xScale(i)} 
                     y={yScale(p.score) - 4} 
                     textAnchor="middle" 
                     fontSize="3" 
                     fill="currentColor"
                     className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-700 dark:text-gray-200 font-bold"
                  >
                     {p.score}/5
                  </text>
                  <text 
                     x={xScale(i)} 
                     y={height + 5} 
                     textAnchor="middle" 
                     fontSize="3" 
                     fill="currentColor"
                     className="text-gray-400"
                  >
                     {p.date}
                  </text>
               </g>
            ))}
         </svg>
      </div>
    </div>
  );
};

export default MoodChart;
