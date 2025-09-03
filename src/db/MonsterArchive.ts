// MonsterEntry.ts

import { Entity } from 'dexie'
import type database from './database'
import { Monster } from 'src/components/models'
import MonsterMakerDatabase from './database'
import { useMonsterStore } from 'src/stores/monster-store'
import { IDatabaseChange } from 'dexie-observable/api'
import 'dexie-observable';

export default class MonsterArchive extends Entity<database> {
  uuid!: string
  name!: string
  created_at!: Date
  updated_at!: Date
  monster!: Monster
  current!: string
}

export class ArchiveManager {
  protected current_entry: MonsterArchive = {} as MonsterArchive
  protected db: MonsterMakerDatabase;
  protected monsterStore

  /**
   * Tracks changes in monster store.
   * 
   * Resets on load of a monster or deletion of current entry.
   */
  protected is_changed = false;

  constructor(db: MonsterMakerDatabase) {
    this.db = db;
    this.monsterStore = useMonsterStore()
    this.monsterStore.$subscribe(
      () => { this.is_changed = true }
    )
    this.db.monsterArchive.where('current').equals('1').first().then((result) => {
      if (result != undefined) {
        this.current_entry = result
      }
    }).catch((result) => { console.log(result) })
  }

  reset() {
    this.db.monsterArchive.where('current').equals('1').modify((value, ref) => {
      ref.value.current = '0'
    })
    this.current_entry = {} as MonsterArchive
    this.is_changed = false
  }
  isChanged() {
    return this.is_changed
  }

  hasCurrentMonster() {
    return this.current_entry.name !== undefined
  }

  getCurrentMonster() {
    return this.current_entry
  }

  async activateMonster(uuid: string): Promise<MonsterArchive | undefined> {
    const promise = this.db.monsterArchive.get(uuid)
    promise.then((new_current) => {
      if (new_current != undefined && new_current.monster != undefined) {
        // Needs to run before reset.
        this.monsterStore.$state = new_current.monster
        // Reset the state information.
        this.reset()
        this.current_entry = new_current
        // Update current entry in database.
        this.db.monsterArchive.update(this.current_entry.uuid, { current: '1' })
      }
    })
    return promise;
  }


  async getMonster(uuid: string): Promise<MonsterArchive | undefined> {
    return this.db.monsterArchive.get(uuid)
  }

  async getMonsters(keys: string[]): Promise<(MonsterArchive | undefined)[]> {
    return this.db.monsterArchive.bulkGet(keys)
  }

  async getAllMonsters(): Promise<(MonsterArchive | undefined)[]> {
    return this.db.monsterArchive.toArray()
  }

  async saveCurrentMonster(name = '', new_entry = false): Promise<{ uuid: string, message: string }> {
    const monster = JSON.parse(JSON.stringify(this.monsterStore.$state))
    const result = {
      uuid: '',
      message: 'editor.monsterarchive.saved'
    }
    try {
      if (!new_entry && this.hasCurrentMonster()) {
        const entry = { monster: monster, updated_at: new Date(), name: this.current_entry.name };
        if (name.length > 0) {
          entry.name = name
        }
        await this.db.monsterArchive.update(this.current_entry.uuid, entry)
        result.message = 'editor.monsterarchive.overwrite_saved'
      } else {
        if (name.length < 1) {
          name = monster.name
        }
        this.reset()
        result.uuid = await this.db.monsterArchive.add({ name: name, created_at: new Date(), updated_at: new Date(), monster: monster, current: '1' });
        this.db.monsterArchive.get(result.uuid).then((result) => {
          if (result != undefined) {
            this.current_entry = result
            this.is_changed = false;
          }
        })
      }

    } catch (e) {
      return Promise.reject('io.dexie.error')
    }
    return result
  }

  /**
   * 
   * 
   * @param monster 
   * @param name 
   * @param created_at 
   * @param updated_at 
   * @returns 
   */
  async importEntry(entry: MonsterArchive, overwrite = false): Promise<string> {
    try {
      if (entry.monster == undefined) {
        return Promise.reject('io.import.error')
      }
      const import_entry = {
        name: entry.name,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        monster: entry.monster,
        current: '0'
      }
      if (entry.name == undefined || entry.name.length < 1) {
        import_entry.name = entry.monster.name
      }
      if (entry.created_at == undefined) {
        import_entry.created_at = new Date()
      }
      if (entry.updated_at == undefined) {
        import_entry.updated_at = new Date()
      }
      import_entry.created_at = new Date(entry.created_at)
      import_entry.updated_at = new Date(entry.updated_at)
      if (overwrite) {
        if (entry.uuid == this.current_entry.uuid) {
          import_entry.current = '1'
        }
        const update = await this.db.monsterArchive.update(entry.uuid, import_entry);
        if (update == 0) {
          return this.db.monsterArchive.add(import_entry);
        } else {
          return entry.uuid
        }
      } else {
        return this.db.monsterArchive.add(import_entry);
      }
    } catch (e) {
      return Promise.reject('io.dexie.error')
    }
  }

  /**
   * Deletes a monster entry from the database.
   * 
   * Resets the state if current monster is deleted.
   * 
   * @param entry 
   *   The entry to delete.
   */
  async deleteMonster(entry: MonsterArchive) {
    this.db.monsterArchive.delete(entry.uuid).then(() => {
      if (entry.uuid == this.current_entry.uuid) {
        this.reset();
      }
    });
  }

  on(subscriber: (changes: IDatabaseChange[], partial: boolean) => void): void {
    this.db.on('changes', subscriber)
  }


}