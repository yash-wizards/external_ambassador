import { classifyParentMessage, isAllowedParentOrigin } from '@/config/framePolicy';
import { parentUrlFromMessage, publishEmbedderUrl } from '@/services/embedderUrl';

const READY = { type: 'intoto:ready', version: 1 } as const;

/** Reply to an approved parent ping. Never forwards tokens or accepts identity claims. */
export function installParentBridge(allowedOrigins: string[]): () => void {
  const onMessage = (event: MessageEvent) => {
    if (!isAllowedParentOrigin(event.origin, allowedOrigins)) return;
    if (classifyParentMessage(event.data) !== 'ping') return;
    publishEmbedderUrl(parentUrlFromMessage(event.data, event.origin));
    if (!event.source || !('postMessage' in event.source)) return;
    event.source.postMessage(READY, { targetOrigin: event.origin });
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
