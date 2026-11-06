'use client';

import { useEffect, useRef } from 'react';
import styles from './poc.module.css';

export type StepperState = 'completed' | 'current' | 'future';

export interface StepperStep {
  id: string;
  label: string;
  meta: string;
  state: StepperState;
}

export function Stepper({ steps, label = 'Workflow progress', onSelect }: { steps: StepperStep[]; label?: string; onSelect?: (step: StepperStep) => void }) {
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [steps]);

  return (
    <ol ref={listRef} className={styles.stepper} aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={styles.step}
          data-state={step.state}
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          {onSelect ? (
            <button type="button" className={styles.stepButton} onClick={() => onSelect(step)}>
              <StepContent step={step} index={index} />
            </button>
          ) : (
            <StepContent step={step} index={index} />
          )}
        </li>
      ))}
    </ol>
  );
}

function StepContent({ step, index }: { step: StepperStep; index: number }) {
  return (
    <>
      <span className={styles.stepNumber} aria-hidden="true">
        {step.state === 'completed' ? '✓' : index + 1}
      </span>
      <span className={styles.stepBody}>
        <span className={styles.stepLabel}>{step.label}</span>
        <span className={styles.stepMeta}>{step.meta}</span>
      </span>
    </>
  );
}
