import assert from "node:assert/strict";
import { LAYOUT_ORDER } from "../src/config/layouts";
import type { CeilingHeightFt } from "../src/config/site";
import { WALL_SPECS, checkPlan, planRoom, summarizePlan, type WallKey } from "../src/engine/kitchen-planner";

/**
 * Every layout, at every supported wall length in 1" steps (and the quarter-inch ends),
 * at every ceiling: nothing may overlap, nothing may pass through a wall or the ceiling,
 * the hood must be centred over the range at its width, the range and sink need counter
 * beside them, and pendants hang only over an island.
 */
const ceilings: CeilingHeightFt[] = [8, 9, 10];
let plans = 0;
const failures: string[] = [];

function lengths(min: number, max: number) {
  const out: number[] = [];
  for (let v = min; v <= max; v += 1) out.push(v);
  out.push(min + 0.25, max - 0.75, (min + max) / 2 + 0.5);
  return out;
}

for (const layoutId of LAYOUT_ORDER) {
  const specs = WALL_SPECS[layoutId];
  const [a, b] = specs;
  const aVals = lengths(a.minIn, a.maxIn);
  const bVals = b ? lengths(b.minIn, b.maxIn) : [0];
  for (const ceiling of ceilings) {
    for (const av of aVals) {
      // The second wall is swept fully at three values of the first, and sampled otherwise.
      const sweepB = av === a.minIn || av === a.maxIn || av === a.defaultIn;
      for (const bv of sweepB ? bVals : bVals.filter((_, i) => i % 7 === 0)) {
        const walls: Partial<Record<WallKey, number>> = { [a.key]: av };
        if (b) walls[b.key] = bv;
        let issues;
        try {
          const plan = planRoom(layoutId, walls, ceiling);
          issues = checkPlan(plan);
          const sched = summarizePlan(plan);
          const minCabs = layoutId === "vanity" ? 2 : 3;
          if (sched.cabinetCount < minCabs) issues.push({ rule: "schedule", detail: `fewer than ${minCabs} cabinets` });
          for (const c of plan.cabinets) {
            if (c.type === "filler" && (c.yIn ?? 0) === 0 && (c.widthIn < 1.5 - 1e-6 || c.widthIn > 9 + 1e-6))
              issues.push({ rule: "filler-size", detail: `filler ${c.widthIn}"` });
          }
        } catch (e) {
          issues = [{ rule: "plan", detail: (e as Error).message }];
        }
        plans++;
        for (const i of issues) {
          const key = `${layoutId} ${JSON.stringify(walls)} ${ceiling}ft: [${i.rule}] ${i.detail}`;
          if (failures.length < 40) failures.push(key);
          else if (failures.length === 40) failures.push("…more");
        }
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
}
assert.equal(failures.length, 0, `${failures.length} planner failures`);
console.log(`PASS: ${plans} planned rooms, no overlaps, hood centred over every range, pendants only over islands`);
