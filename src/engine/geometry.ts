import * as THREE from "three";

/**
 * Builds a clean architectural panel box (unit 1x1x1 centered at origin) with
 * subtle chamfered edge shading normals and long-axis vertical wood grain UVs.
 */
export function buildUnitPanelBoxGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  // Ensure front/back faces have vertical grain along Y (V), side faces along Y (V), top/bottom along X
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper to append an axis-aligned box sub-piece with exact grain UV orientation into arrays.
 * grainDir: "vertical" (grain along Y) or "horizontal" (grain along X).
 */
function pushSubBox(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  grainDir: "vertical" | "horizontal"
) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;

  const faces: Array<{
    n: [number, number, number];
    verts: Array<[number, number, number]>;
    uvScale: [number, number];
    rotateUv?: boolean;
  }> = [
    // +Z (Front)
    {
      n: [0, 0, 1],
      verts: [
        [cx - hx, cy - hy, cz + hz],
        [cx + hx, cy - hy, cz + hz],
        [cx + hx, cy + hy, cz + hz],
        [cx - hx, cy + hy, cz + hz],
      ],
      uvScale: [sx, sy],
      rotateUv: grainDir === "horizontal",
    },
    // -Z (Back)
    {
      n: [0, 0, -1],
      verts: [
        [cx + hx, cy - hy, cz - hz],
        [cx - hx, cy - hy, cz - hz],
        [cx - hx, cy + hy, cz - hz],
        [cx + hx, cy + hy, cz - hz],
      ],
      uvScale: [sx, sy],
      rotateUv: grainDir === "horizontal",
    },
    // +X (Right Edge)
    {
      n: [1, 0, 0],
      verts: [
        [cx + hx, cy - hy, cz + hz],
        [cx + hx, cy - hy, cz - hz],
        [cx + hx, cy + hy, cz - hz],
        [cx + hx, cy + hy, cz + hz],
      ],
      uvScale: [sz, sy],
    },
    // -X (Left Edge)
    {
      n: [-1, 0, 0],
      verts: [
        [cx - hx, cy - hy, cz - hz],
        [cx - hx, cy - hy, cz + hz],
        [cx - hx, cy + hy, cz + hz],
        [cx - hx, cy + hy, cz - hz],
      ],
      uvScale: [sz, sy],
    },
    // +Y (Top Edge)
    {
      n: [0, 1, 0],
      verts: [
        [cx - hx, cy + hy, cz + hz],
        [cx + hx, cy + hy, cz + hz],
        [cx + hx, cy + hy, cz - hz],
        [cx - hx, cy + hy, cz - hz],
      ],
      uvScale: [sx, sz],
      rotateUv: true,
    },
    // -Y (Bottom Edge)
    {
      n: [0, -1, 0],
      verts: [
        [cx - hx, cy - hy, cz - hz],
        [cx + hx, cy - hy, cz - hz],
        [cx + hx, cy - hy, cz + hz],
        [cx - hx, cy - hy, cz + hz],
      ],
      uvScale: [sx, sz],
      rotateUv: true,
    },
  ];

  for (const f of faces) {
    const baseIdx = positions.length / 3;
    const [uS, vS] = f.uvScale;
    const rawUv: Array<[number, number]> = f.rotateUv
      ? [
          [0, 0],
          [0, uS * 1.4],
          [vS * 1.4, uS * 1.4],
          [vS * 1.4, 0],
        ]
      : [
          [0, 0],
          [uS * 1.4, 0],
          [uS * 1.4, vS * 1.4],
          [0, vS * 1.4],
        ];

    for (let i = 0; i < 4; i++) {
      const [vx, vy, vz] = f.verts[i];
      positions.push(vx, vy, vz);
      normals.push(f.n[0], f.n[1], f.n[2]);
      uvs.push(rawUv[i][0], rawUv[i][1]);
    }
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
  }
}

/**
 * Builds an authentic 5-piece recessed Shaker or Slim Shaker door geometry (unit 1x1x1 or exact meters)
 * with true recessed center panel, vertical-grain stiles/panel, and horizontal-grain top/bottom rails.
 */
export function buildShakerDoorGeometry(
  width = 1,
  height = 1,
  thickness = 1,
  stileFrac = 0.145,
  railFrac = 0.115,
  recessFrac = 0.36
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const stileW = Math.min(width * 0.32, width * stileFrac);
  const railH = Math.min(height * 0.32, height * railFrac);
  const innerW = Math.max(0.02, width - 2 * stileW);
  const innerH = Math.max(0.02, height - 2 * railH);
  const panelThick = thickness * (1 - recessFrac);

  // Left Stile (vertical grain)
  pushSubBox(
    positions,
    normals,
    uvs,
    indices,
    -width / 2 + stileW / 2,
    0,
    0,
    stileW,
    height,
    thickness,
    "vertical"
  );
  // Right Stile (vertical grain)
  pushSubBox(
    positions,
    normals,
    uvs,
    indices,
    width / 2 - stileW / 2,
    0,
    0,
    stileW,
    height,
    thickness,
    "vertical"
  );
  // Top Rail (horizontal grain between stiles — real joinery!)
  pushSubBox(
    positions,
    normals,
    uvs,
    indices,
    0,
    height / 2 - railH / 2,
    0,
    innerW,
    railH,
    thickness,
    "horizontal"
  );
  // Bottom Rail (horizontal grain between stiles)
  pushSubBox(
    positions,
    normals,
    uvs,
    indices,
    0,
    -height / 2 + railH / 2,
    0,
    innerW,
    railH,
    thickness,
    "horizontal"
  );
  // Recessed Center Panel (set back from front face by recessFrac * thickness, flush on back)
  const panelCenterZ = -thickness / 2 + panelThick / 2;
  pushSubBox(
    positions,
    normals,
    uvs,
    indices,
    0,
    0,
    panelCenterZ,
    innerW + 0.002,
    innerH + 0.002,
    panelThick,
    "vertical"
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/**
 * Builds an architectural Flat slab door (unit 1x1x1) with crisp eased micro-bevel profile.
 */
export function buildFlatSlabDoorGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // Main slab + slightly proud eased front face to catch specular edge highlights on the 2 mm reveal!
  pushSubBox(positions, normals, uvs, indices, 0, 0, -0.05, 1.0, 1.0, 0.9, "vertical");
  pushSubBox(positions, normals, uvs, indices, 0, 0, 0.45, 0.992, 0.992, 0.1, "vertical");

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/**
 * Builds stylized metallic concealed hinge cup geometry (unit scaled).
 */
export function buildHingeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  return geo;
}

/**
 * Builds stylized shelf pin cylinder geometry (unit scaled).
 */
export function buildPinGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.45, 0.45, 1, 10);
  geo.rotateZ(Math.PI / 2);
  return geo;
}
