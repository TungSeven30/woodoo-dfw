import * as THREE from "three";

/**
 * Lightweight single-pass cinematic post-processing compositor:
 * - Subtle highlight-only bloom glow (9-tap warm soft filter above luminance threshold)
 * - Optional macro Depth-of-Field blur (active ONLY during Scene 3 macro 2 mm reveal on Tier A)
 * - Subtle architectural vignette
 * - Ultra-fine organic 35mm film grain (never noisy)
 *
 * Uses 1 offscreen WebGLRenderTarget + 1 full-screen triangle = 1 extra draw call!
 */
export class CinematicPostComposer {
  private renderer: THREE.WebGLRenderer;
  private target: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;
  private resolutionScale: number;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    resolutionScale = 1.0
  ) {
    this.renderer = renderer;
    this.resolutionScale = resolutionScale;

    // Size the offscreen buffer in device pixels, not CSS pixels, so retina screens stay sharp.
    const pr = renderer.getPixelRatio();
    const rtW = Math.max(2, Math.floor(width * pr * resolutionScale));
    const rtH = Math.max(2, Math.floor(height * pr * resolutionScale));

    this.target = new THREE.WebGLRenderTarget(rtW, rtH, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      samples: 2,
    });

    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uTexelSize: { value: new THREE.Vector2(1 / rtW, 1 / rtH) },
        uTime: { value: 0 },
        uBloomStrength: { value: 0.22 },
        uVignette: { value: 0.28 },
        uGrain: { value: 0.022 },
        uMacroDof: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uTexelSize;
        uniform float uTime;
        uniform float uBloomStrength;
        uniform float uVignette;
        uniform float uGrain;
        uniform float uMacroDof;
        varying vec2 vUv;

        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          vec4 base = texture2D(tDiffuse, vUv);
          vec3 col = base.rgb;

          // Macro Depth-of-Field during Scene 3: keep center vertical 2mm seam tack-sharp, blur outer edges
          if (uMacroDof > 0.005) {
            float centerDist = abs(vUv.x - 0.5) * 2.0;
            float blurAmt = smoothstep(0.14, 0.85, centerDist) * uMacroDof;
            if (blurAmt > 0.01) {
              vec2 r = uTexelSize * (blurAmt * 4.5);
              vec3 acc = col * 0.24;
              acc += texture2D(tDiffuse, vUv + vec2( r.x,  0.0)).rgb * 0.12;
              acc += texture2D(tDiffuse, vUv + vec2(-r.x,  0.0)).rgb * 0.12;
              acc += texture2D(tDiffuse, vUv + vec2( 0.0,  r.y)).rgb * 0.12;
              acc += texture2D(tDiffuse, vUv + vec2( 0.0, -r.y)).rgb * 0.12;
              acc += texture2D(tDiffuse, vUv + vec2( r.x,  r.y) * 0.85).rgb * 0.07;
              acc += texture2D(tDiffuse, vUv + vec2(-r.x,  r.y) * 0.85).rgb * 0.07;
              acc += texture2D(tDiffuse, vUv + vec2( r.x, -r.y) * 0.85).rgb * 0.07;
              acc += texture2D(tDiffuse, vUv + vec2(-r.x, -r.y) * 0.85).rgb * 0.07;
              col = mix(col, acc, clamp(blurAmt, 0.0, 0.92));
            }
          }

          // Highlight-only subtle warm bloom (no neon glow!)
          if (uBloomStrength > 0.005) {
            vec2 s = uTexelSize * 3.2;
            vec3 bloom = vec3(0.0);
            vec2 offsets[8];
            offsets[0] = vec2( 1.0,  0.0);
            offsets[1] = vec2(-1.0,  0.0);
            offsets[2] = vec2( 0.0,  1.0);
            offsets[3] = vec2( 0.0, -1.0);
            offsets[4] = vec2( 0.7,  0.7);
            offsets[5] = vec2(-0.7,  0.7);
            offsets[6] = vec2( 0.7, -0.7);
            offsets[7] = vec2(-0.7, -0.7);
            for (int i = 0; i < 8; i++) {
              vec3 c = texture2D(tDiffuse, vUv + offsets[i] * s).rgb;
              float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
              bloom += c * smoothstep(0.72, 1.35, l);
            }
            col += (bloom / 8.0) * uBloomStrength;
          }

          // Subtle architectural vignette
          vec2 d = vUv - 0.5;
          float vig = 1.0 - dot(d, d) * uVignette * 1.65;
          col *= clamp(vig, 0.55, 1.0);

          // Ultra-fine organic film grain
          float n = (hash12(vUv * 950.0 + fract(uTime * 1.7)) - 0.5) * uGrain;
          col += n;

          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(geo, this.material);
    this.quadScene.add(this.quadMesh);
  }

  public resize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    const rtW = Math.max(2, Math.floor(width * pr * this.resolutionScale));
    const rtH = Math.max(2, Math.floor(height * pr * this.resolutionScale));
    this.target.setSize(rtW, rtH);
    this.material.uniforms.uTexelSize.value.set(1 / rtW, 1 / rtH);
  }

  public getResolutionScale(): number {
    return this.resolutionScale;
  }

  public setResolutionScale(scale: number, width: number, height: number): void {
    this.resolutionScale = scale;
    this.resize(width, height);
  }

  public getTarget(): THREE.WebGLRenderTarget {
    return this.target;
  }

  public render(
    scene: THREE.Scene,
    camera: THREE.Camera,
    opts: { time: number; macroDof: number; bloomStrength?: number }
  ): number {
    this.material.uniforms.uTime.value = opts.time;
    this.material.uniforms.uMacroDof.value = opts.macroDof;
    if (opts.bloomStrength !== undefined) {
      this.material.uniforms.uBloomStrength.value = opts.bloomStrength;
    }

    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    const sceneDrawCalls = this.renderer.info.render.calls;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
    return sceneDrawCalls + 1;
  }

  public dispose(): void {
    this.target.dispose();
    this.quadMesh.geometry.dispose();
    this.material.dispose();
  }
}
