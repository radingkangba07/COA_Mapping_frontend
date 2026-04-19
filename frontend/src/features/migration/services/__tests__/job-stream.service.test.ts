import {
  buildJobStreamUrl,
  jobStatusEventSchema,
  __jobStreamInternals,
} from '../job-stream.service';

describe('buildJobStreamUrl', () => {
  it('converts http:// to ws:// and appends the token as a query param', () => {
    const url = buildJobStreamUrl('http://api.test.com', 'proj-1', 'token-abc');
    expect(url).toBe('ws://api.test.com/api/v1/ws/jobs/project/proj-1?token=token-abc');
  });

  it('converts https:// to wss://', () => {
    const url = buildJobStreamUrl('https://api.test.com', 'proj-1', 'token-abc');
    expect(url).toBe('wss://api.test.com/api/v1/ws/jobs/project/proj-1?token=token-abc');
  });

  it('URL-encodes tokens with special characters', () => {
    const url = buildJobStreamUrl('http://api.test.com', 'proj-1', 'a/b+c=d&e');
    expect(url).toBe(
      'ws://api.test.com/api/v1/ws/jobs/project/proj-1?token=a%2Fb%2Bc%3Dd%26e',
    );
  });

  it('strips trailing slashes from the base URL', () => {
    const url = buildJobStreamUrl('http://api.test.com/', 'p', 't');
    expect(url).toBe('ws://api.test.com/api/v1/ws/jobs/project/p?token=t');
  });

  it('handles uppercase scheme prefixes', () => {
    const url = buildJobStreamUrl('HTTPS://api.test.com', 'p', 't');
    expect(url).toBe('wss://api.test.com/api/v1/ws/jobs/project/p?token=t');
  });
});

describe('jobStatusEventSchema', () => {
  const validPayload = {
    job_id: 'job-1',
    project_id: 'proj-1',
    company_id: 'co-1',
    job_type: 'mapping',
    status: 'running',
    source_file_id: 'src-1',
    target_file_id: 'tgt-1',
    mapping_file_id: null,
    account_type_mapping_file_id: null,
    triggered_by: 'user-1',
    created_at: '2026-04-19T00:00:00Z',
    started_at: '2026-04-19T00:00:01Z',
    completed_at: null,
    event_at: '2026-04-19T00:00:02Z',
    error_message: null,
    metadata: { source_system: 'sap', target_system: 'netsuite' },
  };

  it('accepts a fully-populated payload', () => {
    const result = jobStatusEventSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts null for every nullable field', () => {
    const result = jobStatusEventSchema.safeParse({
      ...validPayload,
      project_id: null,
      company_id: null,
      source_file_id: null,
      target_file_id: null,
      triggered_by: null,
      created_at: null,
      started_at: null,
      completed_at: null,
      event_at: null,
      error_message: null,
      metadata: { source_system: null, target_system: null },
    });
    expect(result.success).toBe(true);
  });

  it('tolerates unknown extra fields without rejection', () => {
    const result = jobStatusEventSchema.safeParse({
      ...validPayload,
      future_field: 'whatever',
    });
    expect(result.success).toBe(true);
  });

  it('rejects malformed payloads missing required fields', () => {
    const result = jobStatusEventSchema.safeParse({ job_id: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status values', () => {
    const result = jobStatusEventSchema.safeParse({
      ...validPayload,
      status: 'bogus',
    });
    expect(result.success).toBe(false);
  });
});

describe('parseFrame', () => {
  const { parseFrame } = __jobStreamInternals;

  const validPayload = {
    job_id: 'job-1',
    project_id: 'proj-1',
    company_id: null,
    job_type: 'mapping',
    status: 'completed' as const,
    source_file_id: null,
    target_file_id: null,
    mapping_file_id: null,
    account_type_mapping_file_id: null,
    triggered_by: null,
    created_at: null,
    started_at: null,
    completed_at: null,
    event_at: null,
    error_message: null,
    metadata: { source_system: null, target_system: null },
  };

  it('parses a valid JSON frame into the domain shape', () => {
    const event = parseFrame(JSON.stringify(validPayload));
    expect(event).not.toBeNull();
    expect(event?.jobId).toBe('job-1');
    expect(event?.status).toBe('completed');
    expect(event?.metadata.sourceSystem).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseFrame('not-json')).toBeNull();
  });

  it('returns null for a pong control frame', () => {
    expect(parseFrame(JSON.stringify({ type: 'pong' }))).toBeNull();
  });

  it('returns null for a malformed payload (fails zod)', () => {
    expect(parseFrame(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });
});
