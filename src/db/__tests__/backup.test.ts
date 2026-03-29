/**
 * Backup/Restore Tests
 * Ensure DB export/import works correctly
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../index";

describe("Backup/Restore", () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.delete();
    await db.open();
  });

  it("export returns correct schemaVersion", async () => {
    const backup = await db.exportAll({ compress: false });
    const parsed = JSON.parse(backup);
    
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.appVersion).toBe("1.0.0");
    expect(parsed.exportedAt).toBeDefined();
  });

  it("replace import clears settings and restores data", async () => {
    // Create initial data
    const testDataset = {
      id: "test-dataset-1",
      name: "Test Dataset",
      symbol: "NIFTY",
      timeframe: "M5",
      tz: "Asia/Kolkata",
      rowCount: 1000,
      columnsMap: { time: "timestamp", o: "open" },
      importMeta: { source: "test", importedAt: Date.now() },
      duplicatePolicy: "keep-first" as const,
      missingPolicy: "allow" as const,
      stats: { firstTs: 1000, lastTs: 2000 },
      chunks: 1,
      createdAt: Date.now(),
      rangeFromTs: 1000,
      rangeToTs: 2000,
    };

    await db.datasets.put(testDataset);

    // Create initial settings
    await db.settings.put({
      id: "app",
      slippage: 0.1,
      commission: 0.02,
      spread: 0,
      fillModel: "instant",
      positionSizing: { mode: "fixed", value: 1 },
      riskControls: {},
      timezoneDefault: "IST",
      currency: "INR",
      storageInfo: {},
      uiPrefs: {
        basicMode: false,
        tableColumns: [],
        showOnboarding: true,
        autoSaveResults: true,
      },
      assumptions: [],
      lastUpdated: Date.now(),
    });

    // Export
    const backup = await db.exportAll({ compress: false });

    // Modify settings after backup
    await db.settings.update("app", { slippage: 0.5 });
    
    // Delete dataset
    await db.datasets.delete("test-dataset-1");

    // Verify changes
    const settingsBeforeRestore = await db.settings.get("app");
    expect(settingsBeforeRestore?.slippage).toBe(0.5);
    
    const datasetsBeforeRestore = await db.datasets.count();
    expect(datasetsBeforeRestore).toBe(0);

    // Restore
    await db.importAll(backup, { mode: "replace" });

    // Verify restoration
    const settingsAfterRestore = await db.settings.get("app");
    expect(settingsAfterRestore?.slippage).toBe(0.1);
    
    const datasetsAfterRestore = await db.datasets.get("test-dataset-1");
    expect(datasetsAfterRestore?.name).toBe("Test Dataset");
  });

  it("merge import preserves existing data and skips conflicts", async () => {
    // Create existing dataset
    await db.datasets.put({
      id: "existing-dataset",
      name: "Existing",
      symbol: "BANKNIFTY",
      timeframe: "H1",
      tz: "Asia/Kolkata",
      rowCount: 500,
      columnsMap: {},
      importMeta: { source: "test", importedAt: Date.now() },
      duplicatePolicy: "keep-first",
      missingPolicy: "allow",
      stats: { firstTs: 1000, lastTs: 2000 },
      chunks: 1,
      createdAt: Date.now(),
      rangeFromTs: 1000,
      rangeToTs: 2000,
    });

    // Create backup with different dataset
    await db.datasets.put({
      id: "new-dataset",
      name: "New",
      symbol: "NIFTY",
      timeframe: "M15",
      tz: "Asia/Kolkata",
      rowCount: 1000,
      columnsMap: {},
      importMeta: { source: "test", importedAt: Date.now() },
      duplicatePolicy: "keep-first",
      missingPolicy: "allow",
      stats: { firstTs: 1000, lastTs: 2000 },
      chunks: 1,
      createdAt: Date.now(),
      rangeFromTs: 1000,
      rangeToTs: 2000,
    });

    const backup = await db.exportAll({ compress: false });

    // Delete new dataset to simulate fresh state
    await db.datasets.delete("new-dataset");

    // Merge import
    const result = await db.importAll(backup, { mode: "merge" });

    // Existing should be preserved (conflict)
    expect(result.conflicts).toContain("datasets:existing-dataset");
    
    // New should be added
    const newDs = await db.datasets.get("new-dataset");
    expect(newDs?.name).toBe("New");
  });

  it("compressed export/import works correctly", async () => {
    await db.datasets.put({
      id: "compressed-test",
      name: "Compressed Test",
      symbol: "TEST",
      timeframe: "D1",
      tz: "UTC",
      rowCount: 100,
      columnsMap: {},
      importMeta: { source: "test", importedAt: Date.now() },
      duplicatePolicy: "keep-first",
      missingPolicy: "allow",
      stats: { firstTs: 1000, lastTs: 2000 },
      chunks: 1,
      createdAt: Date.now(),
      rangeFromTs: 1000,
      rangeToTs: 2000,
    });

    const backup = await db.exportAll({ compress: true });
    
    // Compressed should be shorter than raw JSON
    const rawBackup = await db.exportAll({ compress: false });
    expect(backup.length).toBeLessThan(rawBackup.length);

    // Clear and restore
    await db.datasets.clear();
    await db.importAll(backup, { mode: "replace", compressed: true });

    const restored = await db.datasets.get("compressed-test");
    expect(restored?.name).toBe("Compressed Test");
  });
});
