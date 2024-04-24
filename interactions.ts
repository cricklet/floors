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
}

interface Idle {
  kind: "idle";
  selected: PointId | undefined;
  hover: paper.Point | undefined;
}

type State = Dragging | Idle;

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

type Target = PointTarget | IntersectionTarget | SplitTarget;

export type PointRenderState = "hovered" | "selected" | "selected-hovered";

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

  const splitTarget = findSplitTarget(scene, point);
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
    this.state = {
      kind: "idle",
      selected: undefined,
      hover: undefined,
    };

    const target = findTarget(this.scene, event.point);
    if (target?.kind === "point") {
      for (const edgeId of target.edgesToSplit) {
        splitEdge(this.scene, edgeId, target.pointId);
      }
      this.state = {
        kind: "dragging",
        mouseStart: event.point,
        pointStart: target.point,
        selected: target.pointId,
      };
    } else if (target?.kind === "intersection") {
      const intersectionPoint = this.scene.addPoint(target.point);
      for (const edgeId of target.edgesToSplit) {
        splitEdge(this.scene, edgeId, intersectionPoint);
      }
      this.state = {
        kind: "dragging",
        mouseStart: event.point,
        pointStart: target.point,
        selected: intersectionPoint,
      };
    } else if (target?.kind === "split") {
      const intersectionPoint = this.scene.addPoint(target.point);
      splitEdge(this.scene, target.edgeToSplit, intersectionPoint);
      this.state = {
        kind: "dragging",
        mouseStart: event.point,
        pointStart: target.point,
        selected: intersectionPoint,
      };
    }
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

  renderHints(): Array<[paper.Point, PointRenderState]> {
    const result: Array<[paper.Point, PointRenderState]> = [];
    if (this.state.kind === "dragging") {
      result.push([this.scene.getPoint(this.state.selected), "selected"]);
    } else if (this.state.kind === "idle") {
      if (this.state.hover) {
        result.push([this.state.hover, "hovered"]);
      }
      if (this.state.selected) {
        result.push([this.scene.getPoint(this.state.selected), "selected"]);
      }
    }

    return result;
  }
}
