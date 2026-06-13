import type { EntityId } from "./types.js";

export interface IdentifiedEntity {
  entityId: EntityId;
}

export class EntityStore<TEntity extends IdentifiedEntity> {
  private readonly entities = new Map<EntityId, TEntity>();

  get size(): number {
    return this.entities.size;
  }

  add(entity: TEntity): void {
    if (this.entities.has(entity.entityId)) {
      throw new Error(`Encja ${entity.entityId} już istnieje.`);
    }
    this.entities.set(entity.entityId, entity);
  }

  get(entityId: EntityId): TEntity | undefined {
    return this.entities.get(entityId);
  }

  require(entityId: EntityId): TEntity {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`Nie znaleziono encji ${entityId}.`);
    return entity;
  }

  has(entityId: EntityId): boolean {
    return this.entities.has(entityId);
  }

  remove(entityId: EntityId): boolean {
    return this.entities.delete(entityId);
  }

  clear(): void {
    this.entities.clear();
  }

  values(): TEntity[] {
    return [...this.entities.values()].sort((left, right) => left.entityId.localeCompare(right.entityId));
  }

  filter<TSubtype extends TEntity>(predicate: (entity: TEntity) => entity is TSubtype): TSubtype[];
  filter(predicate: (entity: TEntity) => boolean): TEntity[];
  filter(predicate: (entity: TEntity) => boolean): TEntity[] {
    return this.values().filter(predicate);
  }
}

export class EntityIdAllocator {
  private sequence: number;

  constructor(nextSequence = 1) {
    if (!Number.isInteger(nextSequence) || nextSequence < 1) {
      throw new Error("Sekwencja ID encji musi być dodatnią liczbą całkowitą.");
    }
    this.sequence = nextSequence;
  }

  allocate(kind: "player" | "monster" | "projectile" | "item"): EntityId {
    const value = this.sequence;
    this.sequence += 1;
    return `entity.${kind}.${String(value).padStart(6, "0")}`;
  }

  snapshot(): number {
    return this.sequence;
  }

  restore(nextSequence: number): void {
    if (!Number.isInteger(nextSequence) || nextSequence < 1) {
      throw new Error("Nieprawidłowy stan alokatora ID encji.");
    }
    this.sequence = nextSequence;
  }
}
