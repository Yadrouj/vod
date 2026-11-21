// Runtime: Node >=22.13. Keep this subset until @types/node includes node:sqlite.
declare module 'node:sqlite' {
  type AnalyticsSqlValue = string | number | null;
  export class DatabaseSync {
    constructor(file: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...args: AnalyticsSqlValue[]): unknown;
      all(...args: AnalyticsSqlValue[]): Record<string, AnalyticsSqlValue>[];
      get(...args: AnalyticsSqlValue[]): Record<string, AnalyticsSqlValue> | undefined;
    };
    close(): void;
  }
}
