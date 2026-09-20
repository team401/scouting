'use client';

import { useRef, useState } from 'react';
import { Eraser, MousePointer2, Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BoardPoint = { x: number; y: number };
export type RobotMarker = BoardPoint & {
  team: number;
  station: string;
  alliance: 'red' | 'blue';
};
export type BoardStroke = { id: string; color: string; points: BoardPoint[] };
export type TacticalBoardData = {
  robots: RobotMarker[];
  strokes: BoardStroke[];
};

const colors = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ffffff',
  '#111827',
];

export function initialRobotMarkers(
  red: number[],
  blue: number[],
): RobotMarker[] {
  return [
    ...red.map((team, index) => ({
      team,
      station: `R${index + 1}`,
      alliance: 'red' as const,
      x: 125,
      y: 190 + index * 210,
    })),
    ...blue.map((team, index) => ({
      team,
      station: `B${index + 1}`,
      alliance: 'blue' as const,
      x: 1529,
      y: 190 + index * 210,
    })),
  ];
}

export function TacticalBoard({
  value,
  onChange,
  readOnly = false,
}: {
  value: TacticalBoardData;
  onChange: (value: TacticalBoardData) => void;
  readOnly?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<
    { kind: 'robot'; team: number } | { kind: 'draw'; strokeId: string } | null
  >(null);
  const [mode, setMode] = useState<'move' | 'draw'>('move');
  const [color, setColor] = useState(colors[0]);

  function point(event: React.PointerEvent): BoardPoint {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(1654, ((event.clientX - rect.left) / rect.width) * 1654),
      ),
      y: Math.max(
        0,
        Math.min(800, ((event.clientY - rect.top) / rect.height) * 800),
      ),
    };
  }

  function startDraw(event: React.PointerEvent<SVGSVGElement>) {
    if (readOnly || mode !== 'draw' || event.target !== event.currentTarget)
      return;
    const id = crypto.randomUUID();
    dragRef.current = { kind: 'draw', strokeId: id };
    onChange({
      ...value,
      strokes: [...value.strokes, { id, color, points: [point(event)] }],
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || readOnly) return;
    const next = point(event);
    if (drag.kind === 'robot')
      onChange({
        ...value,
        robots: value.robots.map((robot) =>
          robot.team === drag.team ? { ...robot, ...next } : robot,
        ),
      });
    else
      onChange({
        ...value,
        strokes: value.strokes.map((stroke) =>
          stroke.id === drag.strokeId
            ? { ...stroke, points: [...stroke.points, next] }
            : stroke,
        ),
      });
  }

  function resetRobots() {
    const red = value.robots
      .filter((robot) => robot.alliance === 'red')
      .map((robot) => robot.team);
    const blue = value.robots
      .filter((robot) => robot.alliance === 'blue')
      .map((robot) => robot.team);
    onChange({ ...value, robots: initialRobotMarkers(red, blue) });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'move' ? 'default' : 'outline'}
          disabled={readOnly}
          onClick={() => setMode('move')}
        >
          <MousePointer2 />
          Move robots
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'draw' ? 'default' : 'outline'}
          disabled={readOnly}
          onClick={() => setMode('draw')}
        >
          <Pencil />
          Draw paths
        </Button>
        {colors.map((item) => (
          <button
            type="button"
            aria-label={`Draw in ${item}`}
            disabled={readOnly}
            onClick={() => {
              setColor(item);
              setMode('draw');
            }}
            className={
              color === item
                ? 'size-8 rounded-full border-2 border-primary'
                : 'size-8 rounded-full border'
            }
            style={{ backgroundColor: item }}
            key={item}
          />
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly || value.strokes.length === 0}
          onClick={() =>
            onChange({ ...value, strokes: value.strokes.slice(0, -1) })
          }
        >
          <Undo2 />
          Undo
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly || value.strokes.length === 0}
          onClick={() => onChange({ ...value, strokes: [] })}
        >
          <Eraser />
          Clear ink
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={readOnly}
          onClick={resetRobots}
        >
          <RotateCcw />
          Reset robots
        </Button>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 1654 800"
        className="w-full touch-none rounded-xl border bg-slate-800 shadow-inner"
        onPointerDown={startDraw}
        onPointerMove={move}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        aria-label="Interactive 2026 field strategy board"
      >
        <rect width="1654" height="800" fill="#263640" pointerEvents="none" />
        <rect
          x="18"
          y="18"
          width="1618"
          height="764"
          rx="18"
          fill="#314854"
          stroke="#d7e1e5"
          strokeWidth="5"
          pointerEvents="none"
        />
        <rect
          x="20"
          y="20"
          width="220"
          height="760"
          fill="#7f1d1d"
          opacity=".42"
          pointerEvents="none"
        />
        <rect
          x="1414"
          y="20"
          width="220"
          height="760"
          fill="#1e3a8a"
          opacity=".48"
          pointerEvents="none"
        />
        <line
          x1="827"
          y1="20"
          x2="827"
          y2="780"
          stroke="#f8fafc"
          strokeDasharray="18 14"
          strokeWidth="4"
          pointerEvents="none"
        />
        <path
          d="M 460 80 L 600 80 L 650 200 L 600 320 L 460 320 L 410 200 Z"
          fill="#1f2937"
          stroke="#f59e0b"
          strokeWidth="6"
          pointerEvents="none"
        />
        <path
          d="M 1054 480 L 1194 480 L 1244 600 L 1194 720 L 1054 720 L 1004 600 Z"
          fill="#1f2937"
          stroke="#f59e0b"
          strokeWidth="6"
          pointerEvents="none"
        />
        {[190, 400, 610].map((y, index) => (
          <g key={y} pointerEvents="none">
            <rect
              x="22"
              y={y - 65}
              width="42"
              height="130"
              fill="#dc2626"
              stroke="#fecaca"
            />
            <text
              x="43"
              y={y + 6}
              fill="white"
              fontSize="24"
              textAnchor="middle"
            >
              R{index + 1}
            </text>
            <rect
              x="1590"
              y={y - 65}
              width="42"
              height="130"
              fill="#2563eb"
              stroke="#bfdbfe"
            />
            <text
              x="1611"
              y={y + 6}
              fill="white"
              fontSize="24"
              textAnchor="middle"
            >
              B{index + 1}
            </text>
          </g>
        ))}
        {value.strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={stroke.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
        {value.robots.map((robot) => (
          <g
            key={robot.team}
            transform={`translate(${robot.x} ${robot.y})`}
            className={readOnly ? '' : 'cursor-grab'}
            onPointerDown={(event) => {
              if (readOnly || mode !== 'move') return;
              event.stopPropagation();
              dragRef.current = { kind: 'robot', team: robot.team };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
          >
            <rect
              x="-48"
              y="-36"
              width="96"
              height="72"
              rx="12"
              fill={robot.alliance === 'red' ? '#dc2626' : '#2563eb'}
              stroke="white"
              strokeWidth="4"
            />
            <text
              y="-4"
              textAnchor="middle"
              fill="white"
              fontSize="25"
              fontWeight="700"
            >
              {robot.team}
            </text>
            <text y="22" textAnchor="middle" fill="white" fontSize="16">
              {robot.station}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
