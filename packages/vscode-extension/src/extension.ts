import * as vscode from 'vscode';
import { createStatusBar, updateStatusBar, setupFileWatchers } from './statusBar.js';
import {
  registerInitConfigCommand,
  registerDownloadDocCommand,
  registerGenerateApiCommand,
  registerGenerateModelCommand,
} from './commands.js';

export async function activate(context: vscode.ExtensionContext) {
  // Create and initialize status bar
  createStatusBar(context);
  await updateStatusBar();

  // Setup file watchers for config changes
  setupFileWatchers(context);

  // Register all commands
  registerInitConfigCommand(context);
  registerDownloadDocCommand(context);
  registerGenerateApiCommand(context);
  registerGenerateModelCommand(context);
}

export function deactivate() { }
