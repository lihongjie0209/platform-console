import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { PlatformApplication, PublishedNavigation, TenantSummary } from '@/service/api';
import { fetchPublishedNavigation, fetchTenantApplications, fetchUserTenants } from '@/service/api';
import { sessionStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { retainActiveNavigations, selectActiveTenant } from '@/platform/application-context';

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

  async function selectTenant(tenantId: string) {
    if (!tenants.value.some(item => item.id === tenantId)) {
      throw new Error('selected tenant is not available to the current user');
    }

    requestRevision += 1;
    const revision = requestRevision;
    loading.value = true;
    errorMessage.value = '';
    try {
      const { data, error } = await fetchTenantApplications(tenantId);
      if (error) throw error;

      const results = await Promise.all(data.applications.map(item => fetchPublishedNavigation(item.id)));
      if (revision !== requestRevision) return;

      selectedTenantId.value = tenantId;
      sessionStg.set('selectedTenantId', tenantId);
      applications.value = data.applications.filter(item => item.status === 'active');
      const successfulNavigations = results.flatMap(result => (result.error ? [] : [result.data]));
      navigations.value = retainActiveNavigations(applications.value, successfulNavigations);

      if (!applications.value.some(item => item.id === selectedApplicationId.value)) {
        selectedApplicationId.value = '';
        sessionStg.remove('selectedApplicationId');
      }
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
