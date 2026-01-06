import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchProducts, migrateProducts } from '../src/lib/products';
import {
  createMockStripe,
  createMockProduct,
  createMockListResponse,
  mockConsole,
} from './mocks';

describe('products', () => {
  let mockStripe: ReturnType<typeof createMockStripe>;
  let consoleSpy: ReturnType<typeof mockConsole>;

  beforeEach(() => {
    mockStripe = createMockStripe();
    consoleSpy = mockConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProducts', () => {
    it('should fetch all products from a single page', async () => {
      const products = [createMockProduct({ id: 'prod_1' })];
      mockStripe.products.list.mockResolvedValue(
        createMockListResponse(products)
      );

      const result = await fetchProducts(mockStripe);

      expect(result).toEqual(products);
      expect(mockStripe.products.list).toHaveBeenCalledTimes(1);
      expect(mockStripe.products.list).toHaveBeenCalledWith({ limit: 100 });
    });

    it('should paginate through multiple pages', async () => {
      const page1Products = [
        createMockProduct({ id: 'prod_1' }),
        createMockProduct({ id: 'prod_2' }),
      ];
      const page2Products = [createMockProduct({ id: 'prod_3' })];

      mockStripe.products.list
        .mockResolvedValueOnce(createMockListResponse(page1Products, true))
        .mockResolvedValueOnce(createMockListResponse(page2Products, false));

      const result = await fetchProducts(mockStripe);

      expect(result).toHaveLength(3);
      expect(mockStripe.products.list).toHaveBeenCalledTimes(2);
      expect(mockStripe.products.list).toHaveBeenNthCalledWith(1, {
        limit: 100,
      });
      expect(mockStripe.products.list).toHaveBeenNthCalledWith(2, {
        limit: 100,
        starting_after: 'prod_2',
      });
    });

    it('should handle empty product list', async () => {
      mockStripe.products.list.mockResolvedValue(createMockListResponse([]));

      const result = await fetchProducts(mockStripe);

      expect(result).toEqual([]);
      expect(mockStripe.products.list).toHaveBeenCalledTimes(1);
    });

    it('should log the number of fetched products', async () => {
      const products = [
        createMockProduct({ id: 'prod_1' }),
        createMockProduct({ id: 'prod_2' }),
      ];
      mockStripe.products.list.mockResolvedValue(
        createMockListResponse(products)
      );

      await fetchProducts(mockStripe);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('2 products')
      );
    });
  });

  describe('migrateProducts', () => {
    let oldStripe: ReturnType<typeof createMockStripe>;
    let newStripe: ReturnType<typeof createMockStripe>;

    beforeEach(() => {
      oldStripe = createMockStripe();
      newStripe = createMockStripe();
    });

    it('should only migrate active products', async () => {
      const products = [
        createMockProduct({ id: 'prod_active', active: true }),
        createMockProduct({ id: 'prod_inactive', active: false }),
      ];
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse(products)
      );
      newStripe.products.create.mockResolvedValue(
        createMockProduct({ id: 'prod_active' })
      );

      await migrateProducts(oldStripe, newStripe);

      expect(newStripe.products.create).toHaveBeenCalledTimes(1);
      expect(newStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prod_active' })
      );
    });

    it('should create product with all properties', async () => {
      const product = createMockProduct({
        id: 'prod_test',
        name: 'Test Product',
        description: 'Test description',
        metadata: { key: 'value' },
        images: ['https://example.com/image.png'],
        tax_code: 'txcd_123',
      });
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse([product])
      );
      newStripe.products.create.mockResolvedValue(product);

      await migrateProducts(oldStripe, newStripe);

      expect(newStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'prod_test',
          name: 'Test Product',
          description: 'Test description',
          metadata: { key: 'value' },
          images: ['https://example.com/image.png'],
          tax_code: 'txcd_123',
        })
      );
    });

    it('should handle tax_code as object', async () => {
      const product = createMockProduct({
        id: 'prod_test',
        tax_code: { id: 'txcd_456', object: 'tax_code' } as unknown as string,
      });
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse([product])
      );
      newStripe.products.create.mockResolvedValue(product);

      await migrateProducts(oldStripe, newStripe);

      expect(newStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tax_code: 'txcd_456',
        })
      );
    });

    it('should skip existing products', async () => {
      const product = createMockProduct({ id: 'prod_existing' });
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse([product])
      );
      newStripe.products.create.mockRejectedValue(
        new Error('Product already exists in live mode: prod_existing')
      );

      const result = await migrateProducts(oldStripe, newStripe);

      expect(result).toContain(undefined);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );
    });

    it('should throw non-"already exists" errors', async () => {
      const product = createMockProduct({ id: 'prod_test' });
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse([product])
      );
      newStripe.products.create.mockRejectedValue(
        new Error('Network error')
      );

      await expect(migrateProducts(oldStripe, newStripe)).rejects.toThrow(
        'Network error'
      );
    });

    it('should return array of created products', async () => {
      const products = [
        createMockProduct({ id: 'prod_1' }),
        createMockProduct({ id: 'prod_2' }),
      ];
      oldStripe.products.list.mockResolvedValue(
        createMockListResponse(products)
      );
      newStripe.products.create
        .mockResolvedValueOnce(products[0])
        .mockResolvedValueOnce(products[1]);

      const result = await migrateProducts(oldStripe, newStripe);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(products[0]);
      expect(result[1]).toEqual(products[1]);
    });
  });
});
