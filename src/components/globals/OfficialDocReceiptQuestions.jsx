import React, { useState } from "react";
import styles from "../styles/recipeQuestions.module.css";
import { documentationReceiptTemplateValidateAnswers } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

export default function OfficialDocReceiptQuestions({
  documentation,
  template,
  questions = [],
  charge,
  modal,
  onClose,
  onContinue,
}) {
  const [answers, setAnswers] = useState(() =>
    (questions || []).map((q) => ({
      key: q.key,
      answer: "",
    }))
  );

  const setAnswer = (key, answer) => {
    setAnswers((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, answer } : item
      )
    );
  };

 const handleContinue = async () => {
  const missing = (questions || []).find((q) => {
    const answer = answers.find((a) => a.key === q.key)?.answer;
    return q.required && !answer;
  });

  if (missing) {
    modal?.("Campo obligatorio", `Debes responder: ${missing.label}`);
    return;
  }

  try {
    charge?.(true);

    const token = getToken();


    const result = await documentationReceiptTemplateValidateAnswers(
      {
        documentationId: documentation._id,
        answers,
      },
      token
    );


    if (result?.error) {
      modal?.("Error", result.message || "No se pudieron validar las respuestas.");
      return;
    }

    const payload = result?.data || result;

    if (payload?.canSign === false || payload?.ok === false || payload?.valid === false) {
      modal?.(
        "No se puede continuar",
        payload?.message || payload?.blockMessage || "Alguna de las respuestas impide continuar con la firma."
      );
      return;
    }


    onContinue(answers);
  } catch (error) {
    console.error("[ReceiptQuestions] error", error);
    modal?.("Error", error?.message || "No se pudieron validar las respuestas.");
  } finally {
    charge?.(false);
  }
};

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h3 className={styles.title}>
              {template?.title || `Declaración de ${documentation?.name || "documento"}`}
            </h3>
            <p className={styles.subtitle}>{documentation?.name}</p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {template?.introText && (
            <div className={styles.introBox}>
              <h4 className={styles.introTitle}>Texto de la declaración</h4>
              <p className={styles.introText}>{template.introText}</p>
            </div>
          )}

          <div className={styles.questionsList}>
            {(questions || []).map((q, index) => {
              const current = answers.find((a) => a.key === q.key)?.answer || "";

              return (
                <div key={q.key} className={styles.questionBlock}>
                  <div className={styles.questionTop}>
                    <span className={styles.questionNumber}>{index + 1}</span>

                    <p className={styles.questionLabel}>
                      {q.label}
                      {q.required && <span className={styles.requiredMark}> *</span>}
                    </p>
                  </div>

                  <div className={styles.answerOptions}>
                    <button
                      type="button"
                      className={`${styles.answerBtn} ${current === "yes" ? styles.answerActive : ""}`}
                      onClick={() => setAnswer(q.key, "yes")}
                    >
                      Sí
                    </button>

                    <button
                      type="button"
                      className={`${styles.answerBtn} ${current === "no" ? styles.answerActive : ""}`}
                      onClick={() => setAnswer(q.key, "no")}
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.continueBtn}
            onClick={handleContinue}
          >
            Continuar con la firma
          </button>
        </div>
      </div>
    </div>
  );
}