// src/components/myself/MySignature.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/mySignature.module.css";
import SignaturePad from "signature_pad";
import { getToken } from "../../lib/serviceToken";
import {
  userSignatureGet,
  userSignatureUpsert,
  userSignatureDelete,
} from "../../lib/data";

// --- helpers --------------------------------------------------------------

const fitStrokesToCanvas = (strokes, targetW, targetH, padding = 12) => {
  if (!Array.isArray(strokes) || strokes.length === 0) return strokes;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const s of strokes) {
    const pts = Array.isArray(s?.points) ? s.points : [];
    for (const p of pts) {
      if (typeof p?.x !== "number" || typeof p?.y !== "number") continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  if (!isFinite(minX)) return strokes;

  const srcW = Math.max(1, maxX - minX);
  const srcH = Math.max(1, maxY - minY);

  const dstW = Math.max(1, targetW - padding * 2);
  const dstH = Math.max(1, targetH - padding * 2);

  const scale = Math.min(dstW / srcW, dstH / srcH);

  const newW = srcW * scale;
  const newH = srcH * scale;

  const offsetX = (targetW - newW) / 2;
  const offsetY = (targetH - newH) / 2;

  return strokes.map((s) => {
    const pts = Array.isArray(s?.points) ? s.points : [];
    return {
      ...s,
      points: pts.map((p) => ({
        ...p,
        x: offsetX + (p.x - minX) * scale,
        y: offsetY + (p.y - minY) * scale,
      })),
    };
  });
};

const isNonEmptyStrokes = (strokes) =>
  Array.isArray(strokes) && strokes.length > 0;

// --- component ------------------------------------------------------------

const MySignature = ({ user, modal, charge, onChange }) => {
  const userId = user?._id;

  const [open, setOpen] = useState(false);
  const [loadingSig, setLoadingSig] = useState(false);
  const [strokes, setStrokes] = useState(null);

  const editCanvasRef = useRef(null);
  const editPadRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const exists = useMemo(() => isNonEmptyStrokes(strokes), [strokes]);

  const close = () => setOpen(false);

  // --- fetch signature ----------------------------------------------------

  useEffect(() => {
    if (!userId) {
      setStrokes(null);
      return;
    }

    let mounted = true;

    const run = async () => {
      setLoadingSig(true);
      try {
        const token = getToken();
        const data = await userSignatureGet({ userId }, token);

        if (!mounted) return;

        if (!data || data.error) {
          setStrokes(null);
          return;
        }

        setStrokes(
          Array.isArray(data?.signature?.strokes) ? data.signature.strokes : null
        );
      } finally {
        if (mounted) setLoadingSig(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [userId]);

  // --- preview draw (responsive, no deform on mobile) ---------------------

  const drawPreview = useCallback(() => {
    const node = previewCanvasRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    node.width = Math.floor(rect.width * ratio);
    node.height = Math.floor(rect.height * ratio);

    const ctx = node.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!isNonEmptyStrokes(strokes)) return;

    const pad = new SignaturePad(node, { penColor: "#111" });
    pad.clear();

    try {
      const fitted = fitStrokesToCanvas(strokes, rect.width, rect.height, 12);
      pad.fromData(fitted);
    } catch {}

    pad.off();
    node.style.pointerEvents = "none";
  }, [strokes]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  useEffect(() => {
    const node = previewCanvasRef.current;
    if (!node) return;

    const ro = new ResizeObserver(() => drawPreview());
    ro.observe(node);

    return () => ro.disconnect();
  }, [drawPreview]);

  // --- editor init --------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const canvas = editCanvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    editPadRef.current = new SignaturePad(canvas, {
      minWidth: 0.9,
      maxWidth: 2.2,
      penColor: "#111",
    });

    if (isNonEmptyStrokes(strokes)) {
      try {
        editPadRef.current.fromData(strokes);
      } catch {}
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      editPadRef.current?.off?.();
      editPadRef.current = null;
    };
  }, [open, strokes]);

  // --- handlers -----------------------------------------------------------

  const handleOpen = () => setOpen(true);

  const handleClear = () => {
    editPadRef.current?.clear();
  };

  const handleSave = async () => {
    if (!userId) return;

    const pad = editPadRef.current;
    if (!pad || pad.isEmpty()) {
      modal("Firma", "Por favor, firma en el recuadro antes de guardar.");
      return;
    }

    const nextStrokes = pad.toData();

    charge(true);
    try {
      const token = getToken();
      const data = await userSignatureUpsert({ userId, strokes: nextStrokes }, token);

      if (!data || data.error) {
        modal(
          "Error al guardar firma",
          data?.message || "No se pudo guardar la firma."
        );
        return;
      }

      // ⚠️ NO TOCAR (tal como pediste)
      if (data?._id) onChange?.(data);
      else if (data?._id) onChange?.(data);

      setStrokes(nextStrokes);
      modal("Firma", "Firma guardada correctamente.");
      setOpen(false);
    } finally {
      charge(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;

    charge(true);
    try {
      const token = getToken();
      const data = await userSignatureDelete({ userId }, token);

      if (!data || data.error) {
        modal(
          "Error al borrar firma",
          data?.message || "No se pudo borrar la firma."
        );
        return;
      }

      // ⚠️ NO TOCAR (tal como pediste)
      if (data?._id) onChange?.(data);
      else if (data?._id) onChange?.(data);

      setStrokes(null);
      modal("Firma", "Firma borrada correctamente.");
    } finally {
      charge(false);
    }
  };

  // --- render -------------------------------------------------------------

  return (
    <div className={styles.contenedor}>
      <h2>FIRMA</h2>

      <div className={styles.row}>
        <div className={styles.status}>
          {loadingSig
            ? "Cargando firma…"
            : exists
              ? "✅ Firma guardada"
              : "⚠️ No hay firma guardada"}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={handleOpen}>
            {exists ? "Actualizar firma" : "Crear firma"}
          </button>

          {exists && (
            <button type="button" className={styles.danger} onClick={handleDelete}>
              Borrar
            </button>
          )}
        </div>
      </div>

      <div className={styles.previewBox}>
        {exists ? (
          <canvas ref={previewCanvasRef} className={styles.previewCanvas} />
        ) : (
          <div className={styles.previewEmpty}>Aún no has registrado tu firma.</div>
        )}
      </div>

      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Firma aquí:</h3>
              <button type="button" className={styles.iconBtn} onClick={close}>
                ✕
              </button>
            </div>

            <div className={styles.padWrap}>
              <canvas ref={editCanvasRef} className={styles.canvas} />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondary} onClick={handleClear}>
                Limpiar
              </button>
              <button type="button" className={styles.primary} onClick={handleSave}>
                Guardar firma
              </button>
            </div>

            <div className={styles.hint}>
              Esta firma se usará automáticamente al firmar nóminas.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySignature;