import React, { useState } from 'react';
import { useApp } from './ThemeContext.tsx';

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================
interface LineChartData {
  label: string;
  value: number;
}

interface BarChartData {
  label: string;
  income: number;
  expense: number;
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

// ============================================================================
// LINE CHART COMPONENT
// ============================================================================
export const PremiumLineChart: React.FC<{ data: LineChartData[]; color?: string }> = ({ 
  data, 
  color = '#2563EB' 
}) => {
  const { currencySymbol } = useApp();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return <div className="text-center py-10 opacity-50 text-xs">No chart data available</div>;

  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.value), 100);
  const minVal = 0;
  const valueRange = maxVal - minVal;

  // Generate points
  const points = data.map((d, idx) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / valueRange) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  // Create SVG path string
  let pathD = '';
  let areaD = '';

  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    // Splined curve
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    // Closed path for gradient area
    areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Y-Axis markers
  const yAxisTicks = [0, 0.5, 1].map(ratio => {
    const val = minVal + ratio * valueRange;
    const y = paddingTop + chartHeight - ratio * chartHeight;
    return { val, y };
  });

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {yAxisTicks.map((tick, idx) => (
          <g key={idx} className="opacity-10 dark:opacity-20">
            <line 
              x1={paddingLeft} 
              y1={tick.y} 
              x2={width - paddingRight} 
              y2={tick.y} 
              stroke="currentColor" 
              strokeWidth="1" 
              strokeDasharray="4 4" 
            />
            <text 
              x={paddingLeft - 8} 
              y={tick.y + 4} 
              textAnchor="end" 
              className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]"
            >
              {tick.val >= 1000 ? `${(tick.val / 1000).toFixed(1)}k` : Math.round(tick.val)}
            </text>
          </g>
        ))}

        {/* Shaded Area Under Line */}
        {areaD && (
          <path d={areaD} fill="url(#lineAreaGrad)" />
        )}

        {/* Line Path */}
        {pathD && (
          <path 
            d={pathD} 
            fill="none" 
            stroke={color} 
            strokeWidth="3" 
            strokeLinecap="round" 
            className="drop-shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
          />
        )}

        {/* Interactive Dots & Hover Bars */}
        {points.map((p, idx) => (
          <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
            {/* Transparent hover catcher */}
            <rect 
              x={p.x - 15} 
              y={paddingTop} 
              width="30" 
              height={chartHeight} 
              fill="transparent" 
              className="cursor-pointer" 
            />

            {/* Vertical hover line indicator */}
            {hoveredIdx === idx && (
              <line 
                x1={p.x} 
                y1={paddingTop} 
                x2={p.x} 
                y2={paddingTop + chartHeight} 
                stroke={color} 
                strokeWidth="1" 
                strokeOpacity="0.3"
              />
            )}

            {/* Accent dot */}
            <circle 
              cx={p.x} 
              cy={p.y} 
              r={hoveredIdx === idx ? 6 : 4} 
              fill={hoveredIdx === idx ? color : 'white'} 
              stroke={color} 
              strokeWidth="2.5" 
              className="transition-all duration-150 shadow"
            />
          </g>
        ))}

        {/* X-Axis labels */}
        {points.map((p, idx) => (
          <text 
            key={idx} 
            x={p.x} 
            y={paddingTop + chartHeight + 18} 
            textAnchor="middle" 
            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-sans font-medium"
          >
            {p.label}
          </text>
        ))}
      </svg>

      {/* Floating tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div 
          className="absolute z-10 p-2 rounded-xl text-[11px] font-semibold bg-slate-900 text-white shadow-xl pointer-events-none transition-all duration-150 border border-slate-800/80"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 32}%`,
            transform: 'translateX(-50%)'
          }}
        >
          {points[hoveredIdx].label}: <span className="text-emerald-400 font-mono">{currencySymbol}{points[hoveredIdx].value.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// COMPACT CUSHIONED DONUT CHART COMPONENT (PIE)
// ============================================================================
export const PremiumPieChart: React.FC<{ data: PieChartData[] }> = ({ data }) => {
  const { currencySymbol } = useApp();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return <div className="text-center py-10 opacity-50 text-xs">No statistics available</div>;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const radius = 70;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = -90; // Start at 12 o'clock

  const slices = data.map((d, idx) => {
    const percentage = total > 0 ? d.value / total : 0;
    const strokeDashoffset = circumference - percentage * circumference;
    const angleRotation = accumulatedAngle;
    accumulatedAngle += percentage * 360;

    return {
      ...d,
      percentage,
      strokeDashoffset,
      angleRotation
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-around gap-6">
      {/* Circle Donut Graph */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform rotate-0">
          <circle 
            cx={center} 
            cy={center} 
            r={radius} 
            fill="transparent" 
            stroke="currentColor" 
            strokeWidth={strokeWidth} 
            className="text-slate-100 dark:text-slate-800/40" 
          />

          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={activeIdx === idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-pointer origin-center"
              style={{
                transform: `rotate(${slice.angleRotation}deg)`
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
            />
          ))}
        </svg>

        {/* Central Display Stat */}
        <div className="absolute flex flex-col items-center select-none text-center">
          {activeIdx !== null ? (
            <>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {slices[activeIdx].name}
              </span>
              <span className="text-lg font-bold font-mono text-slate-800 dark:text-white transition-all">
                {currencySymbol}{slices[activeIdx].value.toFixed(0)}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold">
                {(slices[activeIdx].percentage * 100).toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Total Cap</span>
              <span className="text-xl font-black font-mono text-slate-800 dark:text-white">{currencySymbol}{total.toFixed(0)}</span>
              <span className="text-[10px] text-slate-400 font-medium">{slices.length} categories</span>
            </>
          )}
        </div>
      </div>

      {/* Side Color Indicators list */}
      <div className="flex flex-col gap-2.5 max-w-[160px] w-full">
        {slices.map((slice, idx) => (
          <div 
            key={idx} 
            className={`flex items-center justify-between gap-3 text-xs font-semibold p-1.5 rounded-xl cursor-pointer transition-colors ${
              activeIdx === idx ? 'bg-slate-100 dark:bg-slate-800/60' : ''
            }`}
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{slice.name}</span>
            </div>
            <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {(slice.percentage * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


// ============================================================================
// BAR CHART (INCOME VS EXPENSE COMPARATIVE BAR)
// ============================================================================
export const PremiumBarChart: React.FC<{ data: BarChartData[] }> = ({ data }) => {
  const { currencySymbol } = useApp();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return <div className="text-center py-10 opacity-50 text-xs">No cash flow logs</div>;

  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(
    ...data.flatMap(d => [d.income, d.expense]),
    100
  );
  const minVal = 0;
  const valueRange = maxVal - minVal;

  const barGroupWidth = chartWidth / data.length;
  const barWidth = Math.max(barGroupWidth * 0.25, 6);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Gridlines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + chartHeight - ratio * chartHeight;
          const label = minVal + ratio * valueRange;
          return (
            <g key={idx} className="opacity-10 dark:opacity-20">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="currentColor" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-500 dark:fill-slate-400 font-mono text-[10px]">
                {label >= 1000 ? `${(label / 1000).toFixed(1)}k` : Math.round(label)}
              </text>
            </g>
          );
        })}

        {/* Dynamic Bars */}
        {data.map((d, idx) => {
          const groupCenterX = paddingLeft + idx * barGroupWidth + barGroupWidth / 2;
          
          // Income Bar Heights
          const incHeight = (d.income / valueRange) * chartHeight;
          const incY = paddingTop + chartHeight - incHeight;
          const incX = groupCenterX - barWidth - 2;

          // Expense Bar Heights
          const expHeight = (d.expense / valueRange) * chartHeight;
          const expY = paddingTop + chartHeight - expHeight;
          const expX = groupCenterX + 2;

          return (
            <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
              {/* Backing group highlights */}
              {hoveredIdx === idx && (
                <rect 
                  x={groupCenterX - barGroupWidth / 2 + 4} 
                  y={paddingTop - 5} 
                  width={barGroupWidth - 8} 
                  height={chartHeight + 10} 
                  rx="12"
                  fill="currentColor" 
                  className="text-slate-100/50 dark:text-slate-800/30 transition-all duration-150"
                />
              )}

              {/* Income Capsule Bar (emerald accent) */}
              <rect
                x={incX}
                y={incY}
                width={barWidth}
                height={Math.max(incHeight, 2)}
                rx={barWidth / 2}
                className="fill-emerald-500"
              />

              {/* Expense Capsule Bar (rose danger accent) */}
              <rect
                x={expX}
                y={expY}
                width={barWidth}
                height={Math.max(expHeight, 2)}
                rx={barWidth / 2}
                className="fill-rose-500"
              />

              {/* Label Group */}
              <text
                x={groupCenterX}
                y={paddingTop + chartHeight + 18}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500 text-[10px] font-sans font-semibold"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div 
          className="absolute z-10 p-2.5 rounded-xl text-[11px] font-medium bg-slate-900 text-white shadow-xl pointer-events-none transition-all duration-150 border border-slate-800 flex flex-col gap-1"
          style={{
            left: `${((paddingLeft + hoveredIdx * (chartWidth / data.length) + (chartWidth / data.length) / 2) / width) * 100}%`,
            top: `${paddingTop - 15}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <span className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">{data[hoveredIdx].label}</span>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-400">Income:</span>
            <span className="font-mono font-bold">{currencySymbol}{data[hoveredIdx].income.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-rose-400">Expense:</span>
            <span className="font-mono font-bold">{currencySymbol}{data[hoveredIdx].expense.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};


// ============================================================================
// HEATMAP GRID COMPONENT
// ============================================================================
export const PremiumHeatmap: React.FC<{ data: { date: string; value: number }[] }> = ({ data }) => {
  const { currencySymbol } = useApp();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return <div className="text-center py-10 opacity-50 text-xs">No timeline logs</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1);

  // Return appropriate color saturation depending on spending levels
  const getCellColor = (val: number) => {
    if (val === 0) return 'bg-slate-100 dark:bg-slate-800/40 text-slate-200 dark:text-slate-700';
    const ratio = val / maxVal;
    if (ratio < 0.25) return 'bg-indigo-200/60 dark:bg-indigo-900/30 text-indigo-800';
    if (ratio < 0.5) return 'bg-indigo-300 dark:bg-indigo-800/60 text-white';
    if (ratio < 0.75) return 'bg-indigo-500 dark:bg-indigo-600 text-white';
    return 'bg-indigo-600 dark:bg-indigo-500 text-white font-bold ring-2 ring-indigo-400/30 dark:ring-indigo-400/20';
  };

  return (
    <div className="w-full flex flex-col gap-3 relative">
      <div className="grid grid-cols-7 gap-1.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} className="text-center text-[10px] font-bold text-slate-400 select-none pb-1">
            {day}
          </div>
        ))}
        {data.map((item, idx) => {
          const dateObj = new Date(item.date);
          const dayNum = dateObj.getDate();

          return (
            <div 
              key={idx}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-[10px] 
                cursor-pointer transition-all duration-150 relative select-none
                ${getCellColor(item.value)}
                hover:scale-105 hover:shadow-md
              `}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {dayNum}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-1">
        <span>Low Spend</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800/40" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-200/60 dark:bg-indigo-900/30" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-300 dark:bg-indigo-800/60" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-500 dark:bg-indigo-600" />
          <span className="w-2.5 h-2.5 rounded bg-indigo-600 dark:bg-indigo-500" />
        </div>
        <span>High Spend</span>
      </div>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute left-1/2 -top-10 transform -translate-x-1/2 bg-slate-900 text-white text-[11px] p-2 rounded-xl shadow-xl border border-slate-800/80 font-medium pointer-events-none transition-opacity duration-150 flex flex-col items-center">
          <span className="font-bold text-slate-300">{data[hoveredIdx].date}</span>
          <span>Expenses: <span className="text-indigo-400 font-mono font-bold">{currencySymbol}{data[hoveredIdx].value.toFixed(2)}</span></span>
        </div>
      )}
    </div>
  );
};
