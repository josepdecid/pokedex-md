// Reads rescue passwords from pictures off the main thread (a phone takes a second or two).
// It keeps the last picture, so moving the corners only needs the new corners.

import { findCorners, readSymbols, type Corners, type Located, type RgbaImage, type SymbolReading } from './recognize.ts';

export type WorkerMessage =
  /** A new picture to find the password in. */
  | { type: 'image'; image: RgbaImage }
  /** New corners for the last picture. */
  | { type: 'read'; corners: Corners }
  /** A camera frame, cropped to the guide: where the password should be if it's lined up with it. */
  | { type: 'frame'; image: RgbaImage; guide: Corners };
export type WorkerRequest = WorkerMessage & { id: number };
export type WorkerResponse = { id: number; located: Located | null; readings: SymbolReading[] | null };

// Fewer glyphs than this where the found corners put them: trust the guide instead.
const MIN_FOUND = 18;

let image: RgbaImage | null = null;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  let response: WorkerResponse;
  if (request.type === 'image') {
    image = request.image;
    const located = findCorners(image);
    response = { id: request.id, located, readings: located ? readSymbols(image, located.corners) : null };
  } else if (request.type === 'frame') {
    // Look for it anyway: nobody lines the camera up exactly.
    const found = findCorners(request.image);
    const corners = found && found.found >= MIN_FOUND ? found.corners : request.guide;
    response = { id: request.id, located: found, readings: readSymbols(request.image, corners) };
  } else {
    response = { id: request.id, located: null, readings: image ? readSymbols(image, request.corners) : null };
  }
  self.postMessage(response);
};
