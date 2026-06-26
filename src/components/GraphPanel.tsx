import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphEdge, GraphNode, GraphView } from "../types";

const WIDTH = 900;

// Node colour by type, grouped so related concepts read together.
const COLORS: Record<string, string> = {
  Position: "#2c5d8f",
  AssetClass: "#2a8c82",
  Limit: "#b9821f",
  Aggregate: "#b9821f",
  ConcentrationLimit: "#b9821f",
  LiquidityFloor: "#b9821f",
  RiskMetric: "#7b53b8",
  Threshold: "#7b53b8",
  BreachAction: "#b23b3b",
  Owner: "#6b7280",
  Issuer: "#3f8f4f",
  ParentIssuer: "#2f6f3c",
  GuidelineChunk: "#8a6d3b",
};
const colorFor = (type: string) => COLORS[type] ?? "#888";

interface Pos {
  x: number;
  y: number;
}

/** Fruchterman-Reingold layout. Deterministic start (no randomness) so the picture is stable. */
function layout(nodes: GraphNode[], edges: GraphEdge[], height: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {};
  const n = nodes.length || 1;
  nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / n;
    pos[node.id] = { x: WIDTH / 2 + Math.cos(a) * 250, y: height / 2 + Math.sin(a) * (height / 3) };
  });

  const area = WIDTH * height;
  const k = Math.sqrt(area / n) * 0.7;
  let temp = WIDTH / 8;
  const iterations = 400;

  for (let it = 0; it < iterations; it++) {
    const disp: Record<string, Pos> = {};
    nodes.forEach((v) => (disp[v.id] = { x: 0, y: 0 }));

    // Repulsion between every pair.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos[nodes[i].id];
        const b = pos[nodes[j].id];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const force = (k * k) / dist;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        disp[nodes[i].id].x += dx;
        disp[nodes[i].id].y += dy;
        disp[nodes[j].id].x -= dx;
        disp[nodes[j].id].y -= dy;
      }
    }

    // Attraction along edges.
    for (const e of edges) {
      const a = pos[e.source];
      const b = pos[e.target];
      if (!a || !b) continue;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      disp[e.source].x -= dx;
      disp[e.source].y -= dy;
      disp[e.target].x += dx;
      disp[e.target].y += dy;
    }

    // Apply, limited by temperature, kept in bounds.
    for (const v of nodes) {
      const d = disp[v.id];
      const len = Math.hypot(d.x, d.y) || 0.01;
      const p = pos[v.id];
      p.x += (d.x / len) * Math.min(len, temp);
      p.y += (d.y / len) * Math.min(len, temp);
      p.x = Math.max(30, Math.min(WIDTH - 30, p.x));
      p.y = Math.max(24, Math.min(height - 24, p.y));
    }
    temp *= 0.97;
  }
  return pos;
}

/**
 * A request to centre the view on a node, set from outside the panel (e.g. clicking a chunk_id in the
 * traceability table). `nonce` changes on every request so repeating the same label re-fires the jump.
 */
export interface FocusRequest {
  label: string;
  nonce: number;
}

interface GraphPanelProps {
  graph: GraphView;
  height?: number;
  showHint?: boolean;
  /** External "locate this node" request, matched against node labels (chunk_id is a node label). */
  focus?: FocusRequest | null;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 6;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
// Zoom level we snap to when locating a node, unless the user is already zoomed in further.
const LOCATE_ZOOM = 1.8;

/** Finds the node a search/locate query refers to: exact label match first, then a loose contains. */
function matchNode(nodes: GraphNode[], query: string): GraphNode | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return (
    nodes.find((n) => n.label.toLowerCase() === q || n.id.toLowerCase() === q) ??
    nodes.find((n) => n.label.toLowerCase().includes(q))
  );
}

