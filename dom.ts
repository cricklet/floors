import paper from "paper";
import { Scene } from "./scene";

export function setupPaper(canvasId: string): paper.PaperScope {
  const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
  const divEl = canvasEl.parentElement as HTMLDivElement;

  const paperScope = new paper.PaperScope();
  paperScope.setup(canvasEl);

  paperScope.settings.handleSize = 8;
  paperScope.view.zoom = 3;
  paperScope.settings.insertItems = false;

  function updateSize() {
    paperScope.view.viewSize = new paper.Size(
      divEl.clientWidth,
      divEl.clientHeight
    );
    paperScope.view.center = new paper.Point(0, 0);
  }

  window.addEventListener("resize", () => {
    updateSize();
  });
  updateSize();

  return paperScope;
}

export function setupTextArea(
  textAreaId: string,
  scene: Scene
): HTMLTextAreaElement {
  const textArea = document.getElementById(textAreaId) as HTMLTextAreaElement;

  // On paste, decode
  textArea.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text") || "";

    scene.decode(text);
  });

  function update() {
    textArea.value = scene.encode();
  }

  scene.addListener(update);
  update();

  // TODO: cleanup function?
  return textArea;
}
