import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createAmbassador,
  deleteAmbassador,
  getAmbassadors,
  updateAmbassador,
} from '@/services/ambassadorApi';
import type { Ambassador, AmbassadorInput } from '@/types/domain';

interface AmbassadorsContextValue {
  ambassadors: Ambassador[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (input: AmbassadorInput) => Promise<Ambassador>;
  update: (id: string, input: AmbassadorInput) => Promise<Ambassador>;
  remove: (id: string) => Promise<void>;
}

const AmbassadorsContext = createContext<AmbassadorsContextValue | null>(null);

export function AmbassadorsProvider({ children }: { children: ReactNode }) {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAmbassadors(await getAmbassadors());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load ambassadors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (input: AmbassadorInput) => {
    const created = await createAmbassador(input);
    setAmbassadors((current) => [created, ...current]);
    return created;
  }, []);

  const update = useCallback(async (id: string, input: AmbassadorInput) => {
    const updated = await updateAmbassador(id, input);
    setAmbassadors((current) => current.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteAmbassador(id);
    setAmbassadors((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({ ambassadors, loading, error, reload, create, update, remove }),
    [ambassadors, create, error, loading, reload, remove, update],
  );

  return <AmbassadorsContext.Provider value={value}>{children}</AmbassadorsContext.Provider>;
}

export function useAmbassadors(): AmbassadorsContextValue {
  const value = useContext(AmbassadorsContext);
  if (!value) throw new Error('useAmbassadors must be used within AmbassadorsProvider');
  return value;
}
