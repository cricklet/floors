import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import {
  findEdgesSplitByPoint,
  findIntersections,
  findSplitTarget,
  splitEdge,
} from "./flatten";

interface Dragging {
  kind: "dragging";
  mouseStart: paper.Point;
  pointStart: paper.Point;
  selected: PointId;
}

interface AddEdge {
  kind: "add-edge";
  selected: PointId;
  potential: paper.Point;
}

interface Idle {
  kind: "idle";
  selected: PointId | undefined;
  hover: paper.Point | undefined;
}

type State = Dragging | Idle | AddEdge;

interface PointTarget {
  kind: "point";
  point: paper.Point;
  pointId: PointId;
  edgesToSplit: Array<EdgeId>;
}

interface IntersectionTarget {
  kind: "intersection";
  point: paper.Point;
  edgesToSplit: Array<EdgeId>;
}

interface SplitTarget {
  kind: "split";
  point: paper.Point;
  edgeToSplit: EdgeId;
}

interface FloatingTarget {
  kind: "floating";
  point: paper.Point;
}

type Target = PointTarget | IntersectionTarget | SplitTarget | FloatingTarget;

export type RenderHint =
  | {
      kind: "point";
      point: paper.Point;
      state: PointRenderState;
    }
  | {
      kind: "edge";
      start: paper.Point;
      end: paper.Point;
    };

export type PointRenderState = "hovered" | "selected" | "selected-hovered";

function intersectionSet<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const value of a) {
    if (b.has(value)) {
      result.add(value);
    }
  }
  return result;
}

function findTargetForNewEdge(
  scene: Scene,
  start: PointId,
  end: paper.Point
): Target | undefined {
  const pointsMap: Map<PointId, Set<PointId>> = scene.pointToPoints();
  const edgesMap: Map<PointId, Set<EdgeId>> = scene.pointToEdges();

  const excludePoints = new Set<PointId>();
  excludePoints.add(start);
  for (const neighbor of pointsMap.get(start)!) {
    excludePoints.add(neighbor);
  }

  const excludeEdges = new Set<EdgeId>();
  for (const edgeId of edgesMap.get(start)!) {
    excludeEdges.add(edgeId);
  }

  const target = findTarget(scene, end);
  if (!target) {
    return {
      kind: "floating",
      point: end,
    };
  }

  if (target.kind === "point") {
    if (!excludePoints.has(target.pointId)) {
      return target;
    }
  } else if (target.kind === "intersection") {
    if (
      intersectionSet(excludeEdges, new Set(target.edgesToSplit)).size === 0
    ) {
      return target;
    }
  } else if (target.kind === "split") {
    if (!excludeEdges.has(target.edgeToSplit)) {
      return target;
    }
  }

  return undefined;
}

function findTarget(scene: Scene, point: paper.Point): Target | undefined {
  for (const [pointId, scenePoint] of scene.points()) {
    if (scenePoint.getDistance(point) < 5) {
      return {
        kind: "point",
        pointId,
        point: scenePoint,
        edgesToSplit: findEdgesSplitByPoint(scene, scenePoint),
      };
    }
  }

  const intersections: Map<paper.Point, Set<EdgeId>> = findIntersections(scene);
  for (const [intersection, edgesToSplit] of intersections) {
    if (intersection.getDistance(point) < 5) {
      return {
        kind: "intersection",
        point: intersection,
        edgesToSplit: Array.from(edgesToSplit),
      };
    }
  }

  const splitTarget = findSplitTarget(scene, point, 5);
  if (splitTarget) {
    const [splitPoint, edgeToSplit] = splitTarget;
    return {
      kind: "split",
      point: splitPoint,
      edgeToSplit,
    };
  }

  return undefined;
}

