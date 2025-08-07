// Simple credential events - no complex event bus

export function emitCredentialEvent(eventType: string, data: any) {
  console.log(`📡 Credential event: ${eventType}`, data);
}

export function emitCredentialUpdate() {
  emitCredentialEvent('credential_update', {});
}

export function emitCredentialDelete() {
  emitCredentialEvent('credential_delete', {});
}

// Export as default object for compatibility
export const slackCredentialEvents = {
  emitCredentialEvent,
  emitCredentialUpdate,
  emitCredentialDelete
};