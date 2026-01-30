import { useEffect, useMemo, useState } from "react";
import styles from "../styles/availableJobsPanel.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { getData, offerList } from "../../lib/data";
import { FaArrowLeft } from "react-icons/fa";
import { LuMapPin, LuClock3, LuChevronDown } from "react-icons/lu";
import logoUrl from '/graphic/logotipo.png';
import logoDiscapacidad from '/graphic/discapacidad.svg';

const fmtDate = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toLocaleDateString("es-ES");
};

const createSubcategoriesIndex = (x) => {
  const index = {};
  x.forEach(x => {
    // Crear un diccionario donde la clave es el ID de la subcategoría y el valor es la subcategoría completa
    x.subcategories?.forEach(sub => {
      index[sub._id.toString()] = sub;
    });
  });
  return index;
};

export default function JobsPanel({ modal, charge }) {
  const [offers, setOffers] = useState([]);
  const [openId, setOpenId] = useState(null);
  const { id } = useParams();
  const [enums, setEnums] = useState(null)
  const navigate = useNavigate();



  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        charge?.(true);
        // ✅ solo activas + internas
        const res = await offerList({ active: true, type: "external", all: true, sort: "-createdAt" });
        const docs = Array.isArray(res?.docs) ? res.docs : [];
        const enumsDataRaw = await getData();
        if (res.error || enumsDataRaw.error) {
          modal?.("Error", "Servicio no disponible, por favor inténtelo más tarde");
          navigate("/");
        }
        const studiesIndex = createSubcategoriesIndex(enumsDataRaw?.studies)
        const jobsIndex = createSubcategoriesIndex(enumsDataRaw?.jobs)
        const provincesIndex=createSubcategoriesIndex(enumsDataRaw?.provinces)
        setEnums({ studies: studiesIndex, jobs: jobsIndex, provinces: provincesIndex});
        if (!alive) return;
        setOffers(docs);
        if (id) {
          const exists = docs.find((o) => String(o._id) === String(id));
          if (exists) setOpenId(String(exists._id));
        }
      } catch {
        modal?.("Error", "Servicio no disponible, por favor inténtelo más tarde");
        navigate("/");
      } finally {
        charge?.(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordered = useMemo(() => {
    const MONTHS = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };

    const parseWhen = (txt) => {
      if (!txt) return { rank: 4, ts: Number.POSITIVE_INFINITY };
      const s = String(txt).trim().toLowerCase();

      // 0) inmediata / incorporación inmediata
      if (/(inmedi|ya|urgente)/i.test(s)) return { rank: 0, ts: Date.now() };

      // 1) yyyy-mm-dd
      const mIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (mIso) {
        const d = new Date(+mIso[1], +mIso[2] - 1, +mIso[3]);
        if (!Number.isNaN(d.getTime())) return { rank: 1, ts: d.getTime() };
      }

      // 2) dd/mm/yyyy o dd-mm-yyyy
      const mEu = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (mEu) {
        const d = new Date(+mEu[3], +mEu[2] - 1, +mEu[1]);
        if (!Number.isNaN(d.getTime())) return { rank: 1, ts: d.getTime() };
      }

      // 3) "septiembre 2025" | "septiembre"
      const mMon = s.match(/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de)?\s*(\d{4})?/i);
      if (mMon) {
        const month = MONTHS[mMon[1].toLowerCase()];
        const year = mMon[2] ? +mMon[2] : new Date().getFullYear();
        const d = new Date(year, month, 1);
        if (!Number.isNaN(d.getTime())) return { rank: 2, ts: d.getTime() };
      }

      // 4) texto no parseable
      return { rank: 3, ts: Number.POSITIVE_INFINITY };
    };

    const copy = [...offers];
    copy.sort((a, b) => {
      const ka = parseWhen(a.expected_incorporation_date);
      const kb = parseWhen(b.expected_incorporation_date);

      if (ka.rank !== kb.rank) return ka.rank - kb.rank;
      if (ka.ts !== kb.ts) return ka.ts - kb.ts;

      // desempate: más reciente creada primero
      const ca = new Date(a.createdAt || 0).getTime();
      const cb = new Date(b.createdAt || 0).getTime();
      return cb - ca;
    });

    return copy;
  }, [offers]);



  const toggle = (oid) => setOpenId((cur) => (cur === oid ? null : oid));

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <div className={styles.areas}>
          <div className={styles.igualdad}></div>
          <div className={styles.infancia}></div>
          <div className={styles.mayores}></div>
          <div className={styles.lgtbi}></div>
          <div className={styles.desarrollo}></div>
          <div className={styles.discapacidad}></div>
        </div>

        <div className={styles.areaMenu}>
          <div className={styles.logo}>
            <img src={logoUrl} alt="logoEngloba" />
            <p>Integración Laboral, Educativa y Social</p>
          </div>
        </div>
        <h2>ENVÍANOS TU CURRÍCULUM</h2>
      </div>

      {/* Card principal */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <button className={`btn-outline ${styles.back}`} onClick={() => navigate(`/`)}>
            <FaArrowLeft />
            <span>Volver</span>
          </button>
          <div className={styles.counter}>
            <span>Disponibles</span>
            <strong className={styles.badge}>{ordered.length}</strong>
          </div>
        </div>

        {/* Lista en columna */}
        <section className={styles.list} role="listbox" aria-label="Listado de ofertas">
          {ordered.length === 0 && (
            <p className={styles.empty}>No hay ofertas disponibles en este momento.</p>
          )}

          {ordered.map((o) => {
            const oid = String(o._id);

            const open = openId === oid;
            const nameJob = enums?.jobs[o?.jobId]?.name || "";
            const nameProvince=enums?.provinces[o?.provinceId]?.name || "";
            const locationText = [
              o.location?.toUpperCase() || "",
              nameProvince ? `(${nameProvince})` : ""
            ].filter(Boolean).join(" ");

            const title = (
              <>
                {nameJob}
                {locationText && (
                  <span className={styles.titleSub}> — {locationText}</span>
                )}
              </>
            );
            return (
              <article key={oid} className={`${styles.item} ${open ? styles.open : ""}`}>
                {/* Cabecera clicable */}
                <button
                  className={styles.itemHeader}
                  aria-expanded={open}
                  aria-controls={`details-${oid}`}
                  onClick={() => toggle(oid)}
                >
                  <div className={styles.headerText}>
                    <h3 className={styles.itemTitle}>{title}</h3>
                    <div className={styles.metaRow}>
                      {(o.location || o.province) && (
                        <span className={styles.pill}>
                          <LuMapPin />
                          {locationText}
                        </span>
                      )}
                      {o.work_schedule && (
                        <span className={styles.pill}>
                          <LuClock3 />
                          {o.work_schedule}
                        </span>
                      )}
                      {o.expected_incorporation_date && (
                        <span className={styles.pillSoft}>
                          Incorporación: {o.expected_incorporation_date}
                        </span>
                      )}
                    </div>
                  </div>
                  {!!o?.disability && (
                    <img
                    src={logoDiscapacidad}
                    alt="Oferta exclusiva discapacidad"
                    title="Oferta exclusiva discapacidad"
                    className={styles.iconDisability}
                  />
                                            ) 
                  }
                  <LuChevronDown className={styles.chev} aria-hidden="true" />
                </button>

                {/* Detalle colapsable */}
                <div
                  id={`details-${oid}`}
                  className={styles.details}
                  role="region"
                  aria-labelledby=""
                >
                  <div className={styles.detailsInner}>
                    {o.essentials_requirements && (
                      <section className={styles.block}>
                        <h4>Requisitos esenciales</h4>
                        <p>{o.essentials_requirements}</p>
                      </section>
                    )}

                    {o.optionals_requirements && (
                      <section className={styles.block}>
                        <h4>Se valorará</h4>
                        <p>{o.optionals_requirements}</p>
                      </section>
                    )}

                    {o.jobId && (
                      <section className={styles.block}>
                        <h4>Funciones</h4>
                        <p>{nameJob}</p>
                      </section>
                    )}

                    {o.conditions && (
                      <section className={styles.block}>
                        <h4>Condiciones</h4>
                        <p className={styles.conditions}>{o.conditions}</p>
                      </section>
                    )}

                    {Array.isArray(o.studies) && o.studies.length > 0 && (
                      <section className={styles.block}>
                        <h4>Estudios</h4>
                        <ul className={styles.studyList}>
                          {o?.studiesId?.map((s, i) => <li key={i}>{enums.studies[s]?.name}</li>)}
                        </ul>
                      </section>
                    )}

                    <div className={styles.actions}>
                      {!!o?.disability && <span className={styles.disabilityAlert}>Oferta Exclusiva para personas con discapacidad</span>}
                      <button
                        className={styles.btn}
                        onClick={() => navigate(`/trabajaconnosotros/${oid}`)}
                      >
                        Enviar curriculum
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => toggle(oid)}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
