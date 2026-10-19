/**
 * Files always arrive as an authenticated blob, never as a static link, because
 * customer documents must not be reachable by URL alone.
 */
export function downloadBlobAsFile(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

/** The confirmation document is read before it is sent, so it opens rather than downloads. */
export function openBlobInNewTab(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener');
  // Revoking immediately would race the new tab; the browser frees it with the document.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
