import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAmbassador,
  deleteAmbassador,
  getAmbassador,
  getAmbassadors,
  updateAmbassador,
} from '@/services/ambassadorApi';
import type { AmbassadorInput } from '@/types/domain';

const input: AmbassadorInput = {
  name: 'Test Ambassador',
  username: 'tester',
  email: 'test@example.com',
  phone: '555-0100',
  website: 'example.com',
  city: 'Toronto',
  company: 'INTOTO Partner',
};

afterEach(() => vi.unstubAllGlobals());

describe('JSONPlaceholder ambassador API', () => {
  it('reads the list and a detail record', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 1,
              ...input,
              address: { city: input.city },
              company: { name: input.company },
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 1,
            ...input,
            address: { city: input.city },
            company: { name: input.company },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    expect(await getAmbassadors()).toHaveLength(1);
    expect((await getAmbassador('1')).name).toBe(input.name);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://jsonplaceholder.typicode.com/users', {
      signal: undefined,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://jsonplaceholder.typicode.com/users/1',
      { signal: undefined },
    );
  });

  it('creates, updates, and deletes through the expected HTTP methods', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 11 }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect((await createAmbassador(input)).id).toBe('11');
    expect((await updateAmbassador('1', input)).id).toBe('1');
    await deleteAmbassador('1');

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' });
  });
});
