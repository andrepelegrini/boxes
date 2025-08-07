/**
 * Structured error taxonomy for better debugging
 */

export enum ConnectionErrorType {
  IMPORT_MISSING = 'import_missing',
  EVENT_NOT_HANDLED = 'event_not_handled',
  JOB_TIMEOUT = 'job_timeout',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  METADATA_CREATION_FAILED = 'metadata_creation_failed',
  SYNC_INITIALIZATION_FAILED = 'sync_initialization_failed',
  CHANNEL_JOIN_FAILED = 'channel_join_failed',
  DEPENDENCY_VALIDATION_FAILED = 'dependency_validation_failed'
}

export class ConnectionError extends Error {
  public readonly type: ConnectionErrorType;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(type: ConnectionErrorType, message: string, context: Record<string, any> = {}) {
    super(`[${type}] ${message}`);
    this.name = 'ConnectionError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toLogObject() {
    return {
      error: this.message,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

export enum JobErrorType {
  TIMEOUT = 'timeout',
  DEPENDENCY_MISSING = 'dependency_missing',
  EVENT_EMISSION_FAILED = 'event_emission_failed',
  SERVICE_CALL_FAILED = 'service_call_failed',
  STATE_CORRUPTION = 'state_corruption'
}

export class JobError extends Error {
  public readonly type: JobErrorType;
  public readonly jobId: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(type: JobErrorType, jobId: string, message: string, context: Record<string, any> = {}) {
    super(`[JOB:${jobId}][${type}] ${message}`);
    this.name = 'JobError';
    this.type = type;
    this.jobId = jobId;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toLogObject() {
    return {
      error: this.message,
      type: this.type,
      jobId: this.jobId,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}