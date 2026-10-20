import type { ManagerOptions, Socket } from 'socket.io-client';
import { Manager } from 'socket.io-client';
import type { ChatMessage, Conversation } from '@/types/domain';

interface ChatListDoc {
  _id?: string;
  roomId?: string;
  name?: string;
  lastMessage?: string;
  lastMsgTime?: number | string;
  unread?: number;
}

interface MessageDoc {
  _id?: string;
  content?: string;
  senderRefId?: string;
  sentAt?: number | string;
}

export interface LiveChatConnection {
  chat: Socket;
  room: Socket;
  close: () => void;
}

export function connectLiveChat(baseUrl: string, accessToken: string, refId: string): LiveChatConnection {
  const manager = new Manager(baseUrl, {
    autoConnect: true,
    withCredentials: true,
    transports: ['polling'],
    upgrade: false,
    auth: { token: accessToken },
    query: { refId },
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 15000,
  } as unknown as ManagerOptions);
  const chat = manager.socket('/chat');
  const room = manager.socket('/chatroom');
  return {
    chat,
    room,
    close: () => {
      chat.disconnect();
      room.disconnect();
      manager.removeAllListeners();
    },
  };
}

export function emitWithAck<T>(socket: Socket, event: string, payload: unknown, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off(event, finish);
      reject(new Error('The chat service did not respond.'));
    }, timeoutMs);
    const finish = (response: T) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.off(event, finish);
      resolve(response);
    };
    socket.on(event, finish);
    socket.emit(event, payload);
  });
}

export function mapConversation(doc: ChatListDoc): Conversation | null {
  const id = doc.roomId || doc._id;
  if (!id) return null;
  const updated = typeof doc.lastMsgTime === 'number' ? doc.lastMsgTime : Date.parse(String(doc.lastMsgTime || '')) || Date.now();
  return {
    id,
    title: doc.name?.trim() || 'Conversation',
    preview: doc.lastMessage?.trim() || '',
    updatedAt: updated,
    unread: doc.unread ?? 0,
    source: 'live',
  };
}

export function mapMessage(doc: MessageDoc, roomId: string, refId: string): ChatMessage | null {
  const id = doc._id;
  const body = doc.content?.trim();
  if (!id || !body) return null;
  const sentAt = typeof doc.sentAt === 'number' ? doc.sentAt : Date.parse(String(doc.sentAt || '')) || Date.now();
  return {
    id,
    roomId,
    body,
    sentAt,
    mine: doc.senderRefId === refId,
  };
}
