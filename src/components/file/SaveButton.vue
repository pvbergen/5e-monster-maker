<template>
  <q-btn round flat icon="save" @click="saveMonster()" title="{{ $t('editor.monsterarchive.save') }}">
  </q-btn>
  <q-btn round flat icon="save_as" @click="saveNewMonster()" title="{{ $t('editor.monsterarchive.save_new') }}">
  </q-btn>
</template>

<script lang="ts">
import { useQuasar } from 'quasar'
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { db } from 'src/db/database';
import NewMonsterArchiveDialog from '../monsterarchive/NewMonsterArchiveDialog.vue';
import { useMonsterStore } from 'src/stores/monster-store';

export default defineComponent({
  name: 'SaveButton',
  setup() {
    const $q = useQuasar()
    const { t } = useI18n()
    const monster = useMonsterStore()

    const saveMonster = () => {
      const monsterArchive = db.getMonsterArchive()
      if (!monsterArchive.hasCurrentMonster()) {
        saveNewMonster(false)
      } else {
        monsterArchive.saveCurrentMonster().then((result) => {
          $q.notify({
            message: t('editor.monsterarchive.overwrite_saved'),
            type: 'positive'
          });
        }).catch((reason) => {
          $q.notify({
            message: t(reason),
            type: 'negative'
          });
        })
      }
    }

    const saveNewMonster = (rename = true) => {
      $q.dialog({
        component: NewMonsterArchiveDialog,
        componentProps: {
          rename: rename
        }
      })
    }

    const resetMonster = () => {
      monster.$reset()
      db.getMonsterArchive().reset()
      $q.notify({
        message: t('editor.monsterReset'),
        type: 'positive',
      })
    }

    return {
      saveMonster,
      saveNewMonster,
      resetMonster
    }

  }
})
</script>