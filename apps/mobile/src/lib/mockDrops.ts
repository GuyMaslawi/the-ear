export function isClientOnlyDropId(id: string): boolean {
  return id.startsWith('local-');
}
