<template>
  <q-page style="min-height: calc(100vh - 120px)">
    <q-table v-model:selected="selected" :title="$t('editor.monsterarchive.title')" :rows="monsters" :columns="columns"
      :pagination="{
        rowsPerPage: 15,
        sortBy: 'updated_at',
        descending: true
      }" row-key="uuid" class="q-mx-auto q-my-md" selection="multiple" style="width: 98vw">
      <template #top>
        <div class="text-h6">{{ $t('editor.monsterarchive.title') }}</div>
        <q-space />
        <q-btn v-show="selected.length !== 0" color="negative" class="q-mr-md" @click="deleteMonsters">
          {{ $t('editor.monsterarchive.delete', selected.length) }}</q-btn>
        <q-btn color="primary" class="q-mr-md" @click="importMonsters">{{
          $t('editor.monsterarchive.import')
          }}</q-btn>
        <q-btn color="primary" class="q-mr-md" @click="downloadMonsters">{{
          $t('editor.monsterarchive.export', { n: selected.length })
          }}</q-btn>
        <q-btn color="positive" @click="saveMonster">{{
          $t('editor.monsterarchive.save_current')
          }}</q-btn>
      </template>
      <template #body="props">
        <q-tr :props="props">
          <q-td>
            <q-checkbox v-model="props.selected" />
          </q-td>
          <q-td key="name" :props="props">{{ props.row.name }}</q-td>
          <q-td key="created_at">
            {{ new Date(props.row.created_at).toLocaleString() }}
          </q-td>
          <q-td key="updated_at">
            {{ new Date(props.row.updated_at).toLocaleString() }}
          </q-td>
          <q-td key="actions">
            <q-btn icon="mode_edit" :title="$t('editor.monsterarchive.load')" @click="loadMonster(props.row)"></q-btn>
            <q-btn icon="download" :title="$t('editor.monsterarchive.export_single')"
              @click="downloadSingle(props.row)"></q-btn>
            <q-btn icon="delete" :title="$t('editor.monsterarchive.delete')" @click="deleteMonster(props.row)"></q-btn>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-page>
</template>

<script lang="ts">
import { QTableProps, useQuasar } from 'quasar'
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { download, saveJson } from 'src/components/file/download'
import { validateNumber } from 'src/components/editor/numberInput'
import { useRouter } from 'vue-router'
import LoadMonsterArchiveDialog from 'src/components/monsterarchive/LoadMonsterArchiveDialog.vue'
import NewMonsterArchiveDialog from 'src/components/monsterarchive/NewMonsterArchiveDialog.vue'
import { useFileLoader } from 'src/components/file/useFileLoader'
import { validate } from 'jsonschema'
import { SCHEMA } from 'src/data/SCHEMA'
import { db } from "src/db/database";
import MonsterArchive from 'src/db/MonsterArchive'

