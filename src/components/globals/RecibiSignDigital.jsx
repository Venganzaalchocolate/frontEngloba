// src/components/RecibiSignDigital.jsx
// Basado en PayrollSignDigital → mismo flujo con checkboxes para firmar "recibís"
// Usa sólo HTML + CSS‑modules + ModalForm (ya existente en tu proyecto)

import React, { useState, useRef } from 'react';
import { getToken } from '../../lib/serviceToken';
import { requestSignature, confirmSignature } from '../../lib/data';
import ModalForm from '../globals/ModalForm';
import styles from '../styles/recibiSigner.module.css';

/**
 * RecibiSignDigital
 * ------------------
 * Lista de conceptos de recibí con checkbox. Permite elegir uno o varios y firmarlos
 * mediante el mismo flujo OTP que PayrollSignDigital.
 *
 * Props:
 *  - user        → objeto usuario {_id, …}
 *  - available   → [ 'Manipulador de Alimentos', 'Protección de Datos' , … ]
 *  - folderId    → opcional, carpeta destino en Drive
 *  - charge      → (bool) => void     // spinner global
 *  - changeUser  → (data) => void     // actualizar usuario en store global
 *  - modal       → (title,msg) => void// mensajes flash
 *  - onClose     → () => void         // cerrar modal padre
 */
export default function RecibiSignDigital({
  user,
  available = [
    'Manipulador de Alimentos',
    'Protección de Datos (LOPD)',
  ],
  folderId = null,
  charge   = () => {},
  changeUser = () => {},
  modal = () => {},
  onClose = () => {},
}) {
  /* ── A. Estados ────────────────────────────────────────────── */
  const [checked, setChecked] = useState({});            // { concepto: true }
  const [queue, setQueue]     = useState([]);            // conceptos pendientes
  const [current, setCurrent] = useState(null);          // concepto en curso
  const [fileId, setFileId]   = useState(null);
  const [step, setStep]       = useState('idle');        // idle | verify
  const [error, setError]     = useState(null);
  const inFlight   = useRef(false);
  const [code, setCode]       = useState('');

  /* ── B. Handlers de selección ─────────────────────────────── */
  const toggle = (concept) =>
    setChecked((p) => ({ ...p, [concept]: !p[concept] }));

  const selected = Object.keys(checked).filter((c) => checked[c]);

  /* ── C. Iniciar firma (crea cola) ─────────────────────────── */
  const startSigning = () => {
    if (selected.length === 0) return;
    setQueue(selected);
    setChecked({});          // limpiamos los checkbox
    processNext(selected);
  };

  /* ── D. Procesar siguiente concepto ───────────────────────── */
  const processNext = async (list) => {
    if (list.length === 0) {
      modal('Todo firmado', 'Todos los recibís seleccionados han sido firmados.');
      onClose();
      return;
    }
    const concept = list[0];
    setCurrent(concept);
    charge(true);
    setError(null);

    try {
      const token = getToken();
      const body  = {
        userId: user._id,
        docType: 'recibi',
        docId  : null,
        meta   : { concept, folderId },
      };
      const resp = await requestSignature(body, token);
      if (!resp.fileId) throw new Error('No se recibió identificador.');
      setFileId(resp.fileId);
      setStep('verify');
      modal('Código enviado', `Código para firmar «${concept}» enviado a tu correo.`);
    } catch (e) {
      setError(e.message || 'Error al solicitar el código');
      // sacamos este concepto y seguimos con el resto
      setQueue((q) => q.slice(1));
      processNext(list.slice(1));
    } finally {
      charge(false);
    }
  };

  /* ── E. Verificar OTP ─────────────────────────────────────── */
  const handleVerify = async ({ code }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    charge(true);
    setError(null);

    try {
      const token   = getToken();
      const payload = { userId: user._id, fileId, code };
      const resp    = await confirmSignature(payload, token);

      if (!resp.data && !resp.message) {
        throw new Error('No pudimos completar la firma.');
      }
      modal('Éxito', `«${current}» firmado correctamente.`);
      changeUser(resp.data?.user || resp.data);

      // Siguiente en la cola
      setStep('idle');
      setCode('');
      setFileId(null);
      setQueue((q) => {
        const next = q.slice(1);
        processNext(next);
        return next;
      });
    } catch (e) {
      setError(e.message || 'Error al verificar el código');
    } finally {
      inFlight.current = false;
      charge(false);
    }
  };

  /* ── F. Render ────────────────────────────────────────────── */
  return (
    <div className={styles.container}>
      <h3>Selecciona los recibís que quieres firmar</h3>

      <ul className={styles.list}> {
        available.map((concept) => (
          <li key={concept} className={styles.item}>
            <label>
              <input
                type="checkbox"
                checked={!!checked[concept]}
                onChange={() => toggle(concept)}
                disabled={step !== 'idle'}
              />
              {concept}
            </label>
          </li>
        ))}
      </ul>

      <button
        className={styles.button}
        onClick={startSigning}
        disabled={selected.length === 0 || step !== 'idle'}
      >
        Firmar seleccionados
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {/* Modal OTP */}
      {step === 'verify' && (
        <ModalForm
          title="Verificar código"
          message={error || 'Introduce el código que recibiste por correo.'}
          fields={[{
            name: 'code', label: 'Código de verificación', type: 'text', required: true,
          }]}
          onSubmit={handleVerify}
          onClose={() => { setStep('idle'); setQueue([]); onClose(); }}
          
        />
      )}
    </div>
  );
}
