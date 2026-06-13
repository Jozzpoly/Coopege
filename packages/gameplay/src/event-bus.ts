export type EventListener<TEvent> = (event: TEvent) => void;

export class EventBus<TEvent extends { type: string }> {
  private readonly listeners = new Map<string, Set<EventListener<TEvent>>>();
  private readonly allListeners = new Set<EventListener<TEvent>>();
  private readonly queue: TEvent[] = [];

  emit(event: TEvent): void {
    this.queue.push(event);
    for (const listener of this.allListeners) listener(event);
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
  }

  subscribe(type: TEvent["type"], listener: EventListener<TEvent>): () => void {
    const bucket = this.listeners.get(type) ?? new Set<EventListener<TEvent>>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
    return () => bucket.delete(listener);
  }

  subscribeAll(listener: EventListener<TEvent>): () => void {
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  }

  drain(): TEvent[] {
    return this.queue.splice(0, this.queue.length);
  }
}