export default defineComponent({
  name: 'MonsterArchive',
  setup() {
    const { t } = useI18n()
    const $q = useQuasar()
    const selected = ref([])
    const router = useRouter()
    let monsters = ref([])
    const refresh = ref(0)
    const { updateMonster } = useFileLoader()
    const monsterArchive = db.getMonsterArchive()

    monsterArchive.on((changes, partial) => {
      console.log(changes)
      db.monsterArchive.toArray().then((data) => monsters.value = data);
    })

    // Define the columns.
    const columns: QTableProps['columns'] = [
      {
        name: 'name',
        field: 'name',
        required: true,
        label: t('editor.monsterarchive.name'),
        align: 'left',
        sortable: true,
      },
      {
        name: 'created_at',
        field: 'created_at',
        required: true,
        label: t('editor.monsterarchive.created_at'),
        align: 'left',
        sortable: true,
      },
      {
        name: 'updated_at',
        field: 'updated_at',
        required: true,
        label: t('editor.monsterarchive.updated_at'),
        align: 'left',
        sortable: true,
      },
      {
        name: 'actions',
        field: 'actions',
        required: true,
        label: t('editor.monsterarchive.actions'),
        align: 'left',
        sortable: true,
      },
    ]

    /**
     * Load a monster from the archive into the builder and redirect to builder.
     * 
     * @param monster
     *   The monster to load.
     */
    const loadMonster = (entry: MonsterArchive) => {
      if (monsterArchive.isChanged()) {
        $q.dialog({
          title: 'Confirm',
          message: t('editor.monsterarchive.overwrite_save_current'),
          cancel: t('editor.monsterarchive.overwrite_current_no'),
          ok: t('editor.monsterarchive.overwrite_current_yes'),
        }).onOk(() => {
          saveMonster()
          doLoadMonster(entry)
        }).onCancel(() => {
          doLoadMonster(entry)
        })
      } else {
        doLoadMonster(entry)
      }
    }

    /**
     * Load a monster from the archive into the builder and redirect to builder.
     * 
     * @param monster
     *   The monster to load.
     */
    const doLoadMonster = (entry: MonsterArchive) => {
      try {
        // Update archived monster, might be an older version
        updateMonster(entry.monster);
        const valid = validate(entry.monster, SCHEMA[entry.monster.saveVersion]);
        if (valid.valid) {
          // Save updated version back in archive
          const result = monsterArchive.activateMonster(entry.uuid).then((result) => {

            $q.notify({
              message: t('editor.monsterarchive.loaded'),
              type: 'positive',
            })
            router.push({ path: '/' })
          }).catch((reason) => {
            console.log(reason)
          })
        } else {
          $q.notify({
            message: t('editor.monsterarchive.loadError', [
              valid.errors.map((e) => e.stack).join(', '),
            ]),
            type: 'negative',
          })
          console.error(valid.errors)
        }
      } catch (e) {
        $q.notify({
          message: t('editor.monsterarchive.loaderror', [e]),
          type: 'negative',
        })
        console.error(e)
      }
    }

    /**
     * Delete a monster from the archive (asking for confirmation).
     * 
     * @param monster
     *   The monster to delete.
     */
    const deleteMonster = (entry: MonsterArchive) => {
      $q.dialog({
        title: 'Confirm',
        message: t('editor.monsterarchive.delete_confirmation', { name: entry.name }),
        cancel: true
      }).onOk(() => {
        monsterArchive.deleteMonster(entry)
      })
    }

    /**
     * Delete selected monsters from the archive (asking for confirmation).
     */
    const deleteMonsters = () => {
      let n = selected.value.length;
      if (n < 2 && selected.value.at(0) != undefined) {
        n = selected.value.at(0).name
      }
      $q.dialog({
        title: 'Confirm',
        message: t('editor.monsterarchive.delete_confirmation', { n: n }),
        cancel: {
          push: true
        }
      }).onOk(() => {
        selected.value.forEach(
          (e: MonsterArchive) => monsterArchive.deleteMonster(e)
        )
        selected.value = []
      })
    }

    /**
     * Download a monster as json (as with download button).
     * 
     * @param entry
     *   The monster entry to download.
     */
    const downloadSingle = (entry: MonsterArchive) => {
      saveJson(entry.monster, `${entry.name}.5emm.json`)
    }

    /**
     * Download all or selected monster as a list in json format.
     */
    const downloadMonsters = () => {
      let list: string[] = [];
      let promise: Promise<(MonsterArchive | undefined)[]>
      if (selected.value.length > 0) {
        selected.value.forEach(
          (e: MonsterArchive) => list.push(e.uuid)
        )
        promise = monsterArchive.getMonsters(list)
      } else {
        promise = monsterArchive.getAllMonsters()
      }
      promise.then((result) => {
        if (result != undefined) {
          result.forEach((e) => {
            delete (e as { current?: string }).current;
          })
          download(
            JSON.stringify(result),
            'monster-archive.5emms.json',
            'application/json'
          )
        }
      })

    }

    /**
     * Save the current monster.
     */
    const saveMonster = () => {
      if (!monsterArchive.hasCurrentMonster()) {
        $q.dialog({
          component: NewMonsterArchiveDialog,
          componentProps: {
            rename: false
          }
        })
      } else {
        monsterArchive.saveCurrentMonster().then((result) => {
          $q.notify({
            message: t(result.message),
            type: 'positive'
          });
        }).catch((reason) => {
          $q.notify({
            message: reason,
            type: 'negative'
          });
        })
      }
    }


    /**
     * Open import dialog.
     */
    const importMonsters = () => {
      $q.dialog({
        component: LoadMonsterArchiveDialog,
      })
    }

    return {
      monsters,
      columns,
      selected,
      saveMonster,
      loadMonster,
      deleteMonster,
      deleteMonsters,
      downloadSingle,
      downloadMonsters,
      importMonsters,
      validateNumber,
    }
  },
  async mounted() {
    this.monsters = await db.monsterArchive.toArray()
  },
})
</script>