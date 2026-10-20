import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { StateView } from '@/components/StateView';
import { useAmbassadors } from '@/features/ambassadors/AmbassadorsProvider';
import type { Ambassador, AmbassadorInput } from '@/types/domain';

const emptyForm: AmbassadorInput = {
  name: '',
  username: '',
  email: '',
  phone: '',
  website: '',
  city: '',
  company: '',
};

export function AmbassadorsPage() {
  const { ambassadors, loading, error, reload, create, update, remove } = useAmbassadors();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Ambassador | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AmbassadorInput>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ambassadors.filter((item) =>
      query
        ? `${item.name} ${item.username} ${item.email} ${item.city} ${item.company}`
            .toLowerCase()
            .includes(query)
        : true,
    );
  }, [ambassadors, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setCreating(true);
    setActionError(null);
    setNotice(null);
  };

  const openEdit = (ambassador: Ambassador) => {
    setEditing(ambassador);
    setForm({
      name: ambassador.name,
      username: ambassador.username,
      email: ambassador.email,
      phone: ambassador.phone,
      website: ambassador.website,
      city: ambassador.city,
      company: ambassador.company,
    });
    setCreating(false);
    setActionError(null);
    setNotice(null);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.email.trim()) {
      setActionError('Name, username, and email are required.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      if (editing) {
        await update(editing.id, form);
        setNotice('Ambassador updated for this browser session.');
      } else {
        await create(form);
        setNotice('Ambassador created for this browser session.');
      }
      closeForm();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to save ambassador.');
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (ambassador: Ambassador) => {
    if (!window.confirm(`Delete ${ambassador.name}?`)) return;
    setBusy(true);
    setActionError(null);
    try {
      await remove(ambassador.id);
      setNotice('Ambassador deleted for this browser session.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to delete ambassador.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Ambassadors</h2>
          <p className="muted">CRUD demo powered by JSONPlaceholder users.</p>
        </div>
        <button className="btn" type="button" onClick={openCreate}>Add ambassador</button>
      </div>
      <p className="banner">
        JSONPlaceholder fakes POST, PUT, and DELETE responses. Successful changes are shown only
        in this browser session and reset when the page reloads.
      </p>
      {notice ? <p className="banner info" role="status">{notice}</p> : null}
      {actionError ? <p className="banner error" role="alert">{actionError}</p> : null}
      <div className="toolbar">
        <input
          aria-label="Search ambassadors"
          placeholder="Search ambassadors"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <StateView
        status={loading ? 'loading' : error ? 'error' : filtered.length ? 'ready' : 'empty'}
        error={error || undefined}
        onRetry={() => void reload()}
        emptyTitle="No ambassadors"
        emptyBody="No ambassadors match this search."
      >
        <div className="list">
          {filtered.map((ambassador) => (
            <article className="row" key={ambassador.id}>
              <span>
                <Link to={`/external-ambassador/ambassadors/${ambassador.id}`}>
                  <strong>{ambassador.name}</strong>
                </Link>
                <p className="muted">@{ambassador.username} · {ambassador.email}</p>
                <p className="muted">{ambassador.company} · {ambassador.city}</p>
              </span>
              <span className="row-actions">
                <button className="btn secondary" type="button" onClick={() => openEdit(ambassador)}>
                  Edit
                </button>
                <button className="btn ghost" type="button" disabled={busy} onClick={() => void deleteItem(ambassador)}>
                  Delete
                </button>
              </span>
            </article>
          ))}
        </div>
      </StateView>
      {creating || editing ? (
        <AmbassadorForm
          title={editing ? 'Edit ambassador' : 'Add ambassador'}
          form={form}
          busy={busy}
          onChange={setForm}
          onCancel={closeForm}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}

function AmbassadorForm({
  title,
  form,
  busy,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  form: AmbassadorInput;
  busy: boolean;
  onChange: (value: AmbassadorInput) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const field = (key: keyof AmbassadorInput, label: string, type = 'text') => (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={form[key]}
        required={key === 'name' || key === 'username' || key === 'email'}
        onChange={(event) => onChange({ ...form, [key]: event.target.value })}
      />
    </label>
  );

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="panel ambassador-form" onSubmit={onSubmit}>
        <h2>{title}</h2>
        <div className="form-grid">
          {field('name', 'Name')}
          {field('username', 'Username')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone', 'tel')}
          {field('website', 'Website')}
          {field('city', 'City')}
          {field('company', 'Company')}
        </div>
        <div className="row-actions">
          <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
