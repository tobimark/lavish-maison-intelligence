export interface ValidationIssue {
  code: string;
  file: string;
  jsonPointer: string;
  message: string;
}

export interface EntityRecord {
  id: string;
  kind: string;
  file: string;
  jsonPointer: string;
  value: unknown;
}

export interface EntityIndex {
  byId: Map<string, EntityRecord>;
  byKind: Record<string, EntityRecord[]>;
  duplicates: ValidationIssue[];
}

export interface DeliverySemanticsResult {
  errors: ValidationIssue[];
  warnings: string[];
}

export interface ExpectedCheckpointsResult {
  errors: ValidationIssue[];
  warnings: string[];
}

export interface EventAnalysis {
  errors: ValidationIssue[];
  exposedBySequence: Map<number, ReadonlySet<string>>;
  stageEvents: Map<string, unknown[]>;
  stageCompletedSequence: Record<string, number>;
  stageStartedSequence: Record<string, number>;
}

export interface CheckpointProjectionResult {
  status: 'pass' | 'fail' | 'not_run';
  reason: string;
}

export interface SemanticValidationResult {
  index: EntityIndex;
  l2Errors: ValidationIssue[];
  l3Errors: ValidationIssue[];
  l4PathErrors: ValidationIssue[];
  warnings: string[];
  eventsAnalysis: EventAnalysis;
  checkpointProjection: CheckpointProjectionResult;
}

export declare const SCHEMA_VERSION: '1.0.0';
export declare const SCENARIO_IDS: readonly string[];
export declare const SLUG_BY_SCENARIO: Readonly<Record<string, string>>;
export declare const STAGE_ORDER: readonly string[];
export declare const STAGE_STATES: readonly string[];
export declare const FILE_NAMES: readonly string[];
export declare const DATA_FILE_NAMES: readonly string[];
export declare const MEDIA_PREFIX: '/scenario-media/';
export declare const ID_PATTERN: RegExp;
export declare const INVALID_EMAIL_PATTERN: RegExp;
export declare const BASE_ENTITY_KINDS: ReadonlySet<string>;
export declare const VISIBLE_ENTITY_KINDS: ReadonlySet<string>;
export declare const GOLDEN_EVENT_TYPES: readonly string[];

export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function asArray<T = unknown>(value: unknown): T[];
export declare function asString(value: unknown): string;
export declare function issue(
  code: string,
  file: string,
  jsonPointer: string,
  message: string,
): ValidationIssue;
export declare function escapePointerSegment(segment: unknown): string;
export declare function pointer(base: string, ...segments: unknown[]): string;

export declare function detectContractDefects(schema: unknown): ValidationIssue[];
export declare function collectEntityIndex(bundle: unknown): EntityIndex;
export declare function validateHeaders(bundle: unknown): ValidationIssue[];
export declare function validateEntityNamespaces(
  bundle: unknown,
  index: EntityIndex,
): ValidationIssue[];
export declare function validateReferences(bundle: unknown, index: EntityIndex): ValidationIssue[];
export declare function validateEntryChain(bundle: unknown, index: EntityIndex): ValidationIssue[];
export declare function validateScriptTimelineAndVideos(
  bundle: unknown,
  index: EntityIndex,
): ValidationIssue[];
export declare function validateDeliverySemantics(
  bundle: unknown,
  index: EntityIndex,
): DeliverySemanticsResult;
export declare function validateMediaPathSafety(bundle: unknown): ValidationIssue[];
export declare function analyseEvents(bundle: unknown, index: EntityIndex): EventAnalysis;
export declare function validateExpectedCheckpoints(
  bundle: unknown,
  eventsAnalysis: EventAnalysis,
  index: EntityIndex,
): ExpectedCheckpointsResult;
export declare function compareCheckpointProjection(
  bundle: unknown,
  reducer?: unknown,
): CheckpointProjectionResult;
export declare function validateSemantics(bundle: unknown): SemanticValidationResult;
