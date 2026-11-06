'use client';

import { useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './poc.module.css';

type CommonFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
};

export type InputProps = CommonFieldProps & InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, hint, error, required, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `poc-input-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <input
        {...rest}
        id={inputId}
        className={[styles.control, className].filter(Boolean).join(' ')}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint ? <span className={styles.help} id={hintId}>{hint}</span> : null}
      {error ? (
        <span className={styles.errorText} id={errorId} role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export type SelectProps = CommonFieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ value: string; label: string }> };

export function Select({ label, hint, error, required, id, options, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `poc-select-${generatedId}`;
  const errorId = error ? `${selectId}-error` : undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <span className={styles.selectWrap}>
        <select
          {...rest}
          id={selectId}
          className={[styles.control, className].filter(Boolean).join(' ')}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
      {hint ? <span className={styles.help}>{hint}</span> : null}
      {error ? (
        <span className={styles.errorText} id={errorId} role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export type TextareaProps = CommonFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ label, hint, error, required, id, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `poc-textarea-${generatedId}`;
  const errorId = error ? `${textareaId}-error` : undefined;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textareaId}>
        {label}
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <textarea
        {...rest}
        id={textareaId}
        className={[styles.control, className].filter(Boolean).join(' ')}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      />
      {hint ? <span className={styles.help}>{hint}</span> : null}
      {error ? (
        <span className={styles.errorText} id={errorId} role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </span>
      ) : null}
    </div>
  );
}
