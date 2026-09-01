import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { PlatformApplication, PublishedNavigation, TenantSummary } from '@/service/api';
import {
  fetchMyPermissionCodes,
  fetchPublishedNavigation,
  fetchSelectTenant,
  fetchTenantApplications,
  fetchUserTenants
} from '@/service/api';
import { sessionStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import {
  createSerialTaskQueue,
  failedTenantSelectionContext,
  retainActiveNavigations,
  selectActiveTenant
} from '@/platform/application-context';
import { filterNavigationsByPermissions, navigationPermissionCodes } from '@/platform/navigation';

export const usePlatformStore = defineStore(SetupStoreId.Platform, () => {
  const loading = ref(false);
  const errorMessage = ref('');
  const initializedSubject = ref('');
  const tenants = ref<TenantSummary[]>([]);
  const selectedTenantId = ref(sessionStg.get('selectedTenantId') || '');
  const selectedApplicationId = ref(sessionStg.get('selectedApplicationId') || '');
  const applications = ref<PlatformApplication[]>([]);
  const navigations = ref<PublishedNavigation[]>([]);
  let requestRevision = 0;
  const enqueueTenantSelection = createSerialTaskQueue();

  const selectedTenant = computed(() => tenants.value.find(item => item.id === selectedTenantId.value));
  const selectedApplication = computed(() => applications.value.find(item => item.id === selectedApplicationId.value));

  async function initialize(subject: string) {
    if (initializedSubject.value === subject && tenants.value.length) return;

    loading.value = true;
    errorMessage.value = '';
    try {
      const { data, error } = await fetchUserTenants(subject);
      if (error) throw error;

      tenants.value = data.items.filter(item => item.status === 'active');
      const selected = selectActiveTenant(tenants.value, selectedTenantId.value);

      if (selected) {
        await selectTenant(selected.id);
      } else {
        clearTenantSelection();
      }
      initializedSubject.value = subject;
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '加载应用上下文失败';
      throw error;
    } finally {
      loading.value = false;
    }
  }

  function selectTenant(tenantId: string) {
    return enqueueTenantSelection(() => selectTenantOnce(tenantId));
  }

  async function selectTenantOnce(tenantId: string) {
    if (!tenants.value.some(item => item.id === tenantId)) {
      throw new Error('selected tenant is not available to the current user');
    }

    requestRevision += 1;
    const revision = requestRevision;
    const previousTenantId = selectedTenantId.value;
    const previousApplicationId = selectedApplicationId.value;
    let scopeExchanged = false;
    loading.value = true;
    errorMessage.value = '';
    try {
      const { data: selection, error: selectionError } = await fetchSelectTenant(tenantId);
      if (selectionError) throw selectionError;
      if (revision !== requestRevision) return;

      sessionStg.set('token', selection.access_token);
      scopeExchanged = true;
      selectedTenantId.value = tenantId;
      sessionStg.set('selectedTenantId', tenantId);

      const { data, error } = await fetchTenantApplications(tenantId);
      if (error) throw error;

      const results = await Promise.all(data.applications.map(item => fetchPublishedNavigation(item.id)));
      if (revision !== requestRevision) return;

      applications.value = data.applications.filter(item => item.status === 'active');
      const successfulNavigations = results.flatMap(result => (result.error ? [] : [result.data]));
      const activeNavigations = retainActiveNavigations(applications.value, successfulNavigations);
      const permissionCodes = navigationPermissionCodes(activeNavigations);
      if (permissionCodes.length) {
        const batches = Array.from({ length: Math.ceil(permissionCodes.length / 100) }, (_, index) =>
          permissionCodes.slice(index * 100, (index + 1) * 100)
        );
        const permissionResults = await Promise.all(batches.map(batch => fetchMyPermissionCodes(tenantId, batch)));
        const permissionError = permissionResults.find(result => result.error)?.error;
        if (permissionError) throw permissionError;
        if (revision !== requestRevision) return;
        const allowedCodes = permissionResults.flatMap(result => result.data?.allowed_codes ?? []);
        navigations.value = filterNavigationsByPermissions(activeNavigations, allowedCodes);
      } else {
        navigations.value = activeNavigations;
      }

      if (!applications.value.some(item => item.id === selectedApplicationId.value)) {
        selectedApplicationId.value = '';
        sessionStg.remove('selectedApplicationId');
      }
    } catch (error) {
      if (revision === requestRevision) {
        const failure = failedTenantSelectionContext({
          scopeExchanged,
          previousTenantId,
          previousApplicationId,
          requestedTenantId: tenantId
        });
        selectedTenantId.value = failure.tenantId;
        selectedApplicationId.value = failure.applicationId;
        if (failure.tenantId) sessionStg.set('selectedTenantId', failure.tenantId);
        else sessionStg.remove('selectedTenantId');
        if (failure.applicationId) sessionStg.set('selectedApplicationId', failure.applicationId);
        else sessionStg.remove('selectedApplicationId');
        if (failure.clearResources) {
          applications.value = [];
          navigations.value = [];
        }
        errorMessage.value = error instanceof Error ? error.message : '切换租户失败';
      }
      throw error;
    } finally {
      if (revision === requestRevision) loading.value = false;
    }
  }

  function selectApplication(applicationId: string) {
    if (!applications.value.some(item => item.id === applicationId)) {
      throw new Error('selected application is not granted to the current tenant');
    }
    selectedApplicationId.value = applicationId;
    sessionStg.set('selectedApplicationId', applicationId);
  }

  function clearTenantSelection() {
    requestRevision += 1;
    selectedTenantId.value = '';
    selectedApplicationId.value = '';
    applications.value = [];
    navigations.value = [];
    sessionStg.remove('selectedTenantId');
    sessionStg.remove('selectedApplicationId');
    loading.value = false;
  }

  function resetContext() {
    initializedSubject.value = '';
    tenants.value = [];
    errorMessage.value = '';
    clearTenantSelection();
  }

  return {
    loading,
    errorMessage,
    tenants,
    selectedTenantId,
    selectedApplicationId,
    selectedTenant,
    selectedApplication,
    applications,
    navigations,
    initialize,
    selectTenant,
    selectApplication,
    resetContext
  };
});
