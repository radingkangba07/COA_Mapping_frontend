import { z } from 'zod';

import { ERP_SYSTEM_IDS } from '@/shared/constants/erp-systems';
import type { ERPSystemId } from '@/shared/constants/erp-systems';

export const emailSchema = z.string().email('Invalid email address');

export const requiredString = z.string().min(1, 'This field is required');

export const positiveNumber = z.number().positive('Must be a positive number');

export const erpIdSchema = z.enum(
  // z.enum() requires a tuple of [string, ...string[]], but ERP_SYSTEM_IDS is readonly ERPSystemId[].
  // This cast is safe because ERP_SYSTEM_IDS is derived from a const array and always has at least one element.
  ERP_SYSTEM_IDS as unknown as readonly [ERPSystemId, ...ERPSystemId[]],
);
