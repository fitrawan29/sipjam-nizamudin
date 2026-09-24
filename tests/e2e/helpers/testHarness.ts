/**
 * Test Harness & Assertion Engine for SIPJAM E2E Acceptance Testing
 * Provides DOM/Canvas polyfills, colorized terminal reporting, and assertion accounting.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load environment variables (.env.local, .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Setup global DOM mocks for Node.js environment
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {
    location: { search: '', pathname: '/' },
    Notification: {
      permission: 'default',
      requestPermission: async () => 'granted',
    },
    localStorage: {
      _store: {} as Record<string, string>,
      getItem(key: string) { return this._store[key] || null; },
      setItem(key: string, val: string) { this._store[key] = String(val); },
      removeItem(key: string) { delete this._store[key]; },
      clear() { this._store = {}; }
    },
    sessionStorage: {
      _store: {} as Record<string, string>,
      getItem(key: string) { return this._store[key] || null; },
      setItem(key: string, val: string) { this._store[key] = String(val); },
      removeItem(key: string) { delete this._store[key]; },
      clear() { this._store = {}; }
    }
  };
}

if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = (global as any).window.localStorage;
}
if (typeof (global as any).sessionStorage === 'undefined') {
  (global as any).sessionStorage = (global as any).window.sessionStorage;
}

if (typeof (global as any).Notification === 'undefined') {
  (global as any).Notification = (global as any).window.Notification;
}

if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    title: 'SIPJAM',
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            save: () => {},
            translate: () => {},
            scale: () => {},
            drawImage: () => {},
            beginPath: () => {},
            roundRect: () => {},
            moveTo: () => {},
            arcTo: () => {},
            closePath: () => {},
            fill: () => {},
            stroke: () => {},
            fillText: () => {},
            restore: () => {},
          }),
          toDataURL: () => 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        };
      }
      return {
        style: {},
        setAttribute: () => {},
        appendChild: () => {},
      };
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
    documentElement: { style: {} },
  };
}

// Media stream mocks for camera tests
if (typeof (global as any).navigator === 'undefined') {
  (global as any).navigator = {
    mediaDevices: {
      getUserMedia: async (constraints: any) => {
        return {
          getTracks: () => [
            { stop: () => {}, kind: 'video', enabled: true }
          ]
        };
      }
    }
  };
}

// Terminal Formatting
export const GREEN = '\x1b[32m';
export const RED = '\x1b[31m';
export const CYAN = '\x1b[36m';
export const YELLOW = '\x1b[33m';
export const BOLD = '\x1b[1m';
export const RESET = '\x1b[0m';
export const GRAY = '\x1b[90m';

export interface TestStats {
  total: number;
  passed: number;
  failed: number;
  failures: { name: string; detail?: string }[];
}

export class TestRunner {
  private total = 0;
  private passed = 0;
  private failed = 0;
  private failures: { name: string; detail?: string }[] = [];
  private suiteName: string;

  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }

  assert(condition: boolean, testName: string, detail?: string): boolean {
    this.total++;
    if (condition) {
      console.log(`  ${GREEN}✓ [${this.total}]${RESET} ${testName}`);
      this.passed++;
      return true;
    } else {
      console.error(`  ${RED}✗ [${this.total}] FAIL:${RESET} ${testName}`);
      if (detail) {
        console.error(`     ${YELLOW}Detail:${RESET} ${detail}`);
      }
      this.failed++;
      this.failures.push({ name: testName, detail });
      return false;
    }
  }

  section(title: string) {
    console.log(`\n${CYAN}${BOLD}▶ ${title}${RESET}`);
  }

  getStats(): TestStats {
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      failures: this.failures
    };
  }

  printSummary(): boolean {
    console.log(`\n${BOLD}------------------------------------------------------------${RESET}`);
    console.log(`${BOLD}Suite Summary: ${this.suiteName}${RESET}`);
    console.log(`Total Assertions: ${this.total}`);
    console.log(`Passed: ${GREEN}${this.passed}${RESET}`);
    console.log(`Failed: ${this.failed > 0 ? RED : GREEN}${this.failed}${RESET}`);
    if (this.failed > 0) {
      console.log(`\n${RED}Failures:${RESET}`);
      this.failures.forEach((f, idx) => {
        console.log(`  ${idx + 1}. ${f.name} ${f.detail ? `(${f.detail})` : ''}`);
      });
    }
    console.log(`${BOLD}------------------------------------------------------------${RESET}\n`);
    return this.failed === 0;
  }
}
