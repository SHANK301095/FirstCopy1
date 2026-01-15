export function logInfo(message, context = {}) {
  console.info(JSON.stringify({ level: "info", message, ...context }));
}

export function logError(message, context = {}) {
  console.error(JSON.stringify({ level: "error", message, ...context }));
}
