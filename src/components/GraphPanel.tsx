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

// Minimum centre-to-centre distance enforced after the force layout, so circles (and their labels)
// don't sit on top of each other on the initial render.
const NODE_SEP = 38;

/** Fruchterman-Reingold layout. Deterministic start (no randomness) so the picture is stable. */
function layout(nodes: GraphNode[], edges: GraphEdge[], height: number): Record<string, Pos> {
  const pos: Record<string, Pos> = {};
  const n = nodes.length || 1;
  // Deterministic phyllotaxis (golden-angle) spiral start: nodes begin spread across the plane
  // instead of stacked on a single ring, which the force step then refines.
  nodes.forEach((node, i) => {
    const a = i * 2.399963229728653; // golden angle in radians
    const r = NODE_SEP * Math.sqrt(i + 1);
    pos[node.id] = { x: WIDTH / 2 + Math.cos(a) * r, y: height / 2 + Math.sin(a) * r };
  });

  // Ideal edge length. Kept fairly tight so clusters stay compact; the anti-overlap pass below is
  // what guarantees nodes don't actually touch, so we don't need wide spacing here.
  const k = Math.sqrt((WIDTH * height) / n) * 0.4;
  let temp = WIDTH / 10;
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

    // Apply, limited by temperature. Not clamped to the viewBox: we let the graph use whatever space
    // it needs and fit the camera to it afterwards, so a crowded graph spreads out instead of piling
    // up against the edges.
    for (const v of nodes) {
      const d = disp[v.id];
      const len = Math.hypot(d.x, d.y) || 0.01;
      const p = pos[v.id];
      p.x += (d.x / len) * Math.min(len, temp);
      p.y += (d.y / len) * Math.min(len, temp);
    }
    temp *= 0.97;
  }

  // Anti-overlap relaxation: push apart any pair still closer than NODE_SEP. A handful of passes is
  // enough to clear the residual collisions the force step leaves behind.
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = pos[nodes[i].id];
        const b = pos[nodes[j].id];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist < NODE_SEP) {
          const push = (NODE_SEP - dist) / 2;
          dx = (dx / dist) * push;
          dy = (dy / dist) * push;
          a.x += dx;
          a.y += dy;
          b.x -= dx;
          b.y -= dy;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pos;
}

/**
 * Camera transform (zoom + pan) that frames the whole laid-out graph inside the viewBox with a
 * margin, so the initial render shows everything without overlap. Accounts for the label that
 * extends to the right of each node so long labels aren't clipped.
 */
