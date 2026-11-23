"use client";

import React, { useEffect, useImperativeHandle, useRef } from "react";
import { StudioConfig, WoodooStudioEngine } from "@/engine/studio-engine";
import { useSite } from "./SiteProvider";

export interface StudioCanvasHandle {
  exportStill: () => string | null;
  exportGltf: () => Promise<Blob | null>;
  replayConfirm: () => void;
}

interface StudioCanvasProps {
  config: StudioConfig;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  showConceptLabel?: boolean;
}

export const StudioCanvas = React.forwardRef<StudioCanvasHandle, StudioCanvasProps>(
  function StudioCanvas(
    { config, className, style, ariaLabel, showConceptLabel = true },
    ref
  ) {
    const { quality, soundEngine, setCursorHint } = useSite();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<WoodooStudioEngine | null>(null);

    useImperativeHandle(ref, () => ({
      exportStill: () => engineRef.current?.exportHighResStill() ?? null,
      exportGltf: async () => (engineRef.current ? engineRef.current.exportGltfBlob() : null),
      replayConfirm: () => engineRef.current?.replayConfirmAssembly(),
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || quality.reducedMotion || quality.tier === "C") return;

      const engine = new WoodooStudioEngine(canvas, config);
      engine.setSoundEngine(soundEngine);
      engineRef.current = engine;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) engine.resize(width, height);
        }
      });
      ro.observe(canvas);

      return () => {
        ro.disconnect();
        engine.dispose();
        engineRef.current = null;
      };
      // Re-instantiate only if scene mode or tier changes; all other config props live-morph!
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.mode, quality.tier, quality.reducedMotion]);

    useEffect(() => {
      engineRef.current?.setSoundEngine(soundEngine);
    }, [soundEngine]);

    useEffect(() => {
      engineRef.current?.updateConfig(config);
    }, [config]);

    // Graceful Tier C / Reduced Motion static preview (never an error screen)
    if (quality.reducedMotion || quality.tier === "C") {
      const fallbackMap: Record<string, string> = {
        "l-shape": "/tier-c/scene-5.webp",
        galley: "/tier-c/scene-6.webp",
        island: "/tier-c/scene-6.webp",
        vanity: "/tier-c/scene-7.webp",
        "u-shape": "/tier-c/scene-5.webp",
      };
      const imgSrc =
        config.mode === "precision-macro"
          ? "/tier-c/scene-3.webp"
          : config.mode === "confirm-pack"
            ? "/tier-c/scene-2.webp"
            : fallbackMap[config.layout] || "/tier-c/scene-5.webp";

      return (
        <div
          className={className}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minHeight: "320px",
            background: "#161412",
            overflow: "hidden",
            ...style,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={ariaLabel || "Frameless cabinetry concept render"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {showConceptLabel && (
            <span
              className="concept-render-tag"
              style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem" }}
            >
              Concept render
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: "320px",
          ...style,
        }}
        data-cursor={config.mode === "confirm-pack" ? undefined : "Drag"}
        onMouseLeave={() => setCursorHint(null)}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            cursor: config.mode === "confirm-pack" ? "default" : "grab",
          }}
        />
        {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
        {showConceptLabel && (
          <span
            className="concept-render-tag"
            style={{ position: "absolute", bottom: "0.85rem", right: "0.85rem", pointerEvents: "none" }}
          >
            Concept render
          </span>
        )}
      </div>
    );
  }
);
