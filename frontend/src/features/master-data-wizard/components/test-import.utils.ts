export function shortBatch(code: string): string {
  const m = code.match(/^batch-0*(\d+)$/);
  return m != null ? `b${m[1]}` : code;
}

export function shortReqCode(code: string): string {
  return code.replace(/^batch-0*(\d+)-req-/, 'b$1-req-');
}
