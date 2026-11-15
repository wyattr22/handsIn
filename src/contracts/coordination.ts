/** Proposed W03 contracts. Host adapters supply verified identity, grants and atomic persistence. */
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'declined_by_recipient' | 'unable_to_complete' | 'canceled';
export type AssignmentStatus = 'requested' | 'accepted' | 'declined' | 'expired' | 'canceled';
export type Permission = 'read' | 'manage' | 'perform';
export interface Recipient { id: string; circleId: string; name: string; timezone: string; userId?: string }
export interface Grant {
  actorId: string; recipientId: string; circleId: string; permissions: Permission[];
  taskIds?: string[]; startsAt?: string; expiresAt?: string; revokedAt?: string;
  /** Optional allowlist supplied by the host access resolver; omitted only for legacy/demo full-category grants. */
  categories?: string[];
}
export interface Helper { id: string; name: string; categories: string[]; unavailable: { start: string; end: string }[] }
export interface Instruction { id: string; recipientId: string; circleId: string; version: number; text: string; current: boolean }
export interface Visit {
  id: string; circleId: string; recipientId: string; title: string; kind: 'appointment' | 'visit';
  start: string; end: string; timezone: string; location: string; provider: string; notes: string;
  version: number; canceled: boolean;
  allDay?: boolean; followUpOf?: string;
}
export interface Task {
  id: string; circleId: string; recipientId: string; title: string; category: string;
  start: string; end: string; timezone: string; visitId?: string; instructionId?: string; instructionVersion?: number;
  medicationOccurrenceId?: string; seriesId?: string; status: TaskStatus; version: number;
  allDay?: boolean;
  recordingPolicy?: 'shared_care';
}
/** priority: 0/omitted = primary, 1 = secondary, 2+ = ordered additional backups. Never an access grant. */
export interface Assignment { id: string; taskId: string; helperId: string; requestedBy: string; status: AssignmentStatus; version: number; createdAt: string; priority?: number }
export type CareSource = 'self_reported' | 'observed' | 'reported_by_other';
export interface AuditEvent { id: string; taskId?: string; visitId?: string; actorId: string; at: string; action: string; instructionVersion?: number; detail: string; source?: CareSource; observedAt?: string; supersedesId?: string }
export interface CareObservation {
  id: string; circleId: string; recipientId: string; version: number; actorId: string; at: string; observedAt: string;
  source: CareSource; kind: 'skin_change' | 'injury' | 'other'; location: string; description: string;
  status: 'open' | 'acknowledged' | 'resolved'; taskId?: string; acknowledgedBy?: string; acknowledgedAt?: string;
  resolution?: string; resolvedBy?: string; resolvedAt?: string;
}
export interface NotificationEvent {
  id: string; taskId?: string; targetId: string; kind: 'assignment_requested' | 'assignment_responded' | 'task_changed' | 'task_due' | 'coverage_gap' | 'care_concern';
  dueAt: string; status: 'pending' | 'invalidated'; taskVersion: number;
  observationId?: string; recipientId?: string;
}
export interface CoordinationState {
  recipients: Recipient[]; helpers: Helper[]; grants: Grant[]; instructions: Instruction[];
  visits: Visit[]; tasks: Task[]; assignments: Assignment[]; audit: AuditEvent[]; outbox: NotificationEvent[];
  receipts: { actorId: string; key: string; fingerprint: string; resultId: string }[];
  observations?: CareObservation[];
}
export interface CreateTaskInput {
  recipientId: string; title: string; category: string; start: string; end: string; timezone: string;
  visitId?: string; instructionId?: string;
  allDay?: boolean;
  recordingPolicy?: 'shared_care';
  recurrence?: { frequency: 'daily' | 'weekly'; count: number };
}
export type CoordinationCommand =
  | { type: 'createTask'; input: CreateTaskInput }
  | { type: 'createVisit'; input: Omit<Visit, 'id' | 'circleId' | 'version' | 'canceled'> }
  | { type: 'editVisit'; id: string; expectedVersion: number; input: Omit<Visit, 'id' | 'circleId' | 'version' | 'canceled'>; rescheduleLinkedTasks?: boolean }
  | { type: 'cancelVisit'; id: string; expectedVersion: number }
  | { type: 'requestAssignment'; taskId: string; helperId: string; expectedVersion: number; priority?: number }
  | { type: 'respondAssignment'; id: string; expectedVersion: number; response: 'accepted' | 'declined' }
  | { type: 'cancelAssignment'; id: string; expectedVersion: number }
  | { type: 'outcome'; taskId: string; expectedVersion: number; status: Exclude<TaskStatus, 'open' | 'canceled'>; detail: string }
  | { type: 'careOutcome'; taskId: string; expectedVersion: number; status: Exclude<TaskStatus, 'open' | 'canceled'>; detail: string; source: CareSource; observedAt: string; correctsAuditId?: string; correctionReason?: string }
  | { type: 'editTask'; taskId: string; expectedVersion: number; scope: 'one' | 'future'; title: string; start: string; end: string; instructionVersion?: number; allDay?: boolean }
  | { type: 'cancelTask'; taskId: string; expectedVersion: number; scope: 'one' | 'future' };
export interface MutationContext { actorId: string; now: string; idempotencyKey: string; newId: () => string }
export interface Conflict { kind: 'overlap' | 'unavailable' | 'capability_unknown'; message: string }
export interface CoordinationClient {
  /** Production implementation must project through server authorization; no raw state endpoint. */
  getView(): Promise<CoordinationView>;
  getAssignmentConflicts(taskId: string, helperId: string): Promise<Conflict[]>;
  mutate(command: CoordinationCommand, idempotencyKey: string): Promise<string>;
  subscribe(refresh: () => void): () => void;
}
export interface CoordinationView { recipients: Recipient[]; helpers: Helper[]; visits: Visit[]; tasks: Task[]; assignments: Assignment[]; instructions: Instruction[]; audit: AuditEvent[] }
export interface CoveragePort { request(taskId: string): Promise<void> }
export interface MedicationPort { recordOutcome(occurrenceId: string): Promise<void> }
/** Implement in ONE database transaction; both entity changes and outbox must commit together. */
export interface CoordinationRepository {
  transaction<T>(actorId: string, work: (state: CoordinationState) => T): Promise<T>;
}
