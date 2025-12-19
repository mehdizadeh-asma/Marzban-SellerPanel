// Minimal mongoose stubs to keep type-checking light without using `any`
declare module "mongoose" {
  export interface Document<T = unknown> {
    _id?: unknown;
    id?: unknown;
    toObject(): T & { _id?: unknown };
    save(): Promise<T>;
  }

  export class Schema<T = unknown> {
    constructor(definition?: Record<string, unknown>, options?: Record<string, unknown>);
  }

  export interface QueryResult<T> extends Promise<T> {
    lean(): Promise<T>;
    exec(): Promise<T>;
  }

  export interface Model<T = unknown> {
    new (...args: unknown[]): T & Document<T>;
    find(...args: unknown[]): QueryResult<T[]>;
    findOne(...args: unknown[]): QueryResult<T | null>;
    findByIdAndUpdate(...args: unknown[]): QueryResult<T | null>;
    findOneAndDelete(...args: unknown[]): QueryResult<T | null>;
    deleteOne(...args: unknown[]): Promise<unknown>;
    deleteMany(...args: unknown[]): Promise<unknown>;
    insertMany(...args: unknown[]): Promise<unknown>;
    create(doc: unknown): Promise<T>;
    modelName?: string;
  }

  export interface Connection {
    models: Record<string, Model<unknown>>;
    model<T = unknown>(name: string, schema: Schema): Model<T>;
    close(): Promise<void>;
    readyState?: unknown;
    on?(event: string, listener: (...args: unknown[]) => void): void;
    once?(event: string, listener: (...args: unknown[]) => void): void;
    removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  }

  export type ConnectOptions = Record<string, unknown>;

  export namespace Types {
    class ObjectId {
      constructor(id?: string);
      toString(): string;
    }
  }

  const mongoose: {
    createConnection(connectionString: string, options?: ConnectOptions): Connection;
    ConnectionStates?: Record<string, unknown>;
    connection?: Connection;
  };

  export default mongoose;
}
/* eslint-disable */
