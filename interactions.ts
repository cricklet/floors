import paper from "paper";
import { EdgeId, PointId, Scene } from "./scene";
import { findIntersections } from "./flatten";

interface Dragging {
  kind: "dragging";
  mouseStart: paper.Point;
  pointStart: paper.Point;
  selected: PointId;
}

interface Idle {
  kind: "idle";
  selected: PointId | undefined;
  hover: paper.Point | undefined;
}

type State = Dragging | Idle;

interface PotentialPoint {
  pointId: PointId | undefined;
  point: paper.Point;
  edgesToSplit: Set<EdgeId>;
}

export type PointRenderState = "hovered" | "selected" | "selected-hovered";

function findPoint(
  scene: Scene,
  point: paper.Point
): {
  pointId: PointId | undefined;
  point: paper.Point | undefined;
} {
  for (const [pointId, scenePoint] of scene.points()) {
    if (scenePoint.getDistance(point) < 5) {
      return {
        pointId,
        point: scenePoint,
      };
    }
  }

  const intersections: Map<paper.Point, Set<EdgeId>> = findIntersections(scene);

  for (const [intersection, _] of intersections) {
    if (intersection.getDistance(point) < 5) {
      return {
        pointId: undefined,
        point: intersection,
      };
    }
  }

  return {
    pointId: undefined,
    point: undefined,
  };
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

    const { point } = findPoint(this.scene, event.point);
    if (point) {
      this.state.hover = point;
    }
  }

  onMouseDown(event: paper.MouseEvent) {
    this.state = {
      kind: "idle",
      selected: undefined,
      hover: undefined,
    };

    const { pointId, point } = findPoint(this.scene, event.point);
    if (pointId && point) {
      this.state = {
        kind: "dragging",
        mouseStart: event.point,
        pointStart: point,
        selected: pointId,
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
