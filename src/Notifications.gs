function processNotificationOutbox_() {
  if (!getConfig_().notificationsEnabled) return {sent: 0, disabled: true};
  // TODO: Claim outbox items under lock, enforce approved email rules,
  // check quota, deliver, retry with backoff, and audit outcomes.
  throw new Error('Notification delivery is not implemented.');
}
