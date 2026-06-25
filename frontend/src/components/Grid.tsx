import { ReactNode } from "react";
import { columnLabel } from "../fleet";

export function Grid({
  size,
  cell,
  onLeave,
}: {
  size: number;
  cell: (x: number, y: number) => ReactNode;
  onLeave?: () => void;
}) {
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells.push(cell(x, y));
    }
  }

  return (
    <div className="grid-box">
      <div className="grid-row">
        <div className="grid-index-corner" />
        <div
          className="grid-cols"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(22px, 1fr))` }}
        >
          {Array.from({ length: size }, (_, i) => (
            <span key={i}>{columnLabel(i)}</span>
          ))}
        </div>
      </div>

      <div className="grid-row">
        <div className="grid-rows">
          {Array.from({ length: size }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>

        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(22px, 1fr))`,
            gridTemplateRows: `repeat(${size}, minmax(22px, 1fr))`,
          }}
          onMouseLeave={onLeave}
        >
          {cells}
        </div>
      </div>
    </div>
  );
}