function getOrAddPoint(scene: Scene, target: Target): PointId | undefined {
  if (target?.kind === "point") {
    for (const edgeId of target.edgesToSplit) {
      splitEdge(scene, edgeId, target.pointId);
    }
    return target.pointId;
  } else if (target?.kind === "intersection") {
    const intersectionPoint = scene.addPoint(target.point);
    for (const edgeId of target.edgesToSplit) {
      splitEdge(scene, edgeId, intersectionPoint);
    }
    return intersectionPoint;
  } else if (target?.kind === "split") {
    const intersectionPoint = scene.addPoint(target.point);
    splitEdge(scene, target.edgeToSplit, intersectionPoint);
    return intersectionPoint;
  } else if (target?.kind === "floating") {
    const pointId = scene.addPoint(target.point);
    return pointId;
  }

  return undefined;
}

export class EditBehavior {
  paperScope: paper.PaperScope;
  scene: Scene;

  state: State;

  constructor(paperScope: paper.PaperScope, scene: Scene) {
    this.paperScope = paperScope;
    this.scene = scene;

    this.state = { kind: "idle", selected: undefined, hover: undefined };

    this.paperScope.view.onMouseMove = this.onMouseMove.bind(this);
    this.paperScope.view.onMouseDown = this.onMouseDown.bind(this);
    this.paperScope.view.onMouseDrag = this.onMouseDrag.bind(this);
    this.paperScope.view.onMouseUp = this.onMouseUp.bind(this);
  }

  onMouseMove(event: paper.MouseEvent) {
    this.state = {
      kind: "idle",
      selected: this.state.selected,
      hover: undefined,
    };

    if (event.modifiers.shift && this.state.selected) {
      const target = findTargetForNewEdge(
        this.scene,
        this.state.selected,
        event.point
      );
      if (target) {
        this.state = {
          kind: "add-edge",
          selected: this.state.selected,
          potential: target.point,
        };
      }
      return;
    }

    const target = findTarget(this.scene, event.point);
    if (target?.kind === "point") {
      this.state.hover = target.point;
    } else if (target?.kind === "intersection") {
      this.state.hover = target.point;
    } else if (target?.kind === "split") {
      this.state.hover = target.point;
    }
  }

  onMouseDown(event: paper.MouseEvent) {
    const previouslySelected = this.state.selected;
    this.state = {
      kind: "idle",
      selected: undefined,
      hover: undefined,
    };

    const shouldCreateEdge = previouslySelected && event.modifiers.shift;

    const target = shouldCreateEdge
      ? findTargetForNewEdge(this.scene, previouslySelected, event.point)
      : findTarget(this.scene, event.point);

    if (!target) {
      return;
    }

    const newPointId = getOrAddPoint(this.scene, target);
    if (!newPointId) {
      return;
    }

    if (shouldCreateEdge) {
      this.scene.addEdge(previouslySelected, newPointId);
    }

    this.state = {
      kind: "dragging",
      mouseStart: event.point,
      pointStart: target.point,
      selected: newPointId,
    };
  }

  onMouseDrag(event: paper.MouseEvent) {
    if (this.state.kind !== "dragging") {
      return;
    }

    const offset = event.point.subtract(this.state.mouseStart);
    const newPoint = this.state.pointStart.add(offset);
    this.scene.setPoint(this.state.selected, newPoint);
  }

  onMouseUp(event: paper.MouseEvent) {
    if (this.state.kind === "dragging") {
      this.state = {
        kind: "idle",
        selected: this.state.selected,
        hover: undefined,
      };
    }
  }

  renderHints(): Array<RenderHint> {
    const result: Array<RenderHint> = [];
    if (this.state.kind === "dragging") {
      result.push({
        kind: "point",
        point: this.scene.getPoint(this.state.selected),
        state: "selected",
      });
    } else if (this.state.kind === "idle") {
      if (this.state.hover) {
        result.push({
          kind: "point",
          point: this.state.hover,
          state: "hovered",
        });
      }
      if (this.state.selected) {
        result.push({
          kind: "point",
          point: this.scene.getPoint(this.state.selected),
          state: "selected",
        });
      }
    } else if (this.state.kind === "add-edge") {
      result.push({
        kind: "edge",
        start: this.scene.getPoint(this.state.selected),
        end: this.state.potential,
      });

      result.push({
        kind: "point",
        point: this.scene.getPoint(this.state.selected),
        state: "selected",
      });

      result.push({
        kind: "point",
        point: this.state.potential,
        state: "hovered",
      });
    }

    return result;
  }
}
