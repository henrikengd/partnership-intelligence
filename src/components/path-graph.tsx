"use client";
import { useEffect, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RelationshipPath } from "@/modules/opportunities/contracts";
import type { RecordedGraph } from "@/modules/network/projection";
export function PathGraph({
  path,
  projection,
}: {
  path?: RelationshipPath;
  projection?: RecordedGraph;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < 600),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const nodes = projection?.nodes ?? path?.nodes ?? [];
  const edges =
    projection?.edges ??
    path?.edges.map((e, i) => ({
      ...e,
      source: path.nodes[i].id,
      target: path.nodes[i + 1].id,
    })) ??
    [];
  return (
    <div
      ref={container}
      className="focused-graph"
      aria-label="Recorded relationship visualization. All records are also available in the following text."
      style={{ height: projection ? 360 : narrow ? 320 : 180 }}
    >
      <ReactFlow
        key={narrow ? "vertical" : "horizontal"}
        nodes={nodes.map((node, index) => ({
          id: node.id,
          sourcePosition: narrow ? Position.Bottom : Position.Right,
          targetPosition: narrow ? Position.Top : Position.Left,
          position: narrow
            ? { x: 20, y: index * 120 }
            : projection
              ? {
                  x:
                    node.kind === "organization"
                      ? 0
                      : node.kind === "person"
                        ? 280
                        : 560,
                  y:
                    node.kind === "organization"
                      ? 80
                      : nodes
                          .slice(0, index)
                          .filter((n) => n.kind === node.kind).length * 110,
                }
              : { x: index * 260, y: 30 },
          data: { label: node.label },
          style: {
            background: node.kind === "person" ? "#e7f2eb" : "white",
            border: "1px solid #a8c6b4",
            borderRadius: 10,
            width: 200,
            fontSize: 14,
          },
          type:
            node.kind === "organization"
              ? "input"
              : node.kind === "company"
                ? "output"
                : "default",
        }))}
        edges={edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label.length > 28 ? `${e.label.slice(0, 25)}…` : e.label,
          style: {
            strokeDasharray:
              "state" in e && e.state !== "current" ? "5 5" : undefined,
          },
          markerEnd: { type: "arrowclosed" as const },
        }))}
        fitView
        minZoom={0.08}
        maxZoom={2}
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        {projection && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
