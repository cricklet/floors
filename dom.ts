import paper from "paper";
import { Scene } from "./scene";
import { RoomsDefinition } from "./rooms";

export function setupPaper(
  divEl: HTMLDivElement
): [paper.PaperScope, () => void] {
  const canvasEl = document.createElement("canvas");
  divEl.appendChild(canvasEl);

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

  return [paperScope, updateSize];
}

export function setupEncodedTextArea(
  textArea: HTMLTextAreaElement,
  scene: Scene
) {
  textArea.readOnly = true;

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

  // TODO return cleanup?
}

export function setupRoomsTextArea(
  textArea: HTMLTextAreaElement,
  rooms: RoomsDefinition
) {
  textArea.value = rooms.encode();

  textArea.addEventListener("input", (event) => {
    rooms.decode(textArea.value);
  });

  // TODO return cleanup?
}
