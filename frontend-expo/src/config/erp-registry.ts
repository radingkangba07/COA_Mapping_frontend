import type { ERPAdapter } from '@/features/migration/types/erp.types';

// ─── Source Mappers ─────────────────────────────────────────────────────────

import { sapSourceMapper } from '@/features/migration/mappers/source/sap.mapper';
import { netsuiteSourceMapper } from '@/features/migration/mappers/source/netsuite.mapper';
import { dynamics365SourceMapper } from '@/features/migration/mappers/source/dynamics365.mapper';
import { quickbooksSourceMapper } from '@/features/migration/mappers/source/quickbooks.mapper';
import { sageSourceMapper } from '@/features/migration/mappers/source/sage.mapper';
import { xeroSourceMapper } from '@/features/migration/mappers/source/xero.mapper';
import { odooSourceMapper } from '@/features/migration/mappers/source/odoo.mapper';
import { sysproSourceMapper } from '@/features/migration/mappers/source/syspro.mapper';
import { accpacSourceMapper } from '@/features/migration/mappers/source/accpac.mapper';
import { genericSourceMapper } from '@/features/migration/mappers/source/generic.mapper';

// ─── Target Mappers ─────────────────────────────────────────────────────────

import { sapTargetMapper } from '@/features/migration/mappers/target/sap.mapper';
import { netsuiteTargetMapper } from '@/features/migration/mappers/target/netsuite.mapper';
import { dynamics365TargetMapper } from '@/features/migration/mappers/target/dynamics365.mapper';
import { quickbooksTargetMapper } from '@/features/migration/mappers/target/quickbooks.mapper';
import { sageTargetMapper } from '@/features/migration/mappers/target/sage.mapper';
import { xeroTargetMapper } from '@/features/migration/mappers/target/xero.mapper';
import { odooTargetMapper } from '@/features/migration/mappers/target/odoo.mapper';
import { sysproTargetMapper } from '@/features/migration/mappers/target/syspro.mapper';
import { accpacTargetMapper } from '@/features/migration/mappers/target/accpac.mapper';
import { genericTargetMapper } from '@/features/migration/mappers/target/generic.mapper';

// ─── Registries ─────────────────────────────────────────────────────────────

const sourceMappers: Readonly<Record<string, ERPAdapter>> = {
  [sapSourceMapper.id]: sapSourceMapper,
  [netsuiteSourceMapper.id]: netsuiteSourceMapper,
  [dynamics365SourceMapper.id]: dynamics365SourceMapper,
  [quickbooksSourceMapper.id]: quickbooksSourceMapper,
  [sageSourceMapper.id]: sageSourceMapper,
  [xeroSourceMapper.id]: xeroSourceMapper,
  [odooSourceMapper.id]: odooSourceMapper,
  [sysproSourceMapper.id]: sysproSourceMapper,
  [accpacSourceMapper.id]: accpacSourceMapper,
  [genericSourceMapper.id]: genericSourceMapper,
};

const targetMappers: Readonly<Record<string, ERPAdapter>> = {
  [sapTargetMapper.id]: sapTargetMapper,
  [netsuiteTargetMapper.id]: netsuiteTargetMapper,
  [dynamics365TargetMapper.id]: dynamics365TargetMapper,
  [quickbooksTargetMapper.id]: quickbooksTargetMapper,
  [sageTargetMapper.id]: sageTargetMapper,
  [xeroTargetMapper.id]: xeroTargetMapper,
  [odooTargetMapper.id]: odooTargetMapper,
  [sysproTargetMapper.id]: sysproTargetMapper,
  [accpacTargetMapper.id]: accpacTargetMapper,
  [genericTargetMapper.id]: genericTargetMapper,
};

// ─── Lookup Functions ───────────────────────────────────────────────────────

export function getSourceMapper(erpId: string): ERPAdapter {
  return sourceMappers[erpId] ?? genericSourceMapper;
}

export function getTargetMapper(erpId: string): ERPAdapter {
  return targetMappers[erpId] ?? genericTargetMapper;
}

export function getRegisteredSourceMappers(): readonly ERPAdapter[] {
  return Object.values(sourceMappers);
}

export function getRegisteredTargetMappers(): readonly ERPAdapter[] {
  return Object.values(targetMappers);
}
