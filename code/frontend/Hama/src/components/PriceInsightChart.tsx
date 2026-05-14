import { useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PricePoint } from '../types/product';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';

type PriceInsightChartProps = {
  points: PricePoint[];
  keywordOptions: string[];
};

type ChartPoint = PricePoint & {
  x: number;
  y: number;
};

const chartWidth = 720;
const chartHeight = 318;
const chartPadding = {
  top: 46,
  right: 42,
  bottom: 38,
  left: 38,
};
const chartLeft = chartPadding.left;
const chartRight = chartWidth - chartPadding.right;
const chartTop = chartPadding.top;
const chartBottom = chartHeight - chartPadding.bottom;
const chartInnerWidth = chartRight - chartLeft;
const chartInnerHeight = chartBottom - chartTop;

export function PriceInsightChart({
  points,
  keywordOptions,
}: PriceInsightChartProps) {
  const chartInstanceId = useId().replace(/:/g, '');
  const fillId = `${chartInstanceId}-price-fill`;
  const keywords = keywordOptions.length > 0 ? keywordOptions.slice(0, 5) : ['현재 상품'];
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  const activeKeyword = keywords[activeKeywordIndex] ?? keywords[0];
  const activePoints = useMemo(
    () => createKeywordPoints(points, activeKeyword),
    [activeKeyword, points]
  );

  if (activePoints.length === 0) {
    return (
      <section className={`rounded-[24px] p-5 ${hairline.panelSoft}`}>
        <p className={`text-sm font-semibold ${hairline.quietText}`}>
          가격 흐름을 표시할 데이터가 없습니다.
        </p>
      </section>
    );
  }

  const prices = activePoints.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = Math.round(
    prices.reduce((sum, price) => sum + price, 0) / prices.length
  );
  const range = Math.max(maxPrice - minPrice, 1);
  const lowerBound = Math.max(0, minPrice - range * 0.22);
  const upperBound = maxPrice + range * 0.24;
  const averageY = priceToY(averagePrice, upperBound, lowerBound);
  const coordinates = activePoints.map((point, index) => {
    const x =
      chartLeft +
      (index / Math.max(activePoints.length - 1, 1)) * chartInnerWidth;
    const y = priceToY(point.price, upperBound, lowerBound);

    return { ...point, x, y };
  });
  const latest = coordinates[coordinates.length - 1];
  const minPoint = coordinates.reduce(
    (currentMin, point) => (point.price < currentMin.price ? point : currentMin),
    coordinates[0]
  );
  const maxPoint = coordinates.reduce(
    (currentMax, point) => (point.price > currentMax.price ? point : currentMax),
    coordinates[0]
  );
  const path = buildSmoothPath(coordinates);
  const areaPath = `${path} L ${latest.x} ${chartBottom} L ${chartLeft} ${chartBottom} Z`;
  const canMoveKeyword = keywords.length > 1;

  const moveKeyword = (direction: -1 | 1) => {
    setActiveKeywordIndex((current) => {
      if (!canMoveKeyword) {
        return current;
      }

      return (current + direction + keywords.length) % keywords.length;
    });
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[#D6DEE9] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.76)_48%,rgba(239,246,255,0.58))] p-4 shadow-[0_24px_70px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-md">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-100/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-8 h-52 w-52 rounded-full bg-emerald-100/34 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => moveKeyword(-1)}
            disabled={!canMoveKeyword}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-35 ${hairline.control} ${hairline.controlHover} ${hairline.focus}`}
            aria-label="이전 키워드"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => moveKeyword(1)}
            className={`inline-flex min-h-10 min-w-[116px] items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition ${hairline.controlActive} ${hairline.focus}`}
            aria-label="다음 관련 키워드 보기"
          >
            {activeKeyword}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex max-w-full gap-1.5 overflow-x-auto py-1">
            {keywords
              .filter((keyword) => keyword !== activeKeyword)
              .slice(0, 3)
              .map((keyword, index) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => setActiveKeywordIndex(keywords.indexOf(keyword))}
                  className={`h-8 shrink-0 rounded-full border border-[#D8E0EA] bg-white/54 px-3 text-[11px] font-black text-[#8A94A5] transition hover:border-[#AEB8C8] hover:text-[#111827] ${hairline.focus}`}
                >
                  {index === 0 ? '다음 ' : ''}
                  {keyword}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="relative min-h-[318px] overflow-hidden rounded-[28px] border border-[#D7DEE9] bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full min-h-[318px] w-full overflow-visible"
            role="img"
            aria-label={`${activeKeyword} 가격 흐름 그래프`}
          >
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                <stop offset="72%" stopColor="#2563EB" stopOpacity="0.035" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
              </linearGradient>
            </defs>

            {Array.from({ length: 3 }, (_, index) => {
              const y = chartTop + (index / 2) * chartInnerHeight;

              return (
                <line
                  key={index}
                  x1={chartLeft}
                  x2={chartRight}
                  y1={y}
                  y2={y}
                  stroke="#DCE3EC"
                  strokeDasharray="7 12"
                  strokeLinecap="round"
                  opacity="0.62"
                />
              );
            })}

            <line
              x1={chartLeft}
              x2={chartRight}
              y1={averageY}
              y2={averageY}
              stroke="#7D8796"
              strokeDasharray="8 10"
              strokeLinecap="round"
              strokeWidth="1.4"
              opacity="0.44"
            />
            <text
              x={chartRight - 4}
              y={averageY - 10}
              fill="#7B8494"
              fontSize="12"
              fontWeight="900"
              textAnchor="end"
            >
              기간 평균 {formatWon(averagePrice)}
            </text>

            <path d={areaPath} fill={`url(#${fillId})`} />
            <path
              d={path}
              fill="none"
              stroke="#2563EB"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="6.5"
            />

            {coordinates.map((point, index) => (
              <circle
                key={`${point.label}-${index}`}
                cx={point.x}
                cy={point.y}
                r={index === coordinates.length - 1 ? 6.8 : 5}
                fill="#FFFFFF"
                stroke="#2563EB"
                strokeWidth="3.2"
              />
            ))}

            <circle
              cx={minPoint.x}
              cy={minPoint.y}
              r="7.8"
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="4"
            />
            <circle
              cx={maxPoint.x}
              cy={maxPoint.y}
              r="7.8"
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="4"
            />

            <line
              x1={latest.x}
              x2={latest.x}
              y1={chartTop}
              y2={chartBottom}
              stroke="#CBD5E1"
              strokeDasharray="4 9"
              strokeLinecap="round"
              strokeWidth="1.4"
            />
            <circle
              cx={latest.x}
              cy={latest.y}
              r="7.8"
              fill="#22C55E"
              stroke="#FFFFFF"
              strokeWidth="4.5"
            />

            <PointLabel
              x={clamp(maxPoint.x - 24, chartLeft, chartRight - 150)}
              y={clamp(maxPoint.y - 18, chartTop + 4, chartBottom - 26)}
              label="최고가"
              value={formatWon(maxPrice)}
              color="#EF4444"
            />
            <PointLabel
              x={clamp(minPoint.x - 24, chartLeft, chartRight - 150)}
              y={clamp(minPoint.y + 26, chartTop + 14, chartBottom - 16)}
              label="최저가"
              value={formatWon(minPrice)}
              color="#059669"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

function priceToY(price: number, upper: number, lower: number) {
  return chartTop + ((upper - price) / Math.max(upper - lower, 1)) * chartInnerHeight;
}

function createKeywordPoints(points: PricePoint[], keyword: string) {
  const keywordShift = deterministicRatio(keyword) * 0.08 - 0.04;

  return points.map((point, index) => {
    const wave = Math.sin(index + keyword.length) * 0.018;
    const nextPrice = point.price * (1 + keywordShift + wave);

    return {
      ...point,
      price: Math.max(1000, Math.round(nextPrice / 1000) * 1000),
    };
  });
}

function buildSmoothPath(points: ChartPoint[]) {
  if (points.length < 2) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;

    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function PointLabel({
  x,
  y,
  label,
  value,
  color,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        x="0"
        y="0"
        fill={color}
        fontSize="12.5"
        fontWeight="950"
        paintOrder="stroke"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinejoin="round"
      >
        {label} {value}
      </text>
    </g>
  );
}

function deterministicRatio(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
