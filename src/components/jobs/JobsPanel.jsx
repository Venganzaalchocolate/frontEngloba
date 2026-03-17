import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/availableJobsPanel.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { getData, offerList } from "../../lib/data";
import { FaArrowLeft } from "react-icons/fa";
import {
  LuMapPin,
  LuClock3,
  LuChevronDown,
  LuSearch,
  LuFilterX,
} from "react-icons/lu";
import logoUrl from "/graphic/logotipo.png";
import logoDiscapacidad from "/graphic/discapacidad.svg";

const INITIAL_FILTERS = {
  q: "",
  provinceId: "",
  jobId: "",
  work_schedule: "",
  disability: "all",
};

export default function JobsPanel({ modal, charge }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [viewData, setViewData] = useState({
    offers: [],
    enums: {
      studies: {},
      jobs: {},
      provinces: {},
      dispositives: {},
    },
  });

  const [openId, setOpenId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const { offers, enums } = viewData;

  const getJobData = (offer) => {
    const jobId = offer?.jobId ? String(offer.jobId) : "";
    const jobName = jobId ? enums?.jobs?.[jobId]?.name || "" : "";
    return { jobId, jobName };
  };

  const getProvinceData = (offer) => {
    const dispositiveId = offer?.dispositive?.newDispositiveId
      ? String(offer.dispositive.newDispositiveId)
      : "";

    const dispositive = dispositiveId ? enums?.dispositives?.[dispositiveId] : null;
    const provinceId = dispositive?.province ? String(dispositive.province) : "";
    const provinceName = provinceId
      ? enums?.provinces?.[provinceId]?.name || ""
      : "";

    return { provinceId, provinceName };
  };

  const loadData = async () => {
    try {
      charge(true);

      const res = await offerList({
        active: true,
        type: "external",
        all: true,
        sort: "-createdAt",
      });

      const enumsDataRaw = await getData();

      if (res?.error || enumsDataRaw?.error) {
        modal?.("Error", "Servicio no disponible, por favor inténtelo más tarde");
        navigate("/");
        return;
      }

      const docs = Array.isArray(res?.docs) ? res.docs : [];

      setViewData({
        offers: docs,
        enums: {
          studies: enumsDataRaw?.studiesIndex || {},
          jobs: enumsDataRaw?.jobsIndex || {},
          provinces: enumsDataRaw?.provincesIndex || {},
          dispositives: enumsDataRaw?.dispositiveIndex || {},
        },
      });

      if (id) {
        const exists = docs.find((o) => String(o._id) === String(id));
        if (exists) setOpenId(String(exists._id));
      }
    } catch {
      modal?.("Error", "Servicio no disponible, por favor inténtelo más tarde");
      navigate("/");
    } finally {
      charge(false);
    }
  };

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordered = useMemo(() => {
    const MONTHS = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      setiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };

    const parseWhen = (txt) => {
      if (!txt) return { rank: 4, ts: Number.POSITIVE_INFINITY };
      const s = String(txt).trim().toLowerCase();

      if (/(inmedi|ya|urgente)/i.test(s)) return { rank: 0, ts: Date.now() };

      const mIso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (mIso) {
        const d = new Date(+mIso[1], +mIso[2] - 1, +mIso[3]);
        if (!Number.isNaN(d.getTime())) return { rank: 1, ts: d.getTime() };
      }

      const mEu = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (mEu) {
        const d = new Date(+mEu[3], +mEu[2] - 1, +mEu[1]);
        if (!Number.isNaN(d.getTime())) return { rank: 1, ts: d.getTime() };
      }

      const mMon = s.match(
        /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de)?\s*(\d{4})?/i
      );
      if (mMon) {
        const month = MONTHS[mMon[1].toLowerCase()];
        const year = mMon[2] ? +mMon[2] : new Date().getFullYear();
        const d = new Date(year, month, 1);
        if (!Number.isNaN(d.getTime())) return { rank: 2, ts: d.getTime() };
      }

      return { rank: 3, ts: Number.POSITIVE_INFINITY };
    };

    const copy = [...offers];

    copy.sort((a, b) => {
      const ka = parseWhen(a.expected_incorporation_date);
      const kb = parseWhen(b.expected_incorporation_date);

      if (ka.rank !== kb.rank) return ka.rank - kb.rank;
      if (ka.ts !== kb.ts) return ka.ts - kb.ts;

      const ca = new Date(a.createdAt || 0).getTime();
      const cb = new Date(b.createdAt || 0).getTime();
      return cb - ca;
    });

    return copy;
  }, [offers]);

  const provinceOptions = useMemo(() => {
    const map = new Map();

    offers.forEach((o) => {
      const { provinceId, provinceName } = getProvinceData(o);
      if (provinceId && provinceName) {
        map.set(provinceId, provinceName);
      }
    });

    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [offers, enums?.dispositives, enums?.provinces]);

  const jobOptions = useMemo(() => {
    const map = new Map();

    offers.forEach((o) => {
      const { jobId, jobName } = getJobData(o);
      if (jobId && jobName) {
        map.set(jobId, jobName);
      }
    });

    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [offers, enums?.jobs]);

  const workScheduleOptions = useMemo(() => {
    const map = new Map();

    offers.forEach((o) => {
      const value = String(o?.work_schedule || "").trim();
      if (value) map.set(value, value);
    });

    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const txt = filters.q.trim().toLowerCase();

    return ordered.filter((o) => {
      const { jobId, jobName } = getJobData(o);
      const { provinceId, provinceName } = getProvinceData(o);

      const studiesNames = Array.isArray(o?.studiesId)
        ? o.studiesId.map((s) => enums?.studies?.[s]?.name || "").join(" ")
        : "";

      const searchableText = [
        jobName,
        o?.location || "",
        provinceName,
        o?.work_schedule || "",
        o?.essentials_requirements || "",
        o?.optionals_requirements || "",
        o?.conditions || "",
        studiesNames,
      ]
        .join(" ")
        .toLowerCase();

      const matchesText = !txt || searchableText.includes(txt);
      const matchesProvince =
        !filters.provinceId || provinceId === filters.provinceId;
      const matchesJob = !filters.jobId || jobId === filters.jobId;
      const matchesWorkSchedule =
        !filters.work_schedule ||
        String(o?.work_schedule || "") === filters.work_schedule;

      const matchesDisability =
        filters.disability === "all" ||
        (filters.disability === "yes" && !!o?.disability) ||
        (filters.disability === "no" && !o?.disability);

      return (
        matchesText &&
        matchesProvince &&
        matchesJob &&
        matchesWorkSchedule &&
        matchesDisability
      );
    });
  }, [ordered, filters, enums]);

  const toggle = (oid) => {
    setOpenId((cur) => (cur === oid ? null : oid));
  };

  const updateFilter = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

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

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <button
            className={`btn-outline ${styles.back}`}
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
            <span>Volver</span>
          </button>

          <div className={styles.counter}>
            <span>Disponibles</span>
            <strong className={styles.badge}>{filteredOffers.length}</strong>
          </div>
        </div>

        <section className={styles.filters}>
          <div className={styles.filterFieldSearch}>
            <LuSearch className={styles.filterIcon} />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Buscar por puesto, ubicación o requisitos..."
              className={styles.input}
            />
          </div>

          <div className={styles.filterField}>
            <select
              value={filters.jobId}
              onChange={(e) => updateFilter("jobId", e.target.value)}
              className={styles.select}
            >
              <option value="">Todas las funciones</option>
              {jobOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <select
              value={filters.provinceId}
              onChange={(e) => updateFilter("provinceId", e.target.value)}
              className={styles.select}
            >
              <option value="">Todas las provincias</option>
              {provinceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <select
              value={filters.work_schedule}
              onChange={(e) => updateFilter("work_schedule", e.target.value)}
              className={styles.select}
            >
              <option value="">Todas las jornadas</option>
              {workScheduleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <select
              value={filters.disability}
              onChange={(e) => updateFilter("disability", e.target.value)}
              className={styles.select}
            >
              <option value="all">Todas</option>
              <option value="yes">Solo discapacidad</option>
              <option value="no">Sin discapacidad</option>
            </select>
          </div>

          <button
            type="button"
            className={styles.clearBtn}
            onClick={resetFilters}
          >
            <LuFilterX />
            Limpiar filtros
          </button>
        </section>

        <section
          className={styles.list}
          role="listbox"
          aria-label="Listado de ofertas"
        >
          {filteredOffers.length === 0 && (
            <p className={styles.empty}>
              No hay ofertas que coincidan con los filtros seleccionados.
            </p>
          )}

          {filteredOffers.map((o) => {
            const oid = String(o._id);
            const open = openId === oid;

            const { jobName: nameJob } = getJobData(o);
            const { provinceName: nameProvince } = getProvinceData(o);

            const locationText = [
              o.location?.toUpperCase() || "",
              nameProvince ? `(${nameProvince})` : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                key={oid}
                className={`${styles.item} ${open ? styles.open : ""}`}
              >
                <button
                  className={styles.itemHeader}
                  aria-expanded={open}
                  aria-controls={`details-${oid}`}
                  onClick={() => toggle(oid)}
                >
                  <div className={styles.headerText}>
                    <h3 className={styles.itemTitle}>
                      {nameJob}
                      {locationText && (
                        <span className={styles.titleSub}>
                          {" "}
                          — {locationText}
                        </span>
                      )}
                    </h3>

                    <div className={styles.metaRow}>
                      {locationText && (
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
                  )}

                  <LuChevronDown
                    className={styles.chev}
                    aria-hidden="true"
                  />
                </button>

                <div
                  id={`details-${oid}`}
                  className={styles.details}
                  role="region"
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

                    {Array.isArray(o?.studiesId) && o.studiesId.length > 0 && (
                      <section className={styles.block}>
                        <h4>Estudios</h4>
                        <ul className={styles.studyList}>
                          {o.studiesId.map((s, i) => (
                            <li key={i}>{enums?.studies?.[s]?.name || s}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    <div className={styles.actions}>
                      {!!o?.disability && (
                        <span className={styles.disabilityAlert}>
                          Oferta exclusiva para personas con discapacidad
                        </span>
                      )}

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