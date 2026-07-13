import React, { useState } from "react";
import styles from "../styles/recipeQuestions.module.css";
import {
  documentationReceiptTemplateValidateAnswers,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

export default function OfficialDocReceiptQuestions({
  documentation,
  template,
  blocks = [],
  questions = [],
  charge,
  modal,
  onClose,
  onContinue,
}) {
  const contentBlocks = [
    ...(blocks.length ? blocks : questions),
  ].sort(
    (a, b) =>
      Number(a.order || 0) -
      Number(b.order || 0)
  );

  const questionBlocks = contentBlocks.filter(
    (block) => block.type === "yesno"
  );

  const questionNumbers = new Map(
    questionBlocks.map((question, index) => [
      question.key,
      index + 1,
    ])
  );

  const [answers, setAnswers] = useState(() =>
    questionBlocks.map((question) => ({
      key: question.key,
      answer: "",
    }))
  );

  const setAnswer = (key, answer) => {
    setAnswers((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, answer }
          : item
      )
    );
  };

  const handleContinue = async () => {
    const missing = questionBlocks.find(
      (question) => {
        const answer = answers.find(
          (item) => item.key === question.key
        )?.answer;

        return question.required && !answer;
      }
    );

    if (missing) {
      modal?.(
        "Campo obligatorio",
        `Debes responder: ${missing.label}`
      );

      return;
    }

    try {
      charge?.(true);

      const token = getToken();

      const result =
        await documentationReceiptTemplateValidateAnswers(
          {
            documentationId: documentation._id,
            answers,
          },
          token
        );

      if (result?.error) {
        modal?.(
          "Error",
          result.message ||
            "No se pudieron validar las respuestas."
        );

        return;
      }

      const payload = result?.data || result;

      if (
        payload?.canSign === false ||
        payload?.ok === false ||
        payload?.valid === false
      ) {
        modal?.(
          "No se puede continuar",
          payload?.message ||
            payload?.blockMessage ||
            "Alguna respuesta impide continuar con la firma."
        );

        return;
      }

      onContinue(answers);
    } catch (error) {
      console.error(
        "[ReceiptQuestions] error",
        error
      );

      modal?.(
        "Error",
        error?.message ||
          "No se pudieron validar las respuestas."
      );
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
              {template?.title ||
                `Declaración de ${
                  documentation?.name || "documento"
                }`}
            </h3>

            <p className={styles.subtitle}>
              {documentation?.name}
            </p>
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
              <p className={styles.introText}>
                {template.introText}
              </p>
            </div>
          )}

          <div className={styles.questionsList}>
            {contentBlocks.map((block, index) => {
              if (block.type === "text") {
                return (
                  <div
                    key={`text-${index}`}
                    className={styles.textBlock}
                  >
                    <h4
                      className={
                        styles.textBlockTitle
                      }
                    >
                      {block.label}
                    </h4>

                    <p className={styles.blockText}>
                      {block.content}
                    </p>
                  </div>
                );
              }

              if (block.type === "note") {
                return (
                  <div
                    key={`note-${index}`}
                    className={styles.noteBlock}
                  >
                    <p className={styles.blockText}>
                      {block.content}
                    </p>
                  </div>
                );
              }

              const current =
                answers.find(
                  (item) =>
                    item.key === block.key
                )?.answer || "";

              return (
                <div
                  key={block.key}
                  className={styles.questionBlock}
                >
                  <div className={styles.questionTop}>
                    <span
                      className={
                        styles.questionNumber
                      }
                    >
                      {questionNumbers.get(block.key)}
                    </span>

                    <p
                      className={
                        styles.questionLabel
                      }
                    >
                      {block.label}

                      {block.required && (
                        <span
                          className={
                            styles.requiredMark
                          }
                        >
                          {" "}
                          *
                        </span>
                      )}
                    </p>
                  </div>

                  <div
                    className={styles.answerOptions}
                  >
                    <button
                      type="button"
                      className={`${styles.answerBtn} ${
                        current === "yes"
                          ? styles.answerActive
                          : ""
                      }`}
                      onClick={() =>
                        setAnswer(
                          block.key,
                          "yes"
                        )
                      }
                    >
                      Sí
                    </button>

                    <button
                      type="button"
                      className={`${styles.answerBtn} ${
                        current === "no"
                          ? styles.answerActive
                          : ""
                      }`}
                      onClick={() =>
                        setAnswer(
                          block.key,
                          "no"
                        )
                      }
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {template?.finalText && (
            <div className={styles.finalBox}>
              <p className={styles.blockText}>
                {template.finalText}
              </p>
            </div>
          )}
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