function fitView(nodes: GraphNode[], pos: Record<string, Pos>, height: number): { zoom: number; pan: Pos } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const p = pos[node.id];
    if (!p) continue;
    minX = Math.min(minX, p.x - 12);
    minY = Math.min(minY, p.y - 14);
    maxX = Math.max(maxX, p.x + 12 + node.label.length * 5.2); // rough label width at fontSize 9
    maxY = Math.max(maxY, p.y + 14);
  }
  if (!Number.isFinite(minX)) return { zoom: 1, pan: { x: 0, y: 0 } };

  const pad = 24;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  // Fit to the tighter axis; never zoom in past 1:1 on first render.
  const zoom = clampZoom(Math.min((WIDTH - 2 * pad) / w, (height - 2 * pad) / h, 1));
  const pan = {
    x: (WIDTH - w * zoom) / 2 - minX * zoom,
    y: (height - h * zoom) / 2 - minY * zoom,
  };
  return { zoom, pan };
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
  // Camera that frames the whole laid-out graph; used for the initial render and the Reset button.
  const fit = useMemo(() => fitView(graph.nodes, base, height), [graph.nodes, base, height]);
  const [pos, setPos] = useState<Record<string, Pos>>(base);
  const [drag, setDrag] = useState<string | null>(null);
  // True once a drag actually moved a node, so the trailing click doesn't get treated as a select.
  const dragMoved = useRef(false);
  const [hover, setHover] = useState<string | null>(null);
  // The node whose properties panel is open. Clicking a node opens it; clicking it again closes it.
  const [selected, setSelected] = useState<string | null>(null);
  // The node the user located most recently; it gets a ring so it stands out after the view jumps.
  const [focused, setFocused] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);

  // Zoom/pan over the whole picture. `pan` is in viewBox units, `zoom` is a scale factor.
  // Start framed on the whole graph so nothing overlaps or sits off-screen on first render.
  const [zoom, setZoom] = useState(fit.zoom);
  const [pan, setPan] = useState<Pos>(fit.pan);
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

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph.nodes]);

  // Properties + connections of the node whose panel is open, ready for display.
  const details = useMemo(() => {
    if (!selected) return null;
    const node = nodeById.get(selected);
    if (!node) return null;
    const outgoing = graph.edges
      .filter((e) => e.source === selected)
      .map((e) => ({ rel: e.type, other: nodeById.get(e.target) }));
    const incoming = graph.edges
      .filter((e) => e.target === selected)
      .map((e) => ({ rel: e.type, other: nodeById.get(e.source) }));
    return { node, outgoing, incoming };
  }, [selected, nodeById, graph.edges]);

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
      dragMoved.current = true;
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
    setPos(base);
    setZoom(fit.zoom);
    setPan(fit.pan);
    setFocused(null);
    setNotFound(null);
    setSelected(null);
  };

  // When the graph (and thus its layout) changes, snap positions and the camera back to the fresh
  // fit. Also fixes stale positions, since useState ignores a changed initial value after mount.
  useEffect(() => {
    setPos(base);
    setZoom(fit.zoom);
    setPan(fit.pan);
    setFocused(null);
    setNotFound(null);
    setSelected(null);
  }, [base, fit]);

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
            // Mousedown on empty canvas (not a node) starts a pan and closes any open properties panel.
            panStart.current = { svg: toSvg(e.clientX, e.clientY), pan };
            setSelected(null);
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
                  // Don't let the canvas handler start a pan or clear the selection.
                  e.stopPropagation();
                  dragMoved.current = false;
                  setDrag(node.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // A click that didn't drag the node toggles its properties panel.
                  if (!dragMoved.current) {
                    setSelected((prev) => (prev === node.id ? null : node.id));
                  }
                }}
                onMouseEnter={() => setHover(node.id)}
                onMouseLeave={() => setHover(null)}
              >
                {focused === node.id && (
                  <circle className="graph-node-focus-ring" r={13} fill="none" stroke={colorFor(node.type)} strokeWidth={2} />
                )}
                {selected === node.id && (
                  <circle r={11} fill="none" stroke={colorFor(node.type)} strokeWidth={2.5} />
                )}
                <circle r={hover === node.id || focused === node.id || selected === node.id ? 9 : 6} fill={colorFor(node.type)} stroke="#fff" strokeWidth={1.5} />
                <text x={9} y={4} fontSize={9} fontWeight={focused === node.id || selected === node.id ? 700 : 400} fill="#1c2530">
                  {node.label}
                </text>
              </g>
            );
          })}
          </g>
        </svg>

        {details && (
          <div className="node-props" onMouseDown={(e) => e.stopPropagation()}>
            <div className="node-props-head">
              <span className="node-props-type">
                <i style={{ background: colorFor(details.node.type) }} />
                {details.node.type}
              </span>
              <button
                type="button"
                className="node-props-close"
                title="Close"
                onClick={() => setSelected(null)}
              >
                &times;
              </button>
            </div>
            <div className="node-props-label">{details.node.label}</div>
            <div className="node-props-id mono">{details.node.id}</div>

            {details.outgoing.length === 0 && details.incoming.length === 0 ? (
              <p className="node-props-empty">No connections.</p>
            ) : (
              <div className="node-props-conns">
                {details.outgoing.map((c, i) => (
                  <div key={`o${i}`} className="node-props-conn">
                    <span className="node-props-rel">{c.rel} &rarr;</span>{" "}
                    <span>{c.other ? c.other.label : "(unknown)"}</span>
                  </div>
                ))}
                {details.incoming.map((c, i) => (
                  <div key={`i${i}`} className="node-props-conn">
                    <span className="node-props-rel">&larr; {c.rel}</span>{" "}
                    <span>{c.other ? c.other.label : "(unknown)"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {showHint && (
        <p className="hint" style={{ textAlign: "left", padding: "10px 2px" }}>
          Scroll to zoom, drag the background to pan, and drag any node to rearrange. Hover a node to
          highlight what it connects to, or click it to see its properties. This is the same
          graph the figures are computed over: positions belong to asset classes and issuers, asset
          classes carry their limits, and every rule ends at the guideline chunk that defines it.
        </p>
      )}
    </div>
  );
}
