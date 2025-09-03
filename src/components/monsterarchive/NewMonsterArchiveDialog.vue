<template>
  <!-- notice dialogRef here -->
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin new-spell-dialog">
      <q-card-section>
        <div class="text-h6">{{ $t('editor.monsterarchive.custom.create') }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="row">
        <q-input ref="nameInput" v-model="name" :label="$t('editor.monsterarchive.custom.name')" class="col-12 q-pa-sm"
          aria-required="true" />
        <div v-if="rename" class="col-12 flex items-center">
          <q-toggle v-model="new_entry" :label="$t('editor.monsterarchive.new_save')" />
        </div>
      </q-card-section>
      <!-- buttons example -->
      <q-card-actions align="right">
        <q-btn color="green" :label="$t('editor.save')" :disabled="name.length === 0" @click="onOKClick" />
        <q-btn color="primary" :label="$t('editor.cancel')" @click="onCancelClick" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import _ from 'lodash'
import { db } from 'src/db/database';
import { useMonsterStore } from 'src/stores/monster-store';

export default defineComponent({
  name: 'NewSpellDialog',
  emits: [
    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    rename: Boolean
  },
  setup(props) {
    // REQUIRED; must be called inside of setup()
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
      useDialogPluginComponent()
    const monsterStore = useMonsterStore()
    const monsterArchive = db.getMonsterArchive()
    const entry = monsterArchive.getCurrentMonster()
    const new_entry = ref(true)
    let name = ref('')
    if (entry.name != undefined && !props.rename) {
      name.value = entry.name
    } else {
      name.value = monsterStore.name
    }

    return {
      dialogRef,
      onDialogHide,
      onOKClick() {

        monsterArchive.saveCurrentMonster(name.value, new_entry.value);
        onDialogOK()
      },

      // we can passthrough onDialogCancel directly
      onCancelClick: onDialogCancel,

      // fields
      name,
      new_entry
    }
  },
})
</script>

<style lang="scss">
.new-spell-dialog {
  width: 600px;
}
</style>
