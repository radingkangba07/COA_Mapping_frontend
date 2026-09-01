import { getEntityPack } from '../entity-pack.service';

describe('entity-pack.service', () => {
  describe('getEntityPack', () => {
    it('returns a valid EntityPack for the items fixture', async () => {
      const result = await getEntityPack('items');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('items');
        expect(result.data.label.plural).toBe('Items');
        expect(result.data.fields.length).toBeGreaterThan(0);
        expect(result.data.readiness).toBeDefined();
        expect(result.data.metrics).toBeDefined();
      }
    });

    it('returns a valid EntityPack for the customers fixture', async () => {
      const result = await getEntityPack('customers');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('customers');
        expect(result.data.label.plural).toBe('Customers');
        expect(result.data.fields.length).toBeGreaterThan(0);
      }
    });

    it('returns entity_pack_not_found for an entity with no fixture', async () => {
      const result = await getEntityPack('vendors');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('entity_pack_not_found');
      }
    });

    it('returns entity_pack_invalid when the fixture fails schema validation', async () => {
      // The fixture is a static import, so a mid-file mock + re-require (this
      // Jest config transpiles to CommonJS — dynamic `import()` isn't
      // available without --experimental-vm-modules) is the only way to
      // exercise the "malformed data" branch without a real broken fixture
      // living in the repo.
      jest.resetModules();
      jest.doMock('../../dp-kit/fixtures/items.entity.json', () => ({
        id: 'items',
        label: { singular: 'Item', plural: 'Items' },
        source: { object: 'Item master extract' },
        identity: { candidates: [] },
        // `fields` and `datatype`/`impact` on each field are required by the
        // schema — omitting `fields` entirely is the deliberate break here.
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getEntityPack: getEntityPackWithBrokenFixture } = require('../entity-pack.service');
      const result = await getEntityPackWithBrokenFixture('items');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('entity_pack_invalid');
        expect(result.error.details).toHaveProperty('issues');
      }

      jest.dontMock('../../dp-kit/fixtures/items.entity.json');
      jest.resetModules();
    });
  });
});
