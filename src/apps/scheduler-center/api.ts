import type { components as SchedulerContract } from '@/service/contracts/generated/scheduler';
import { platformRequest } from '@/service/request';

type JobContract = SchedulerContract['schemas']['job.Job'];
type ExecutionContract = SchedulerContract['schemas']['job.Execution'];

export interface ScheduledJob extends JobContract, Record<string, unknown> {
  id: string;
  name: string;
  cron_expression: string;
  timezone: string;
  upstream: string;
  full_method: string;
  request_json: string;
  timeout_milliseconds: number;
  status: string;
  version: number;
}

export interface JobExecution extends ExecutionContract, Record<string, unknown> {
  id: string;
  job_id: string;
  trigger_type: string;
  status: string;
  response_json: string;
  error_code: string;
  error_message: string;
  duration_milliseconds: number;
}

export interface JobInput {
  name: string;
  cronExpression: string;
  timezone: string;
  upstream: string;
  fullMethod: string;
  requestJSON: string;
  timeoutMilliseconds: number;
  enabled: boolean;
}

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

const schedulerRequest = platformRequest('scheduler');

async function unwrap<T>(request: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  if (data === null) throw new Error('scheduler service returned an empty response');
  return data;
}

function jobPayload(input: JobInput) {
  return {
    name: input.name,
    cron_expression: input.cronExpression,
    timezone: input.timezone,
    upstream: input.upstream,
    full_method: input.fullMethod,
    request_json: input.requestJSON,
    timeout_milliseconds: input.timeoutMilliseconds,
    enabled: input.enabled
  };
}

export function listJobs(status: string, page: number, pageSize: number) {
  return unwrap<Page<ScheduledJob>>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/list',
      method: 'post',
      data: { status, page, page_size: pageSize }
    })
  );
}

export function createJob(input: JobInput) {
  return unwrap<ScheduledJob>(
    schedulerRequest({ url: '/api/v1/scheduler/jobs/create', method: 'post', data: jobPayload(input) })
  );
}

export function updateJob(job: ScheduledJob, input: JobInput) {
  return unwrap<ScheduledJob>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/update',
      method: 'post',
      data: { id: job.id, version: job.version, ...jobPayload(input) }
    })
  );
}

export function deleteJob(job: ScheduledJob) {
  return unwrap<{ deleted: boolean }>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/delete',
      method: 'post',
      data: { id: job.id, version: job.version }
    })
  );
}

export function triggerJob(id: string) {
  return unwrap<JobExecution>(
    schedulerRequest({ url: '/api/v1/scheduler/jobs/trigger', method: 'post', data: { id } })
  );
}

export function listExecutions(jobID: string, page: number, pageSize: number) {
  return unwrap<Page<JobExecution>>(
    schedulerRequest({
      url: '/api/v1/scheduler/executions/list',
      method: 'post',
      data: { job_id: jobID, page, page_size: pageSize }
    })
  );
}