export function GraphPanel({ graph, height = 600, showHint = true, focus = null }: GraphPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const base = useMemo(() => layout(graph.nodes, graph.edges, height), [graph, height]);
  const [pos, setPos] = useState<Record<string, Pos>>(base);
  const [drag, setDrag] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  // The node the user located most recently; it gets a ring so it stands out after the view jumps.
  const [focused, setFocused] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);

  // Zoom/pan over the whole picture. `pan` is in viewBox units, `zoom` is a scale factor.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pos>({ x: 0, y: 0 });
  // While the background is being dragged, remember where the drag started so pan tracks the cursor.
  const panStart = useRef<{ svg: Pos; pan: Pos } | null>(null);

  const neighbours = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    for (const e of graph.edges) {
      if (e.source === hover) set.add(e.target);
      if (e.target === hover) set.add(e.source);
    }
    return set;
  }, [hover, graph.edges]);

  // Screen coords -> viewBox coords (independent of our pan/zoom transform).
  const toSvg = (clientX: number, clientY: number): Pos => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  };

  // viewBox coords -> graph (pre-transform) coords, so node positions stay correct while zoomed.
  const toGraph = (svgPt: Pos): Pos => ({ x: (svgPt.x - pan.x) / zoom, y: (svgPt.y - pan.y) / zoom });

  const onMove = (e: React.MouseEvent) => {
    const svgPt = toSvg(e.clientX, e.clientY);
    if (drag) {
      setPos((prev) => ({ ...prev, [drag]: toGraph(svgPt) }));
    } else if (panStart.current) {
      const s = panStart.current;
      setPan({ x: s.pan.x + (svgPt.x - s.svg.x), y: s.pan.y + (svgPt.y - s.svg.y) });
    }
  };

  const endDrag = () => {
    setDrag(null);
    panStart.current = null;
  };

  // Wheel zooms toward the cursor so the point under the pointer stays put.
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const svgPt = toSvg(e.clientX, e.clientY);
    const next = clampZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    const g = toGraph(svgPt);
    setZoom(next);
    setPan({ x: svgPt.x - g.x * next, y: svgPt.y - g.y * next });
  };

  // Button zoom keeps the centre of the view fixed.
  const zoomBy = (factor: number) => {
    const c = { x: WIDTH / 2, y: height / 2 };
    const next = clampZoom(zoom * factor);
    const g = toGraph(c);
    setZoom(next);
    setPan({ x: c.x - g.x * next, y: c.y - g.y * next });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFocused(null);
    setNotFound(null);
  };

  // Centre the view on the node a query refers to and ring it. Used by both the search box and the
  // external `focus` prop. Reads `pos` so it lands on the node's current (possibly dragged) position.
  const locate = useCallback(
    (query: string) => {
      const node = matchNode(graph.nodes, query);
      if (!node || !pos[node.id]) {
        setFocused(null);
        setNotFound(query.trim());
        return;
      }
      const p = pos[node.id];
      const next = clampZoom(Math.max(zoom, LOCATE_ZOOM));
      setZoom(next);
      setPan({ x: WIDTH / 2 - p.x * next, y: height / 2 - p.y * next });
      setFocused(node.id);
      setNotFound(null);
    },
    [graph.nodes, pos, zoom, height]
  );

  // React to an external locate request (e.g. a chunk_id clicked in the traceability table).
  useEffect(() => {
    if (focus && focus.label) {
      setSearch(focus.label);
      locate(focus.label);
    }
    // Only re-fire when a new request arrives, not when `locate`'s closure changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const types = useMemo(
    () => Array.from(new Set(graph.nodes.map((n) => n.type))),
    [graph.nodes]
  );

  return (
    <div>
      <div className="graph-legend">
        {types.map((t) => (
          <span key={t} className="legend-item">
            <i style={{ background: colorFor(t) }} /> {t}
          </span>
        ))}
      </div>

      <form
        className="graph-search"
        onSubmit={(e) => {
          e.preventDefault();
          locate(search);
        }}
      >
        <input
          type="text"
          value={search}
          placeholder="Find a node or chunk_id…"
          onChange={(e) => {
            setSearch(e.target.value);
            if (notFound) setNotFound(null);
          }}
        />
        <button type="submit">Locate</button>
        {notFound !== null && (
          <span className="graph-search-miss">No node matches “{notFound}”.</span>
        )}
      </form>

      <div className="panel graph-wrap">
        <div className="zoom-controls">
          <button type="button" onClick={() => zoomBy(1.25)} title="Zoom in">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.25)} title="Zoom out">&minus;</button>
          <button type="button" onClick={resetView} title="Reset view">Reset</button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="graph-svg"
          style={{ height, cursor: panStart.current ? "grabbing" : "grab" }}
          onWheel={onWheel}
          onMouseDown={(e) => {
            // Mousedown on empty canvas (not a node) starts a pan.
            panStart.current = { svg: toSvg(e.clientX, e.clientY), pan };
          }}
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {graph.edges.map((e, i) => {
            const a = pos[e.source];
            const b = pos[e.target];
            if (!a || !b) return null;
            const active = !neighbours || (neighbours.has(e.source) && neighbours.has(e.target));
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? "#9aa7b4" : "#e2e7ee"}
                strokeWidth={active ? 1.2 : 0.8}
              />
            );
          })}

          {graph.nodes.map((node) => {
            const p = pos[node.id];
            if (!p) return null;
            const active = !neighbours || neighbours.has(node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${p.x},${p.y})`}
                className="graph-node"
                opacity={active ? 1 : 0.25}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDrag(node.id);
                }}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
              >
                {focused === node.id && (
                  <circle className="graph-node-focus-ring" r={13} fill="none" stroke={colorFor(node.type)} strokeWidth={2} />
                )}
                <circle r={hover === node.id || focused === node.id ? 9 : 6} fill={colorFor(node.type)} stroke="#fff" strokeWidth={1.5} />
                <text x={9} y={4} fontSize={9} fontWeight={focused === node.id ? 700 : 400} fill="#1c2530">
                  {node.label}
                </text>
              </g>
            );
          })}
          </g>
        </svg>
      </div>
      {showHint && (
        <p className="hint" style={{ textAlign: "left", padding: "10px 2px" }}>
          Scroll to zoom, drag the background to pan, and drag any node to rearrange. Hover a node to
          highlight what it connects to. This is the same
          graph the figures are computed over: positions belong to asset classes and issuers, asset
          classes carry their limits, and every rule ends at the guideline chunk that defines it.
        </p>
      )}
    </div>
  );
}
