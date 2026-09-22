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
        className="w-full touch-none select-none rounded-xl border bg-slate-800 shadow-inner"
        style={{ WebkitUserSelect: 'none' }}
        onDragStart={(event) => event.preventDefault()}
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
        <rect width="1654" height="800" fill="#202b31" pointerEvents="none" />
        <rect
          x="10"
          y="10"
          width="1634"
          height="780"
          fill="#3f474b"
          stroke="#d7e1e5"
          strokeWidth="5"
          pointerEvents="none"
        />
        {/* 2026 REBUILT field: 651.2 in x 317.7 in, scaled to this viewBox. */}
        <rect
          x="12"
          y="12"
          width="391"
          height="776"
          fill="#991b1b"
          opacity=".34"
          pointerEvents="none"
        />
        <rect
          x="1251"
          y="12"
          width="391"
          height="776"
          fill="#1d4ed8"
          opacity=".3"
          pointerEvents="none"
        />
        <line
          x1="403"
          y1="12"
          x2="403"
          y2="788"
          stroke="#ef4444"
          strokeWidth="7"
          pointerEvents="none"
        />
        <line
          x1="1251"
          y1="12"
          x2="1251"
          y2="788"
          stroke="#3b82f6"
          strokeWidth="7"
          pointerEvents="none"
        />
        <line
          x1="827"
          y1="12"
          x2="827"
          y2="788"
          stroke="#f8fafc"
          strokeWidth="6"
          pointerEvents="none"
        />
        <g pointerEvents="none">
          <text
            x="827"
            y="42"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="22"
            fontWeight="700"
          >
            CENTER LINE
          </text>
          <text
            x="205"
            y="770"
            textAnchor="middle"
            fill="#fecaca"
            fontSize="20"
            fontWeight="700"
          >
            RED ALLIANCE ZONE
          </text>
          <text
            x="827"
            y="770"
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="20"
            fontWeight="700"
          >
            NEUTRAL ZONE
          </text>
          <text
            x="1447"
            y="770"
            textAnchor="middle"
            fill="#bfdbfe"
            fontSize="20"
            fontWeight="700"
          >
            BLUE ALLIANCE ZONE
          </text>

          {/* HUBS, centered between the paired BUMPS. */}
          <rect
            x="344"
            y="341"
            width="119"
            height="119"
            rx="10"
            fill="#e5e7eb"
            stroke="#ef4444"
            strokeWidth="8"
          />
          <circle
            cx="403"
            cy="400"
            r="36"
            fill="#374151"
            stroke="#f8fafc"
            strokeWidth="5"
          />
          <text
            x="403"
            y="408"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontWeight="700"
          >
            HUB
          </text>
          <rect
            x="1191"
            y="341"
            width="119"
            height="119"
            rx="10"
            fill="#e5e7eb"
            stroke="#3b82f6"
            strokeWidth="8"
          />
          <circle
            cx="1251"
            cy="400"
            r="36"
            fill="#374151"
            stroke="#f8fafc"
            strokeWidth="5"
          />
          <text
            x="1251"
            y="408"
            textAnchor="middle"
            fill="white"
            fontSize="20"
            fontWeight="700"
          >
            HUB
          </text>

          {/* BUMPS flank each HUB; TRENCHES join each BUMP to a guardrail. */}
          {[92, 523].map((y) => (
            <g key={`red-obstacle-${y}`}>
              <rect
                x="290"
                y={y}
                width="113"
                height="185"
                rx="8"
                fill="#b91c1c"
                stroke="#fca5a5"
                strokeWidth="4"
              />
              <path
                d={`M 290 ${y + 92} H 403`}
                stroke="#fee2e2"
                strokeWidth="3"
                strokeDasharray="12 8"
              />
              <text
                x="346"
                y={y + 101}
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="700"
              >
                BUMP
              </text>
              <rect
                x="290"
                y={y === 92 ? 12 : 688}
                width="119"
                height="100"
                fill="#7f1d1d"
                stroke="#fca5a5"
                strokeWidth="4"
              />
              <text
                x="349"
                y={y === 92 ? 70 : 748}
                textAnchor="middle"
                fill="white"
                fontSize="17"
                fontWeight="700"
              >
                TRENCH
              </text>
            </g>
          ))}
          {[92, 523].map((y) => (
            <g key={`blue-obstacle-${y}`}>
              <rect
                x="1251"
                y={y}
                width="113"
                height="185"
                rx="8"
                fill="#1d4ed8"
                stroke="#93c5fd"
                strokeWidth="4"
              />
              <path
                d={`M 1251 ${y + 92} H 1364`}
                stroke="#dbeafe"
                strokeWidth="3"
                strokeDasharray="12 8"
              />
              <text
                x="1307"
                y={y + 101}
                textAnchor="middle"
                fill="white"
                fontSize="18"
                fontWeight="700"
              >
                BUMP
              </text>
              <rect
                x="1245"
                y={y === 92 ? 12 : 688}
                width="119"
                height="100"
                fill="#1e3a8a"
                stroke="#93c5fd"
                strokeWidth="4"
              />
              <text
                x="1305"
                y={y === 92 ? 70 : 748}
                textAnchor="middle"
                fill="white"
                fontSize="17"
                fontWeight="700"
              >
                TRENCH
              </text>
            </g>
          ))}

          {/* Alliance-wall game pieces: depot, tower, and outpost. */}
          <rect
            x="12"
            y="675"
            width="69"
            height="106"
            fill="#f59e0b"
            stroke="#fde68a"
            strokeWidth="4"
          />
          <text
            x="47"
            y="735"
            textAnchor="middle"
            fill="#111827"
            fontSize="15"
            fontWeight="800"
            transform="rotate(-90 47 735)"
          >
            DEPOT
          </text>
          <rect
            x="12"
            y="456"
            width="114"
            height="125"
            fill="#450a0a"
            stroke="#f87171"
            strokeWidth="5"
          />
          <text
            x="69"
            y="526"
            textAnchor="middle"
            fill="white"
            fontSize="18"
            fontWeight="700"
            transform="rotate(-90 69 526)"
          >
            TOWER
          </text>
          <rect
            x="12"
            y="20"
            width="88"
            height="150"
            fill="#7f1d1d"
            stroke="#fca5a5"
            strokeWidth="5"
          />
          <text
            x="56"
            y="103"
            textAnchor="middle"
            fill="white"
            fontSize="17"
            fontWeight="700"
            transform="rotate(-90 56 103)"
          >
            OUTPOST
          </text>

          <rect
            x="1573"
            y="19"
            width="69"
            height="106"
            fill="#f59e0b"
            stroke="#fde68a"
            strokeWidth="4"
          />
          <text
            x="1608"
            y="80"
            textAnchor="middle"
            fill="#111827"
            fontSize="15"
            fontWeight="800"
            transform="rotate(90 1608 80)"
          >
            DEPOT
          </text>
          <rect
            x="1528"
            y="219"
            width="114"
            height="125"
            fill="#172554"
            stroke="#60a5fa"
            strokeWidth="5"
          />
          <text
            x="1585"
            y="288"
            textAnchor="middle"
            fill="white"
            fontSize="18"
            fontWeight="700"
            transform="rotate(90 1585 288)"
          >
            TOWER
          </text>
          <rect
            x="1554"
            y="630"
            width="88"
            height="150"
            fill="#1e3a8a"
            stroke="#93c5fd"
            strokeWidth="5"
          />
          <text
            x="1598"
            y="713"
            textAnchor="middle"
            fill="white"
            fontSize="17"
            fontWeight="700"
            transform="rotate(90 1598 713)"
          >
            OUTPOST
          </text>
        </g>
        {[190, 400, 610].map((y, index) => (
          <g key={y} pointerEvents="none">
            <rect
              x="12"
              y={y - 65}
              width="34"
              height="130"
              fill="#dc2626"
              stroke="#fecaca"
            />
            <text
              x="29"
              y={y + 6}
              fill="white"
              fontSize="24"
              textAnchor="middle"
            >
              R{index + 1}
            </text>
            <rect
              x="1608"
              y={y - 65}
              width="34"
              height="130"
              fill="#2563eb"
              stroke="#bfdbfe"
            />
            <text
              x="1625"
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
