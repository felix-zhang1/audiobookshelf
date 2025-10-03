<template>
  <modals-modal v-model="show" name="player-settings" :width="820" :height="'unset'">
    <!-- 通过v-show来实现当用户点击左侧sidebar中的rewind,jump,speed时,对应显式出rewind,jump,speed组件 -->
    <PlayerSettingsShell :active="activeTab" @update:active="activeTab = $event">
      <RewindSettingsPane v-show="activeTab === 'rewind'" />
      <JumpSettingsPane v-show="activeTab === 'jump'" />
      <SpeedSettingsPane v-show="activeTab === 'speed'" />
    </PlayerSettingsShell>
  </modals-modal>
</template>

<script>
import PlayerSettingsShell from '@/components/settings/PlayerSettingsShell.vue'
import RewindSettingsPane from '@/components/settings/RewindSettingsPane.vue'
import JumpSettingsPane from '@/components/settings/JumpSettingsPane.vue'
import SpeedSettingsPane from '@/components/settings/SpeedSettingsPane.vue'

export default {
  name: 'PlayerSettingsModal',
  props: { value: Boolean },
  components: { PlayerSettingsShell, RewindSettingsPane, JumpSettingsPane, SpeedSettingsPane },
  data() {
    return { activeTab: 'rewind' }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    }
  }
}
</script>
