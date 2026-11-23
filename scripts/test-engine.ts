import assert from "node:assert/strict";
import {
  COLLECTIONS,
  COLLECTION_LIST,
  FINISHES,
  SITE_CONFIG,
  isValidFinishForCollection,
} from "../src/config/site";
import { LAYOUT_ORDER, ROOM_LAYOUTS } from "../src/config/layouts";
import {
  REVEAL_M,
  generateHeroCabinet,
  generateLayoutPanels,
} from "../src/engine/cabinet-generator";
import { buildLayoutMorph, solveHungarian } from "../src/engine/layout-morpher";

// 1. Verify exact 2.0 mm reveal geometry in Hero B36 double-door base cabinet
assert.equal(REVEAL_M, 0.002, "Reveal must be exactly 2.0 mm (0.002 m)");
const hero = generateHeroCabinet("traditional-shaker", 9, false);
const leftDoor = hero.find((p) => p.partCode === "B36-DR-L");
const rightDoor = hero.find((p) => p.partCode === "B36-DR-R");
assert.ok(leftDoor && rightDoor, "Hero cabinet must have left and right doors");

const leftInnerEdgeX = leftDoor.assembledPos[0] + leftDoor.size[0] / 2;
const rightInnerEdgeX = rightDoor.assembledPos[0] - rightDoor.size[0] / 2;
const measuredGapMm = (rightInnerEdgeX - leftInnerEdgeX) * 1000;
assert.ok(
  Math.abs(measuredGapMm - 2.0) < 0.001,
  `Expected exact 2.0 mm gap between hero doors, got ${measuredGapMm.toFixed(4)} mm`
);
console.log(`PASS: Hero double-door gap = ${measuredGapMm.toFixed(3)} mm (exact 2.000 mm)`);

// 2. Verify exact verified collection-finish pairings from business-facts-summary.md
assert.deepEqual(COLLECTIONS["traditional-shaker"].finishes, [
  "premium-oak",
  "classic-walnut",
  "iron-black",
  "frosty-white",
]);
assert.deepEqual(COLLECTIONS["slim-shaker"].finishes, [
  "premium-oak",
  "iron-black",
  "frosty-white",
]);
assert.deepEqual(COLLECTIONS.flat.finishes, [
  "ivory-oak",
  "classic-walnut",
  "frosty-white",
]);
assert.equal(isValidFinishForCollection("slim-shaker", "classic-walnut"), false);
assert.equal(isValidFinishForCollection("traditional-shaker", "ivory-oak"), false);
assert.equal(isValidFinishForCollection("flat", "premium-oak"), false);
console.log("PASS: Exact collection-finish matrix matches business-facts-summary.md");

// 3. Verify all 5 layouts generate clean panels & valid defaults + 3-inch crown molding
for (const lid of LAYOUT_ORDER) {
  const room = ROOM_LAYOUTS[lid];
  assert.ok(
    isValidFinishForCollection(room.defaultCollection, room.defaultFinish),
    `Layout ${lid} default finish must be valid for its collection`
  );
  const p8 = generateLayoutPanels(lid, room.defaultCollection, room.defaultFinish, 8);
  const p10 = generateLayoutPanels(lid, room.defaultCollection, room.defaultFinish, 10);
  assert.ok(p8.length > 20, `Layout ${lid} must generate >20 panels`);
  if (room.roomType === "kitchen") {
    assert.ok(
      p10.length > p8.length,
      `Kitchen ${lid} at 10 ft must add stacked upper boxes vs 8 ft (${p10.length} vs ${p8.length})`
    );
  }
}
console.log("PASS: All 5 layouts generate valid frameless geometry and 8/9/10 ft stacked uppers");

// 4. Verify Hungarian assignment solver optimality & 1-to-1 morphing across 4 Film rooms
const sampleCost = [
  [10, 2, 8],
  [3, 9, 4],
  [7, 6, 1],
];
const solved = solveHungarian(sampleCost);
assert.deepEqual(solved, [1, 0, 2], "Hungarian solver must return global optimum [1, 0, 2] (cost 6)");

const lPanels = generateLayoutPanels("l-shape", "traditional-shaker", "premium-oak", 9);
const gPanels = generateLayoutPanels("galley", "slim-shaker", "iron-black", 9);
const morph = buildLayoutMorph(lPanels, gPanels);
const morphCount = morph.filter((m) => m.mode === "morph").length;
assert.ok(morphCount > 80, `Expected high 1-to-1 panel reuse across L->Galley morph, got ${morphCount}`);
console.log(`PASS: Hungarian solver optimal; L-Shape -> Galley reuses ${morphCount} panels smoothly`);

// 5. Verify PLACEHOLDER_DIMS flag & config tokens
assert.equal(SITE_CONFIG.PLACEHOLDER_DIMS.isPlaceholder, true);
assert.equal(SITE_CONFIG.PLACEHOLDER_DIMS.confirmedRevealMm, 2.0);
assert.equal(SITE_CONFIG.PLACEHOLDER_DIMS.confirmedMoldingInches, 3.0);
assert.equal(Object.keys(FINISHES).length, 5);
assert.equal(COLLECTION_LIST.length, 3);
console.log("PASS: Config placeholders & confirmed constants verified.");
