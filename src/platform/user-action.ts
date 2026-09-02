export async function confirmUserAction(open: () => Promise<unknown>) {
  try {
    await open();
    return true;
  } catch {
    return false;
  }
}

export async function promptUserInput(open: () => Promise<{ value?: unknown }>) {
  try {
    const result = await open();
    return typeof result.value === 'string' ? result.value.trim() : undefined;
  } catch {
    return undefined;
  }
}
