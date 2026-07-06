import { countByStatus } from '../utils/countByStatus';
import type { Workstream } from '../types/workstream.types';

const ws = (overrides: Partial<Workstream>): Workstream => ({
  id: 'ws-1',
  name: 'Test',
  projectId: 'T-001',
  status: 'not_started',
  progress: 0,
  currentStage: 'Not Started',
  included: true,
  ...overrides,
});

describe('countByStatus', () => {
  it('returns all zeros for an empty array', () => {
    const result = countByStatus([]);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.inProgress).toBe(0);
    expect(result.reviewRequired).toBe(0);
    expect(result.blocked).toBe(0);
    expect(result.notStarted).toBe(0);
    expect(result.progressPercent).toBe(0);
  });

  it('counts completed workstreams', () => {
    const result = countByStatus([
      ws({ id: 'a', status: 'completed' }),
      ws({ id: 'b', status: 'completed' }),
    ]);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
  });

  it('counts in_progress workstreams', () => {
    const result = countByStatus([ws({ status: 'in_progress' })]);
    expect(result.inProgress).toBe(1);
  });

  it('counts review_required workstreams', () => {
    const result = countByStatus([ws({ status: 'review_required' })]);
    expect(result.reviewRequired).toBe(1);
  });

  it('counts blocked workstreams', () => {
    const result = countByStatus([ws({ status: 'blocked' })]);
    expect(result.blocked).toBe(1);
  });

  it('counts not_started workstreams', () => {
    const result = countByStatus([ws({ status: 'not_started' })]);
    expect(result.notStarted).toBe(1);
  });

  it('includes not_included in total but not in any named bucket', () => {
    const result = countByStatus([ws({ status: 'not_included', included: false })]);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(0);
    expect(result.inProgress).toBe(0);
    expect(result.reviewRequired).toBe(0);
    expect(result.blocked).toBe(0);
    expect(result.notStarted).toBe(0);
  });

  it('computes progressPercent as completed / total (includes not_included in denominator)', () => {
    const result = countByStatus([
      ws({ id: 'a', status: 'completed' }),
      ws({ id: 'b', status: 'completed' }),
      ws({ id: 'c', status: 'in_progress' }),
      ws({ id: 'd', status: 'not_included', included: false }),
    ]);
    // 2 completed out of 4 total = 50%
    expect(result.progressPercent).toBe(50);
  });

  it('progressPercent rounds to nearest integer', () => {
    const result = countByStatus([
      ws({ id: 'a', status: 'completed' }),
      ws({ id: 'b', status: 'in_progress' }),
      ws({ id: 'c', status: 'in_progress' }),
    ]);
    // 1/3 = 33.33 → rounds to 33
    expect(result.progressPercent).toBe(33);
  });

  it('counts all statuses correctly in a mixed array', () => {
    const workstreams: Workstream[] = [
      ws({ id: '1', status: 'completed' }),
      ws({ id: '2', status: 'in_progress' }),
      ws({ id: '3', status: 'in_progress' }),
      ws({ id: '4', status: 'review_required' }),
      ws({ id: '5', status: 'blocked' }),
      ws({ id: '6', status: 'not_started' }),
      ws({ id: '7', status: 'not_started' }),
      ws({ id: '8', status: 'not_included', included: false }),
    ];
    const result = countByStatus(workstreams);
    expect(result.total).toBe(8);
    expect(result.completed).toBe(1);
    expect(result.inProgress).toBe(2);
    expect(result.reviewRequired).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.notStarted).toBe(2);
    expect(result.progressPercent).toBe(13); // Math.round(1/8 * 100)
  });
});
