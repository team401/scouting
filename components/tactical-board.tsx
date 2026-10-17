'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eraser, Hand, Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type BoardPoint = { x: number; y: number };
export type RobotMarker = BoardPoint & {
  team: number;
  label?: string;
  station: string;
  alliance: 'red' | 'blue';
};
export type BoardStroke = { id: string; color: string; points: BoardPoint[] };
export type TacticalBoardData = {
  robots: RobotMarker[];
  strokes: BoardStroke[];
};

function sampledPoints(points: BoardPoint[], step = 8): BoardPoint[] {
  if (points.length < 2) return points;
  const sampled = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / step));
    for (let part = 1; part <= steps; part += 1) {
      const progress = part / steps;
      sampled.push({
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      });
    }
  }
  return sampled;
}

export function eraseStrokeParts(
  strokes: BoardStroke[],
  center: BoardPoint,
  radius: number,
): BoardStroke[] {
  const radiusSquared = radius * radius;
  let changed = false;
  const nextStrokes = strokes.flatMap((stroke) => {
    const points = sampledPoints(stroke.points);
    if (
      !points.some(
        (point) =>
          (point.x - center.x) ** 2 + (point.y - center.y) ** 2 <=
          radiusSquared,
      )
    )
      return stroke;
    changed = true;

    const segments: BoardPoint[][] = [];
    let segment: BoardPoint[] = [];
    for (const point of points) {
      const erased =
        (point.x - center.x) ** 2 + (point.y - center.y) ** 2 <= radiusSquared;
      if (erased) {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      } else {
        segment.push(point);
      }
    }
    if (segment.length > 1) segments.push(segment);

    return segments.map((points, index) => ({
      ...stroke,
      id: index === 0 ? stroke.id : crypto.randomUUID(),
      points,
    }));
  });
  return changed ? nextStrokes : strokes;
}

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
      x: 170,
      y: 190 + index * 210,
    })),
    ...blue.map((team, index) => ({
      team,
      station: `B${index + 1}`,
      alliance: 'blue' as const,
      x: 1484,
      // Driver-station numbering mirrors across the field: B1 is opposite R1,
      // so it appears at the bottom when the field is viewed red-to-blue.
      y: 610 - index * 210,
    })),
  ];
}

export function initialPlaceholderRobotMarkers(): RobotMarker[] {
  return initialRobotMarkers([1, 2, 3], [4, 5, 6]).map((robot) => ({
    ...robot,
    label: 'Robot',
  }));
}

