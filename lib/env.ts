export function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function envOptional(name: string) {
  const v = process.env[name];
  return v && v.length > 0 ? v : null;
}

export function envFlag(name: string, defaultValue = false) {
  const v = process.env[name];
  if (!v) return defaultValue;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

