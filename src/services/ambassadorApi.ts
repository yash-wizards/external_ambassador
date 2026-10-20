import type { Ambassador, AmbassadorInput } from '@/types/domain';

const API_URL = 'https://jsonplaceholder.typicode.com/users';

interface JsonPlaceholderUser {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  address?: { city?: string };
  company?: { name?: string };
}

function mapUser(user: JsonPlaceholderUser): Ambassador {
  return {
    id: String(user.id),
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    website: user.website,
    city: user.address?.city ?? '',
    company: user.company?.name ?? '',
    source: 'jsonplaceholder',
  };
}

function toPayload(input: AmbassadorInput) {
  return {
    name: input.name,
    username: input.username,
    email: input.email,
    phone: input.phone,
    website: input.website,
    address: { city: input.city },
    company: { name: input.company },
  };
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Ambassador API request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function getAmbassadors(signal?: AbortSignal): Promise<Ambassador[]> {
  const users = await parse<JsonPlaceholderUser[]>(await fetch(API_URL, { signal }));
  return users.map(mapUser);
}

export async function getAmbassador(id: string, signal?: AbortSignal): Promise<Ambassador> {
  const user = await parse<JsonPlaceholderUser>(
    await fetch(`${API_URL}/${encodeURIComponent(id)}`, { signal }),
  );
  return mapUser(user);
}

export async function createAmbassador(input: AmbassadorInput): Promise<Ambassador> {
  const created = await parse<JsonPlaceholderUser>(
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(toPayload(input)),
    }),
  );
  return { ...input, id: String(created.id), source: 'local' };
}

export async function updateAmbassador(id: string, input: AmbassadorInput): Promise<Ambassador> {
  await parse<JsonPlaceholderUser>(
    await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ id: Number(id), ...toPayload(input) }),
    }),
  );
  return { ...input, id, source: 'local' };
}

export async function deleteAmbassador(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Ambassador API request failed (${response.status}).`);
  }
}
