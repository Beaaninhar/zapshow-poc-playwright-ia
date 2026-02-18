export function getFileName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || filePath;
}

export function toArtifactUrl(filePath: string): string {
  return `/api/artifacts?path=${encodeURIComponent(filePath)}`;
}

export function toFileUrl(filePath: string): string {
  return toArtifactUrl(filePath);
}
