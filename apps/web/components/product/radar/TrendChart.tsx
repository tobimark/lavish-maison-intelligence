'use client';

import type { PackageTrend } from '../../../demo/poc/api/product-contract';
import styles from '../workspace.module.css';

interface TrendChartProps {
  trends: PackageTrend[];
}

const WIDTH = 520;
const HEIGHT = 190;
const PAD_LEFT = 42;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 34;

function xFor(index: number, total: number): number {
  if (total <= 1) return PAD_LEFT;
  return PAD_LEFT + ((WIDTH - PAD_LEFT - PAD_RIGHT) * index) / (total - 1);
}

function yFor(value: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  return PAD_TOP + ((HEIGHT - PAD_TOP - PAD_BOTTOM) * (100 - clamped)) / 100;
}

function seriesPoints(points: Array<{ value: number }>): string {
  return points.map((point, index) => `${xFor(index, points.length).toFixed(1)},${yFor(point.value).toFixed(1)}`).join(' ');
}

export function TrendChart({ trends }: TrendChartProps) {
  if (trends.length === 0) return null;
  const first = trends[0];
  const totals = trends.map((trend) => trend.points.length);
  const maxPoints = Math.max(...totals);
  const xLabels = first.points.map((point) => new Date(point.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
  return (
    <div className={styles.chartWrap}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Illustrative interest index. ${trends.map((trend) => trend.title).join('; ')}.`}
        data-testid="trend-chart"
      >
        {[0, 25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(value)} y2={yFor(value)} stroke="#E8E5DF" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={yFor(value) + 4} textAnchor="end" fontSize={11} fill="#6B6961">
              {value}
            </text>
          </g>
        ))}
        {trends.map((trend, index) => (
          <g key={trend.id}>
            <polyline
              fill="none"
              stroke={index === 0 ? '#816333' : '#8A8A82'}
              strokeWidth={index === 0 ? 2.4 : 1.8}
              strokeDasharray={index === 0 ? undefined : '5 5'}
              points={seriesPoints(trend.points)}
            />
            {trend.points.map((point, pointIndex) => (
              <circle
                key={`${trend.id}-${point.at}`}
                cx={xFor(pointIndex, trend.points.length)}
                cy={yFor(point.value)}
                r={index === 0 ? 3 : 2.2}
                fill={index === 0 ? '#816333' : '#8A8A82'}
              />
            ))}
          </g>
        ))}
        {xLabels.map((label, index) => (
          <text
            key={label}
            x={xFor(index, maxPoints)}
            y={HEIGHT - 12}
            textAnchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'}
            fontSize={10.5}
            fill="#6B6961"
          >
            {label}
          </text>
        ))}
      </svg>
      <div className={styles.chartLegend}>
        <span>
          <span className={styles.legendSwatch} style={{ background: '#816333' }} aria-hidden="true" />
          {first.title}
        </span>
        {trends.slice(1).map((trend) => (
          <span key={trend.id}>
            <span className={styles.legendSwatch} style={{ background: '#8A8A82' }} aria-hidden="true" />
            {trend.title}
          </span>
        ))}
        <span>0–100 Illustrative interest index</span>
      </div>
      <p className={styles.muted}>
        Window {new Date(first.window.start).toLocaleDateString('en-GB')} – {new Date(first.window.end).toLocaleDateString('en-GB')} · synthetic series; not platform counts, engagement or growth.
      </p>
    </div>
  );
}
