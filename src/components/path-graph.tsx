"use client";
import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RelationshipPath } from "@/modules/opportunities/contracts";
export function PathGraph({ path }: { path: RelationshipPath }) {
  return (
    <div
      className="focused-graph"
      aria-label="Recorded relationship path visualization"
    >
      <ReactFlow
        nodes={path.nodes.map((node, index) => ({
          id: node.id,
          position: { x: index * 260, y: 30 },
          data: { label: node.label },
          style: {
            background: node.kind === "person" ? "#e7f2eb" : "white",
            border: "1px solid #a8c6b4",
            borderRadius: 10,
            width: 200,
            fontSize: 14,
          },
          type:
            index === 0
              ? "input"
              : index === path.nodes.length - 1
                ? "output"
                : "default",
        }))}
        edges={path.edges.map((edge, index) => ({
          id: edge.id,
          source: path.nodes[index].id,
          target: path.nodes[index + 1].id,
          label: edge.label,
        }))}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
