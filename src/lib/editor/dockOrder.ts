/**
 * Where a dragged dock item lands: the number of other items whose centre is left of the pointer.
 * `otherCenters` excludes the dragged item, so the result is its final index for moveDockEntry.
 */
export function insertionIndex(pointerX: number, otherCenters: number[]): number {
  return otherCenters.filter((c) => c < pointerX).length;
}
