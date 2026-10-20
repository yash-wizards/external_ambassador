import { FormEvent, useEffect, useRef, useState } from 'react';
import { StateView } from '@/components/StateView';
import { useAuth } from '@/features/auth/AuthProvider';
import { listMockConversations, listMockMessages, sendMockMessage } from '@/mocks/store';
import { userFacingStatus } from '@/services/http';
import { connectLiveChat, emitWithAck, mapConversation, mapMessage, type LiveChatConnection } from '@/services/liveChat';
import type { ChatMessage, Conversation } from '@/types/domain';

interface ListResponse {
  success?: boolean;
  message?: string;
  info?: { docs?: Parameters<typeof mapConversation>[0][] };
}

interface MessageResponse {
  success?: boolean;
  message?: string;
  info?: { docs?: Parameters<typeof mapMessage>[0][]; messages?: Parameters<typeof mapMessage>[0][] } | Parameters<typeof mapMessage>[0];
}

export function ChatPage() {
  const { mode, user, http } = useAuth();
  const [rooms, setRooms] = useState<Conversation[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [threadStatus, setThreadStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const connectionRef = useRef<LiveChatConnection | null>(null);
  const roomsRequestRef = useRef(0);
  const threadRequestRef = useRef(0);
  const live = mode === 'live' && user?.source === 'live';

  const loadRooms = async () => {
    const requestId = ++roomsRequestRef.current;
    setStatus('loading');
    setError(null);
    try {
      if (!live) {
        const next = listMockConversations();
        if (requestId !== roomsRequestRef.current) return;
        setRooms(next);
        setRoomId((current) => current || next[0]?.id || null);
        setStatus('ready');
        return;
      }
      const connection = connectionRef.current;
      if (!connection) throw new Error('Chat is offline.');
      const response = await emitWithAck<ListResponse>(connection.chat, 'chatlist:fetch', {
        pageIndex: 1,
        pageSize: 30,
      });
      if (requestId !== roomsRequestRef.current) return;
      if (!response.success) throw new Error(response.message || 'Unable to load conversations.');
      const next = (response.info?.docs ?? []).map(mapConversation).filter((item): item is Conversation => Boolean(item));
      setRooms(next);
      setRoomId((current) => current || next[0]?.id || null);
      setStatus(next.length ? 'ready' : 'ready');
    } catch (err) {
      if (requestId !== roomsRequestRef.current) return;
      setError(userFacingStatus(err).message);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!live || !user) {
      void loadRooms();
      return undefined;
    }
    const token = http.getAccessToken();
    if (!token) return undefined;
    const connection = connectLiveChat(http.baseUrl, token, user.refId);
    connectionRef.current = connection;
    const onConnect = () => {
      void loadRooms();
    };
    connection.chat.on('connect', onConnect);
    connection.chat.on('chatlist:updates', () => {
      void loadRooms();
    });
    if (connection.chat.connected) onConnect();
    return () => {
      connection.close();
      connectionRef.current = null;
    };
    // Socket lifecycle follows the signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, user?.refId]);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setThreadStatus('empty');
      return;
    }
    const requestId = ++threadRequestRef.current;
    setThreadStatus('loading');
    const run = async () => {
      if (!live) {
        const next = listMockMessages(roomId);
        if (requestId !== threadRequestRef.current) return;
        setMessages(next);
        setThreadStatus(next.length ? 'ready' : 'empty');
        return;
      }
      const connection = connectionRef.current;
      if (!connection || !user) throw new Error('Chat is offline.');
      await emitWithAck(connection.room, 'chatroom:join', { roomId });
      const response = await emitWithAck<MessageResponse>(connection.room, 'chatroom:fetch', {
        roomId,
        pageIndex: 1,
        pageSize: 30,
      });
      if (requestId !== threadRequestRef.current) return;
      if (!response.success) throw new Error(response.message || 'Unable to load messages.');
      const info = response.info;
      const docs = info && 'docs' in info ? info.docs : info && 'messages' in info ? info.messages : [];
      const next = (docs ?? [])
        .map((doc) => mapMessage(doc, roomId, user.refId))
        .filter((item): item is ChatMessage => Boolean(item))
        .sort((a, b) => a.sentAt - b.sentAt);
      setMessages(next);
      setThreadStatus(next.length ? 'ready' : 'empty');
    };
    void run().catch((err: unknown) => {
      if (requestId !== threadRequestRef.current) return;
      setError(userFacingStatus(err).message);
      setThreadStatus('error');
    });
  }, [live, roomId, user]);

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !roomId || sending) return;
    setSending(true);
    setNotice(null);
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      roomId,
      body: text,
      sentAt: Date.now(),
      mine: true,
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);
    setDraft('');
    try {
      if (!live) {
        const saved = sendMockMessage(roomId, text);
        setMessages((current) => current.map((item) => (item.id === optimistic.id ? saved : item)));
      } else {
        const connection = connectionRef.current;
        if (!connection) throw new Error('Chat is offline.');
        const response = await emitWithAck<{ success?: boolean; message?: string; info?: { _id?: string; content?: string; sentAt?: number; senderRefId?: string } }>(
          connection.room,
          'chatroom:send_msg',
          { roomId, content: text, msgType: 'TEXT', sentAt: Date.now() },
        );
        if (!response.success) throw new Error(response.message || 'Message could not be sent.');
        setMessages((current) =>
          current.map((item) =>
            item.id === optimistic.id
              ? {
                  ...item,
                  id: response.info?._id || item.id,
                  pending: false,
                  failed: false,
                }
              : item,
          ),
        );
      }
      setNotice('Message sent.');
    } catch (err) {
      setMessages((current) =>
        current.map((item) => (item.id === optimistic.id ? { ...item, pending: false, failed: true } : item)),
      );
      setError(userFacingStatus(err).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <h2>Chat</h2>
      <p className="muted">Conversations you are allowed to see. A failed room does not sign you out.</p>
      {notice ? <p className="banner info" role="status">{notice}</p> : null}
      <div className="chat-layout">
        <div>
          <StateView status={status === 'error' ? 'error' : status === 'loading' ? 'loading' : rooms.length ? 'ready' : 'empty'} error={error || undefined} onRetry={() => void loadRooms()} emptyTitle="No conversations" emptyBody="You have no conversations yet.">
            <div className="list" role="list">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="row"
                  aria-current={room.id === roomId ? 'true' : undefined}
                  onClick={() => setRoomId(room.id)}
                >
                  <span>
                    <strong>{room.title}</strong>
                    <p className="muted">{room.preview}</p>
                  </span>
                  {room.source === 'mock' ? <span className="tag warn">Sample</span> : null}
                </button>
              ))}
            </div>
          </StateView>
        </div>
        <div className="panel">
          <StateView status={threadStatus} error={error || undefined} onRetry={() => setRoomId(roomId)} emptyTitle="No messages" emptyBody="Send a message to start.">
            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`bubble${message.mine ? ' mine' : ''}${message.failed ? ' failed' : ''}`}>
                  <p style={{ margin: 0 }}>{message.body}</p>
                  <p className="muted">{message.failed ? 'Not sent' : new Date(message.sentAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </StateView>
          <form onSubmit={(event) => void onSend(event)} className="toolbar">
            <label className="sr-only" htmlFor="chat-draft">Message</label>
            <textarea id="chat-draft" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" />
            <button className="btn" type="submit" disabled={sending || !draft.trim() || !roomId}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
