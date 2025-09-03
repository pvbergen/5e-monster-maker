<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin import-monster-archive-dialog">
      <q-card-section>
        <div class="text-h6">
          {{ $t('editor.monsterarchive.importDialog') }}
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row">
        <q-file v-model="file" class="q-pa-md col-12" :label="$t('editor.monsterarchive.importFile')"
          accept=".5emms.json" />
        <div class="col-12 flex items-center">
          <q-toggle v-model="overwrite" :label="$t('editor.monsterarchive.importMode')" />
        </div>
      </q-card-section>
      <!-- buttons example -->
      <q-card-actions align="right">
        <q-btn color="green" :label="$t('editor.monsterarchive.import')" :disabled="file == null" @click="onOKClick" />
        <q-btn color="primary" :label="$t('editor.cancel')" @click="onCancelClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { validate } from 'jsonschema'
import { SCHEMA } from 'src/data/SCHEMA'
import { useI18n } from 'vue-i18n'
import { useFileLoader } from 'src/components/file/useFileLoader'
import { db } from 'src/db/database';
import MonsterArchive from 'src/db/MonsterArchive'

export default defineComponent({
  name: 'LoadMonsterArchiveDialog',
  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup() {
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent()
    // dialogRef      - Vue ref to be applied to QDialog
    // onDialogHide   - Function to be used as handler for @hide on QDialog
    // onDialogOK     - Function to call to settle dialog with "ok" outcome
    //                    example: onDialogOK() - no payload
    //                    example: onDialogOK({ /*.../* }) - with payload
    // onDialogCancel - Function to call to settle dialog with "cancel" outcome

    const $q = useQuasar()
    const { t } = useI18n()
    const monsterArchive = db.getMonsterArchive()
    const { updateMonster } = useFileLoader()

    // load fields
    const file = ref<File>()
    const overwrite = ref(false)

    /**
     * Process the uploaded archive.
     */
    const importMonsterArchive = () => {
      if (file.value != null) {
        const reader = new FileReader()
        reader.addEventListener('load', (e: ProgressEvent<FileReader>) => {
          try {
            let monsters: MonsterArchive[] = JSON.parse(e.target?.result as string)
            if (overwrite.value && monsters.find((e) => e.uuid == monsterArchive.getCurrentMonster().uuid) != undefined) {
              // If we overwrite or current monster is in import, ask user for confirmation.
              $q.dialog({
                title: 'Confirm',
                message: `The import list contains the active monster.Do you want to overwrite the active monster?`,
                color: 'negative',
                ok: `Yes, I'm sure`,
                cancel: true,
              }).onOk(() => {
                runImport(monsters, overwrite.value)
              })
            } else {
              // If we don't overwrite or current monster is not in import, go ahead.
              runImport(monsters, overwrite.value)
            }
          } catch (e) {
            $q.notify({
              message: t('editor.monsterarchive.importError', [e]),
              type: 'negative',
            })
            console.error(e)
          }
        })

        reader.addEventListener('error', (e) => {
          $q.notify({
            message: t('editor.monsterarchive.importError', [e]),
            type: 'negative',
          })
          console.error(e)
        })

        reader.readAsText(file.value)
      }
    }

    /**
     * Import a list of monsters.
     * 
     * @param monsters 
     *   The list of monsters.
     * @param overwrite 
     *   Whether to overwrite entries with the same uuid.
     */
    const runImport = (monsters: MonsterArchive[], overwrite = false) => {
      let imported = 0;
      let skipped = 0;
      let invalid = 0;
      let promises: Promise<string>[] = []
      monsters.forEach((entry: MonsterArchive) => {
        // Update and validate the entry.
        updateMonster(entry.monster)
        const valid = validate(entry.monster, SCHEMA[entry.monster.saveVersion])
        if (valid.valid) {
          // Import the entry.
          const promise = monsterArchive.importEntry(entry, overwrite)
          promise.then((result) => {
            if (result) {
              imported++
            } else if (!overwrite) {
              skipped++
            }
          })
          promise.catch((reason) => {
            $q.notify({
              message: t(reason),
              type: 'negative'
            })
            invalid++
          })
          promises.push(promise)
        } else {
          invalid++
        }
      })

      // Wait for all promises to resolve, then inform user.
      Promise.all(promises).then(() => {
        $q.notify({
          message: t(
            'editor.monsterarchive.importResult',
            { n: imported },
            imported
          ),
          type: 'positive',
        })

        if (skipped > 0) {
          $q.notify({
            message: t(
              'editor.monsterarchive.importSkip',
              { n: skipped },
              skipped
            ),
            type: 'warning',
          })
        }
        if (invalid > 0) {
          $q.notify({
            message: t(
              'editor.monsterarchive.importInvalid',
              { n: invalid },
              invalid
            ),
            type: 'warning',
          })
        }

      })
    }

    return {
      dialogRef,
      onDialogHide,

      onOKClick() {
        // Run upload and import.
        importMonsterArchive()
        // Propagate OK click.
        onDialogOK()
      },

      onCancelClick: onDialogCancel,
      // fields
      file,
      overwrite,
    }
  },
})
</script>

<style lang="scss">
.import-monster-archive-dialog {
  width: 600px;
}
</style>
