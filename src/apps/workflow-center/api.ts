import type { components as WorkflowContract } from '@/service/contracts/generated/workflow';
import { platformRequest } from '@/service/request';
import { applicationScope } from '@/platform/application-context';
type DefinitionSchema = WorkflowContract['schemas']['httptransport.DefinitionDTO'];
type InstanceSchema = WorkflowContract['schemas']['httptransport.InstanceDTO'];
type TaskSchema = WorkflowContract['schemas']['httptransport.TaskDTO'];
type TaskHistorySchema = WorkflowContract['schemas']['httptransport.TaskHistoryDTO'];
export type WorkflowNode = Omit<
  WorkflowContract['schemas']['httptransport.WorkflowNodeDTO'],
  'request_template_json' | 'config_json'
> & { request_template_json?: Record<string, unknown>; config_json?: Record<string, unknown> };
export type WorkflowEdge = WorkflowContract['schemas']['httptransport.WorkflowEdgeDTO'];
export interface WorkflowDefinition extends Omit<DefinitionSchema, 'nodes'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  key: string;
  name: string;
  description: string;
  status: string;
  published_revision: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version: number;
}
export type WorkflowDefinitionCandidate = WorkflowContract['schemas']['httptransport.DefinitionCandidateDTO'] & {
  id: string;
  key: string;
  name: string;
  status: string;
  published_revision: number;
};
export interface WorkflowInstance
  extends Omit<InstanceSchema, 'variables_json' | 'result_json'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  definition_id: string;
  business_key: string;
  title: string;
  status: string;
  current_node_id: string;
  variables_json: Record<string, unknown>;
  result_json: Record<string, unknown>;
  version: number;
}
export interface WorkflowTask extends Omit<TaskSchema, 'input_json' | 'output_json'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  instance_id: string;
  name: string;
  assignee: string;
  claimed_by: string;
  status: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  version: number;
}
export type WorkflowTaskInstanceCandidate = WorkflowContract['schemas']['httptransport.TaskInstanceCandidateDTO'] & {
  id: string;
  title: string;
  business_key: string;
  status: string;
};
export interface WorkflowTaskHistory extends Omit<TaskHistorySchema, 'detail_json'>, Record<string, unknown> {
  id: string;
  tenant_id: string;
  application_id: string;
  task_id: string;
  instance_id: string;
  action: string;
  actor_id: string;
  from_status: string;
  to_status: string;
  detail_json: Record<string, unknown>;
  version: number;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
const request = platformRequest('workflow');
async function unwrap<T>(value: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await value;
  if (error) throw error;
  if (data === null) throw new Error('workflow service returned an empty response');
  return data;
}
export function listDefinitions(input: {
  tenantID: string;
  applicationID: string;
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowDefinition>>(
    request({
      url: '/api/v1/workflow/definitions/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        status: input.status,
        search: input.search,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function getDefinition(value: Pick<WorkflowDefinition, 'id' | 'tenant_id' | 'application_id'>) {
  return unwrap<WorkflowDefinition>(
    request({
      url: '/api/v1/workflow/definitions/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
}
export function saveDefinition(
  current: WorkflowDefinition | undefined,
  input: {
    tenantID: string;
    applicationID: string;
    key: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  },
  idempotencyKey: string
) {
  return unwrap<WorkflowDefinition>(
    request({
      url: current ? '/api/v1/workflow/definitions/update' : '/api/v1/workflow/definitions/create',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: current
        ? {
            id: current.id,
            ...applicationScope(input.tenantID, input.applicationID),
            name: input.name,
            description: input.description,
            nodes: input.nodes,
            edges: input.edges,
            expected_version: current.version
          }
        : {
            ...applicationScope(input.tenantID, input.applicationID),
            key: input.key,
            name: input.name,
            description: input.description,
            nodes: input.nodes,
            edges: input.edges
          }
    })
  );
}
export function changeDefinitionStatus(
  value: WorkflowDefinition,
  action: 'publish' | 'disable',
  idempotencyKey: string
) {
  return unwrap<WorkflowDefinition>(
    request({
      url: `/api/v1/workflow/definitions/${action}`,
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        expected_version: value.version
      }
    })
  );
}
export function listInstances(input: {
  tenantID: string;
  applicationID: string;
  definitionID: string;
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowInstance>>(
    request({
      url: '/api/v1/workflow/instances/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        definition_id: input.definitionID,
        status: input.status,
        search: input.search,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
function listDefinitionCandidates(
  path: '/api/v1/workflow/instances/definitions/list' | '/api/v1/workflow/instances/start-definitions/list',
  input: { tenantID: string; applicationID: string; search: string; page: number; pageSize: number }
) {
  return unwrap<Page<WorkflowDefinitionCandidate>>(
    request({
      url: path,
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        search: input.search,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export const listInstanceDefinitionCandidates = (input: {
  tenantID: string;
  applicationID: string;
  search: string;
  page: number;
  pageSize: number;
}) => listDefinitionCandidates('/api/v1/workflow/instances/definitions/list', input);
export const listStartDefinitionCandidates = (input: {
  tenantID: string;
  applicationID: string;
  search: string;
  page: number;
  pageSize: number;
}) => listDefinitionCandidates('/api/v1/workflow/instances/start-definitions/list', input);
export function getInstance(value: Pick<WorkflowInstance, 'id' | 'tenant_id' | 'application_id'>) {
  return unwrap<WorkflowInstance>(
    request({
      url: '/api/v1/workflow/instances/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
}
export function startInstance(input: {
  tenantID: string;
  applicationID: string;
  definitionKey: string;
  businessKey: string;
  title: string;
  variables: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return unwrap<WorkflowInstance>(
    request({
      url: '/api/v1/workflow/instances/start',
      method: 'post',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        definition_key: input.definitionKey,
        business_key: input.businessKey,
        title: input.title,
        variables_json: input.variables,
        idempotency_key: input.idempotencyKey
      }
    })
  );
}
export function cancelInstance(value: WorkflowInstance, reason: string, idempotencyKey: string) {
  return unwrap<WorkflowInstance>(
    request({
      url: '/api/v1/workflow/instances/cancel',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        reason,
        expected_version: value.version
      }
    })
  );
}
export function listTasks(input: {
  tenantID: string;
  applicationID: string;
  instanceID: string;
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowTask>>(
    request({
      url: '/api/v1/workflow/tasks/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        instance_id: input.instanceID,
        status: input.status,
        search: input.search,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function listTaskInstanceCandidates(input: {
  tenantID: string;
  applicationID: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowTaskInstanceCandidate>>(
    request({
      url: '/api/v1/workflow/tasks/instances/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        search: input.search,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function getTask(value: Pick<WorkflowTask, 'id' | 'tenant_id' | 'application_id'>) {
  return unwrap<WorkflowTask>(
    request({
      url: '/api/v1/workflow/tasks/get',
      method: 'post',
      data: { id: value.id, ...applicationScope(value.tenant_id, value.application_id) }
    })
  );
}
export function listTaskHistory(input: {
  tenantID: string;
  applicationID: string;
  taskID: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowTaskHistory>>(
    request({
      url: '/api/v1/workflow/tasks/history/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        task_id: input.taskID,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function listInstanceTaskHistory(input: {
  tenantID: string;
  applicationID: string;
  instanceID: string;
  page: number;
  pageSize: number;
}) {
  return unwrap<Page<WorkflowTaskHistory>>(
    request({
      url: '/api/v1/workflow/instances/task-history/list',
      method: 'post',
      data: {
        ...applicationScope(input.tenantID, input.applicationID),
        instance_id: input.instanceID,
        page: input.page,
        page_size: input.pageSize
      }
    })
  );
}
export function claimTask(value: WorkflowTask, idempotencyKey: string) {
  return unwrap<WorkflowTask>(
    request({
      url: '/api/v1/workflow/tasks/claim',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        expected_version: value.version
      }
    })
  );
}
export function completeTask(
  value: WorkflowTask,
  input: { decision: string; comment: string; output: Record<string, unknown> },
  idempotencyKey: string
) {
  return unwrap<{ task: WorkflowTask; instance: WorkflowInstance }>(
    request({
      url: '/api/v1/workflow/tasks/complete',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        decision: input.decision,
        comment: input.comment,
        output_json: input.output,
        expected_version: value.version
      }
    })
  );
}
export function delegateTask(
  value: WorkflowTask,
  input: { delegateTo: string; reason: string },
  idempotencyKey: string
) {
  return unwrap<WorkflowTask>(
    request({
      url: '/api/v1/workflow/tasks/delegate',
      method: 'post',
      headers: { 'Idempotency-Key': idempotencyKey },
      data: {
        id: value.id,
        ...applicationScope(value.tenant_id, value.application_id),
        delegate_to: input.delegateTo,
        reason: input.reason,
        expected_version: value.version
      }
    })
  );
}