export function TacticalBoard({
  value,
  onChange,
  readOnly = false,
  defaultAlliance = 'red',
  toolbarStart,
  toolbarEnd,
}: {
  value: TacticalBoardData;
  onChange: (value: TacticalBoardData) => void;
  readOnly?: boolean;
  defaultAlliance?: 'red' | 'blue';
  // Extra controls shown at the start and end of the wrapping board toolbar.
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const valueRef = useRef(value);
  const dragRef = useRef<
    | { kind: 'robot'; team: number }
    | { kind: 'draw'; strokeId: string }
    | { kind: 'erase' }
    | null
  >(null);
  const [mode, setMode] = useState<'move' | 'draw' | 'erase'>('move');
  const [color, setColor] = useState(
    defaultAlliance === 'blue' ? colors[1] : colors[0],
  );

  useEffect(() => {
    setColor(defaultAlliance === 'blue' ? colors[1] : colors[0]);
  }, [defaultAlliance]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (mode === 'erase' && value.strokes.length === 0) setMode('draw');
  }, [mode, value.strokes.length]);

  const initialRobots = value.robots.some((robot) => robot.label)
    ? initialPlaceholderRobotMarkers()
    : initialRobotMarkers(
        value.robots
          .filter((robot) => robot.alliance === 'red')
          .map((robot) => robot.team),
        value.robots
          .filter((robot) => robot.alliance === 'blue')
          .map((robot) => robot.team),
      );
  const robotsHaveMoved = value.robots.some((robot) => {
    const initial = initialRobots.find(
      (item) => item.team === robot.team && item.station === robot.station,
    );
    return !initial || initial.x !== robot.x || initial.y !== robot.y;
  });

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
    if (readOnly || event.target !== event.currentTarget) return;
    if (mode === 'erase') {
      dragRef.current = { kind: 'erase' };
      eraseAt(point(event));
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (mode !== 'draw') return;
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
    else if (drag.kind === 'draw')
      onChange({
        ...value,
        strokes: value.strokes.map((stroke) =>
          stroke.id === drag.strokeId
            ? { ...stroke, points: [...stroke.points, next] }
            : stroke,
        ),
      });
    else eraseAt(next);
  }

  function eraseAt(center: BoardPoint) {
    const width = svgRef.current?.getBoundingClientRect().width ?? 1654;
    const radius = (28 / width) * 1654;
    const current = valueRef.current;
    const strokes = eraseStrokeParts(current.strokes, center, radius);
    if (strokes !== current.strokes) {
      valueRef.current = { ...current, strokes };
      onChange(valueRef.current);
    }
  }

  function resetRobots() {
    if (value.robots.some((robot) => robot.label)) {
      onChange({ ...value, robots: initialPlaceholderRobotMarkers() });
      return;
    }
    const red = value.robots
      .filter((robot) => robot.alliance === 'red')
      .map((robot) => robot.team);
    const blue = value.robots
      .filter((robot) => robot.alliance === 'blue')
      .map((robot) => robot.team);
    onChange({ ...value, robots: initialRobotMarkers(red, blue) });
  }

  return (
    // The field is drawn first; the tools sit below it (order-last).
    <div className="tactical-board flex flex-col gap-3">
      <div className="tactical-board-tools order-last flex flex-wrap items-center gap-2 px-(--card-spacing)">
        {toolbarStart}
        <Button
          type="button"
          size="icon-sm"
          variant={mode === 'move' ? 'default' : 'outline'}
          disabled={readOnly}
          aria-label="Move robots"
          title="Move robots"
          onClick={() => setMode('move')}
        >
          <Hand />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={mode === 'draw' ? 'default' : 'outline'}
          disabled={readOnly}
          aria-label="Draw paths"
          title="Draw paths"
          onClick={() => setMode('draw')}
        >
          <Pencil />
        </Button>
        {value.strokes.length > 0 && (
          <Button
            type="button"
            size="icon-sm"
            variant={mode === 'erase' ? 'default' : 'outline'}
            disabled={readOnly}
            aria-label="Erase ink"
            title="Erase ink"
            onClick={() => setMode('erase')}
          >
            <Eraser />
          </Button>
        )}
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
        {value.strokes.length > 0 && (
          <>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={readOnly}
              aria-label="Undo last line"
              title="Undo last line"
              onClick={() =>
                onChange({ ...value, strokes: value.strokes.slice(0, -1) })
              }
            >
              <Undo2 />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={readOnly}
              aria-label="Erase all ink"
              title="Erase all ink"
              onClick={() => onChange({ ...value, strokes: [] })}
            >
              <Eraser />
              All
            </Button>
          </>
        )}
        {robotsHaveMoved && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly}
            aria-label="Reset all robots"
            title="Reset all robots"
            onClick={resetRobots}
          >
            <RotateCcw />
            All
          </Button>
        )}
        {toolbarEnd}
      </div>
      <div className="tactical-board-viewport">
        <svg
          ref={svgRef}
          viewBox="0 0 1654 800"
          className={`w-full touch-none select-none rounded-xl border bg-slate-800 shadow-inner ${mode === 'erase' ? 'cursor-crosshair' : ''}`}
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
          {/* 2026 Rebuilt field: 651.2 in x 317.7 in, scaled to this viewBox. */}
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
            {/* Hubs, centered between the paired Bumps. */}
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
              fontSize="16"
              fontWeight="700"
            >
              Hub
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
              fontSize="16"
              fontWeight="700"
            >
              Hub
            </text>

            {/* Wall → Trench → Bump → Hub → Bump → Trench → wall. */}
            {[112, 464].map((y) => (
              <g key={`red-bump-${y}`}>
                <rect
                  x="347"
                  y={y}
                  width="113"
                  height={y === 112 ? 225 : 224}
                  rx="8"
                  fill="#b91c1c"
                  stroke="#fca5a5"
                  strokeWidth="4"
                />
                <text
                  x="403"
                  y={y + 120}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="700"
                >
                  Bump
                </text>
              </g>
            ))}
            {[12, 688].map((y) => (
              <g key={`red-trench-${y}`}>
                <rect
                  x="347"
                  y={y}
                  width="113"
                  height="100"
                  rx="4"
                  fill="#7f1d1d"
                  stroke="#fca5a5"
                  strokeWidth="4"
                />
                <text
                  x="403"
                  y={y + 57}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="700"
                >
                  Trench
                </text>
              </g>
            ))}

            {[112, 464].map((y) => (
              <g key={`blue-bump-${y}`}>
                <rect
                  x="1195"
                  y={y}
                  width="113"
                  height={y === 112 ? 225 : 224}
                  rx="8"
                  fill="#1d4ed8"
                  stroke="#93c5fd"
                  strokeWidth="4"
                />
                <text
                  x="1251"
                  y={y + 120}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="700"
                >
                  Bump
                </text>
              </g>
            ))}
            {[12, 688].map((y) => (
              <g key={`blue-trench-${y}`}>
                <rect
                  x="1195"
                  y={y}
                  width="113"
                  height="100"
                  rx="4"
                  fill="#1e3a8a"
                  stroke="#93c5fd"
                  strokeWidth="4"
                />
                <text
                  x="1251"
                  y={y + 57}
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="700"
                >
                  Trench
                </text>
              </g>
            ))}

            {/* Alliance-wall game pieces, oriented from the official top view. */}
            <rect
              x="-20"
              y="680"
              width="32"
              height="100"
              fill="#f59e0b"
              stroke="#fde68a"
              strokeWidth="3"
            />
            <text
              x="6"
              y="730"
              textAnchor="middle"
              fill="#111827"
              fontSize="16"
              fontWeight="800"
              transform="rotate(-90 6 730)"
            >
              Outpost
            </text>
            <rect
              x="12"
              y="150"
              width="72"
              height="100"
              fill="#fbbf24"
              stroke="#fef3c7"
              strokeWidth="4"
            />
            <text
              x="48"
              y="208"
              textAnchor="middle"
              fill="#111827"
              fontSize="16"
              fontWeight="800"
              transform="rotate(-90 48 208)"
            >
              Depot
            </text>
            <rect
              x="12"
              y="332"
              width="86"
              height="136"
              fill="#111827"
              stroke="#e5e7eb"
              strokeWidth="5"
            />
            <text
              x="58"
              y="407"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="700"
              transform="rotate(-90 58 407)"
            >
              Tower
            </text>

            <rect
              x="1642"
              y="20"
              width="32"
              height="100"
              fill="#f59e0b"
              stroke="#fde68a"
              strokeWidth="3"
            />
            <text
              x="1648"
              y="70"
              textAnchor="middle"
              fill="#111827"
              fontSize="16"
              fontWeight="800"
              transform="rotate(90 1648 70)"
            >
              Outpost
            </text>
            <rect
              x="1554"
              y="550"
              width="88"
              height="100"
              fill="#fbbf24"
              stroke="#fef3c7"
              strokeWidth="4"
            />
            <text
              x="1598"
              y="608"
              textAnchor="middle"
              fill="#111827"
              fontSize="16"
              fontWeight="800"
              transform="rotate(90 1598 608)"
            >
              Depot
            </text>
            <rect
              x="1556"
              y="332"
              width="86"
              height="136"
              fill="#111827"
              stroke="#e5e7eb"
              strokeWidth="5"
            />
            <text
              x="1596"
              y="407"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontWeight="700"
              transform="rotate(90 1596 407)"
            >
              Tower
            </text>
          </g>
          {value.strokes.map((stroke) => {
            const points = stroke.points.map((p) => `${p.x},${p.y}`).join(' ');
            return (
              <polyline
                key={stroke.id}
                points={points}
                fill="none"
                stroke={stroke.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            );
          })}
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
                {robot.label ?? robot.team}
              </text>
              <text y="22" textAnchor="middle" fill="white" fontSize="16">
                {robot.station}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
