// database.ts
import Dexie, { type EntityTable } from 'dexie';
import 'dexie-observable';
import MonsterArchive, { ArchiveManager } from './MonsterArchive';

export default class MonsterMakerDatabase extends Dexie {
  monsterArchive!: EntityTable<MonsterArchive, 'uuid'>;
  archiveManager: ArchiveManager

  constructor() {
    super('MonsterMaker');
    this.version(1).stores({
      monsterArchive: '$$uuid, current, name, created_at, updated_at'
    });
    this.monsterArchive.mapToClass(MonsterArchive);
    this.archiveManager = new ArchiveManager(this);
  }
  getMonsterArchive() {
    return this.archiveManager;
  }
}

export const db = new MonsterMakerDatabase();