'use client';

import styles from './poc.module.css';

export interface ReplayControlsProps {
  playing: boolean;
  speed: 1 | 2 | 4;
  cursorSequence: number;
  totalSequences: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onRestart: () => void;
  onSeek: (sequence: number) => void;
  onSpeed: (speed: 1 | 2 | 4) => void;
}

export function ReplayControls({
  playing,
  speed,
  cursorSequence,
  totalSequences,
  onPlay,
  onPause,
  onStep,
  onRestart,
  onSeek,
  onSpeed,
}: ReplayControlsProps) {
  return (
    <div className={styles.replay} role="group" aria-label="Replay controls" data-testid="replay-controls">
      <button
        type="button"
        className={styles.replayButton}
        data-active={playing ? 'true' : 'false'}
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
        data-testid="replay-play-pause"
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <button type="button" className={styles.replayButton} onClick={onStep} disabled={cursorSequence >= totalSequences} data-testid="replay-step">
        Step
      </button>
      <div className={styles.replayGroup} role="group" aria-label="Playback speed">
        {([1, 2, 4] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={styles.replayButton}
            aria-pressed={speed === value}
            onClick={() => onSpeed(value)}
            data-testid={`replay-speed-${value}`}
          >
            {value}×
          </button>
        ))}
      </div>
      <button type="button" className={styles.replayButton} onClick={onRestart} data-testid="replay-restart">
        Restart
      </button>
      <input
        className={styles.replayRange}
        type="range"
        min={0}
        max={totalSequences}
        step={1}
        value={cursorSequence}
        aria-label="Replay sequence"
        onChange={(event) => onSeek(Number(event.target.value))}
        data-testid="replay-seek"
      />
      <span className={styles.replayTime}>
        seq {cursorSequence}/{totalSequences} · {speed}×
      </span>
    </div>
  );
}
