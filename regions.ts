// @ts-ignore
import { extract_cycles } from "min-cycles";

import { EdgeId, PointId, Scene } from "./scene";

interface Vertex {
  x: number;
  y: number;
  adj: Array<Vertex>;
}

export function findRegions(scene: Scene) {
  // find all cycles
  const vertices: Array<Vertex> = [];
  const indices: Map<PointId, number> = new Map();

  function addVertex(vertex: PointId) {
    if (indices.has(vertex)) {
      return;
    }

    const index = vertices.length;
    vertices.push({
      x: scene.getPoint(vertex).x,
      y: scene.getPoint(vertex).y,
      adj: [],
    });
    indices.set(vertex, index);
  }

  for (const [_, [pointId1, pointId2]] of scene.edges()) {
    addVertex(pointId1);
    addVertex(pointId2);
  }

  for (const [_, [pointId1, pointId2]] of scene.edges()) {
    const index1 = indices.get(pointId1)!;
    const index2 = indices.get(pointId2)!;

    vertices[index1].adj.push(vertices[index2]);
    vertices[index2].adj.push(vertices[index1]);
  }

  console.log(vertices);
  console.log(extract_cycles(vertices));

  // // add all cycles that do not intersect another cycle
}
