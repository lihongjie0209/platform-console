export function emptyUserInfo(): Api.Auth.UserInfo {
  return {
    subject: '',
    subject_type: '',
    session_id: '',
    tenant_id: '',
    membership_id: '',
    username: '',
    display_name: '',
    email: '',
    phone: '',
    status: '',
    roles: [],
    buttons: []
  };
}

export function normalizeUserInfo(input: Partial<Api.Auth.UserInfo>): Api.Auth.UserInfo {
  return {
    ...emptyUserInfo(),
    ...input,
    roles: input.roles ? [...input.roles] : [],
    buttons: input.buttons ? [...input.buttons] : []
  };
}
