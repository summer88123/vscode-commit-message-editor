import * as vscode from 'vscode';

export interface DynamicOptionItem {
  label: string;
  value?: string;
  description?: string;
}

export interface DynamicOptionsContext {
  repositoryPath?: string;
  tokenValues: Record<string, string>;
  cancellationToken?: vscode.CancellationToken;
}

export interface DynamicOptionsProvider {
  provideOptions(
    context: DynamicOptionsContext
  ): DynamicOptionItem[] | Promise<DynamicOptionItem[]>;
}
