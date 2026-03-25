import Dexie, { type Table } from 'dexie';
import { seedScenarios } from '../data/seedScenarios';
import type { Scenario, SessionLogEvent } from '../types/scenario';

export async function reseedScenarios(table: Table<Scenario, string>) {
  await table.clear();
  await table.bulkAdd(seedScenarios);
}

export class SimNurseDB extends Dexie {
  scenarios!: Table<Scenario, string>;
  sessionLogs!: Table<SessionLogEvent, number>;

  constructor() {
    super('SimNurseDB');

    this.version(3)
      .stores({
        scenarios: '&scenario_id, title',
        sessionLogs: '++id, session_id, scenario_id, timestamp, event_type',
      })
      .upgrade(async (tx) => {
        await tx.table('sessionLogs').clear();
        await reseedScenarios(tx.table('scenarios') as Table<Scenario, string>);
      });

    // v4: reseed scenarios to populate new `patient` demographics field (ISSUE-18)
    this.version(4)
      .stores({
        scenarios: '&scenario_id, title',
        sessionLogs: '++id, session_id, scenario_id, timestamp, event_type',
      })
      .upgrade(async (tx) => {
        await reseedScenarios(tx.table('scenarios') as Table<Scenario, string>);
      });

    // v5: reseed scenarios to populate new `meta` difficulty/domain/duration field (ISSUE-02)
    this.version(5)
      .stores({
        scenarios: '&scenario_id, title',
        sessionLogs: '++id, session_id, scenario_id, timestamp, event_type',
      })
      .upgrade(async (tx) => {
        await reseedScenarios(tx.table('scenarios') as Table<Scenario, string>);
      });

    this.on('populate', async () => {
      await this.scenarios.bulkAdd(seedScenarios);
    });
  }
}

export const db = new SimNurseDB();

if (import.meta.env.DEV) {
  void db.on('ready', async () => {
    try {
      await reseedScenarios(db.scenarios);
    } catch (error) {
      console.error('Failed to sync seed scenarios.', error);
    }
  });
}
