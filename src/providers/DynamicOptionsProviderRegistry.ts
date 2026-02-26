import { DynamicOptionsProvider } from './DynamicOptionsProvider';

export class DynamicOptionsProviderRegistry {
  private static _providers = new Map<string, DynamicOptionsProvider>();

  static register(id: string, provider: DynamicOptionsProvider): void {
    this._providers.set(id, provider);
  }

  static getProvider(id: string): DynamicOptionsProvider | undefined {
    return this._providers.get(id);
  }

  static unregister(id: string): void {
    this._providers.delete(id);
  }

  static clear(): void {
    this._providers.clear();
  }
}
