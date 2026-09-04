import type { components as SchedulerContract } from '@/service/contracts/generated/scheduler';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';

type JobContract = SchedulerContract['schemas']['httptransport.JobBody'];
type ExecutionContract = SchedulerContract['schemas']['httptransport.ExecutionBody'];
type JobPageContract = SchedulerContract['schemas']['httptransport.JobPageBody'];
type ExecutionPageContract = SchedulerContract['schemas']['httptransport.ExecutionPageBody'];

export interface ScheduledJob extends JobContract, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
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
  tenant_id: string;
  application_id: string;
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

export interface SchedulerScope {
  tenantID: string;
  applicationID: string;
}

export interface SchedulerJobQuery extends SchedulerScope {
  status: string;
  page: number;
  pageSize: number;
}

interface JobPage extends JobPageContract {
  items: ScheduledJob[];
  total: number;
  page: number;
  page_size: number;
}

interface ExecutionPage extends ExecutionPageContract {
  items: JobExecution[];
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

export function listJobs(query: SchedulerJobQuery) {
  return unwrap<JobPage>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/list',
      method: 'post',
      data: {
        ...applicationScope(query.tenantID, query.applicationID),
        status: query.status,
        page: query.page,
        page_size: query.pageSize
      }
    })
  );
}

export function getJob(id: string) {
  return unwrap<ScheduledJob>(schedulerRequest({ url: '/api/v1/scheduler/jobs/get', method: 'post', data: { id } }));
}

export function createJob(scope: SchedulerScope, input: JobInput, idempotencyKey: string) {
  return unwrap<ScheduledJob>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/create',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { ...applicationScope(scope.tenantID, scope.applicationID), ...jobPayload(input) }
    })
  );
}

export function updateJob(job: ScheduledJob, input: JobInput, idempotencyKey: string) {
  return unwrap<ScheduledJob>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/update',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { id: job.id, version: job.version, ...jobPayload(input) }
    })
  );
}

export function deleteJob(job: ScheduledJob, idempotencyKey: string) {
  return unwrap<{ deleted: boolean }>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/delete',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { id: job.id, version: job.version }
    })
  );
}

export function triggerJob(job: ScheduledJob, idempotencyKey: string) {
  return unwrap<JobExecution>(
    schedulerRequest({
      url: '/api/v1/scheduler/jobs/trigger',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: { id: job.id, expected_version: job.version }
    })
  );
}

export function listExecutions(jobID: string, page: number, pageSize: number) {
  return unwrap<ExecutionPage>(
    schedulerRequest({
      url: '/api/v1/scheduler/executions/list',
      method: 'post',
      data: { job_id: jobID, page, page_size: pageSize }
    })
  );
}

export function getExecution(id: string) {
  return unwrap<JobExecution>(
    schedulerRequest({ url: '/api/v1/scheduler/executions/get', method: 'post', data: { id } })
  );
}
