<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { fetchChangePassword } from '@/service/api';
import { useAuthStore } from '@/store/modules/auth';
import { validatePasswordChange } from '@/platform/password-policy';

defineOptions({ name: 'UserCenter' });

const authStore = useAuthStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' });
const rules: FormRules<typeof form> = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    {
      validator: (_rule, _value, callback) => {
        const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
        if (message && message !== '两次输入的新密码不一致') callback(new Error(message));
        else callback();
      },
      trigger: ['blur', 'change']
    }
  ],
  confirmPassword: [
    {
      validator: (_rule, _value, callback) => {
        const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
        if (message === '两次输入的新密码不一致') callback(new Error(message));
        else callback();
      },
      trigger: ['blur', 'change']
    }
  ]
};

function resetForm() {
  form.currentPassword = '';
  form.newPassword = '';
  form.confirmPassword = '';
  formRef.value?.clearValidate();
}

async function changePassword() {
  const message = validatePasswordChange(form.currentPassword, form.newPassword, form.confirmPassword);
  if (message) {
    window.$message?.error(message);
    return;
  }
  await formRef.value?.validate();
  submitting.value = true;
  try {
    const { data, error } = await fetchChangePassword(form.currentPassword, form.newPassword);
    if (error) return;
    resetForm();
    const suffix = data.revoked_sessions > 0 ? `，已退出其他 ${data.revoked_sessions} 个会话` : '';
    window.$message?.success(`密码修改成功${suffix}`);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <ElSpace direction="vertical" fill :size="16" class="w-full">
    <ElCard shadow="never">
      <template #header><span class="font-600">账号信息</span></template>
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="用户 ID">{{ authStore.userInfo.subject }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElCard>

    <ElCard shadow="never">
      <template #header>
        <div>
          <div class="font-600">修改密码</div>
          <div class="mt-4px text-12px text-#999">修改成功后保留当前会话，并撤销该账号的其他有效会话。</div>
        </div>
      </template>
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="110px" class="max-w-560px">
        <ElFormItem label="当前密码" prop="currentPassword">
          <ElInput v-model="form.currentPassword" type="password" show-password autocomplete="current-password" />
        </ElFormItem>
        <ElFormItem label="新密码" prop="newPassword">
          <ElInput v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
          <div class="text-12px text-#999">至少 12 字节，支持最长 1024 字节。</div>
        </ElFormItem>
        <ElFormItem label="确认新密码" prop="confirmPassword">
          <ElInput v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="submitting" @click="changePassword">确认修改</ElButton>
          <ElButton :disabled="submitting" @click="resetForm">重置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </ElSpace>
</template>

<style scoped></style>
