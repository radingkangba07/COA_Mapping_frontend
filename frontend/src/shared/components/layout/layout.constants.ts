export type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
export type Alignment = 'start' | 'center' | 'end' | 'stretch';

export const GAP_MAP: Record<GapSize, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
};

export const ALIGN_MAP: Record<Alignment, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};
