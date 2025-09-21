<template>
  <modals-modal v-model="show" name="player-settings" :width="500" :height="'unset'">
    <div ref="container" class="w-full rounded-lg bg-bg box-shadow-md overflow-y-auto overflow-x-hidden p-4" style="max-height: 80vh; min-height: 40vh">
      <h3 class="text-xl font-semibold mb-8">{{ $strings.HeaderPlayerSettings }}</h3>
      <!-- <div class="flex items-center mb-4">
        <ui-toggle-switch v-model="useChapterTrack" @input="setUseChapterTrack" />
        <div class="pl-4">
          <span>{{ $strings.LabelUseChapterTrack }}</span>
        </div>
      </div> -->
      <div class="flex items-center mb-4">
        <ui-select-input v-model="jumpForwardAmount" :label="$strings.LabelJumpForwardAmount" menuMaxHeight="250px" :items="jumpValues" @input="setJumpForwardAmount" />
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input v-model="jumpBackwardAmount" :label="$strings.LabelJumpBackwardAmount" menuMaxHeight="250px" :items="jumpValues" @input="setJumpBackwardAmount" />
      </div>

      <!-- 新增：自动 rewind 开关 -->
      <div class="flex items-center mb-2">
        <ui-toggle-switch v-model="autoRewindEnabled" @input="setAutoRewindEnabled" />
        <div class="pl-4">
          <span>{{ $strings.LabelEnableAutoRewind || 'Enable automatic rewind' }}</span>
        </div>
      </div>

      <!-- 新增：自动 rewind 时间（与 jumpValues 一致），可被上面的开关禁用 -->
      <div class="flex items-center mb-4">
        <ui-select-input v-model="autoRewindSeconds" :label="$strings.LabelAutoRewindSeconds || 'Automatic rewind time'" menuMaxHeight="250px" :items="jumpValues" :disabled="!autoRewindEnabled || rewindMode === 'smart'" @input="setAutoRewindSeconds" />
      </div>

      <!-- 新增：回退模式（固定 / 智能） -->
      <div class="flex items-center mb-2">
        <ui-select-input v-model="rewindMode" :label="$strings.LabelRewindMode || 'Rewind mode'" :items="rewindModeItems" :disabled="!autoRewindEnabled" @input="setRewindMode" />
      </div>

      <!-- 新增：智能回退参数 -->
      <div class="grid grid-cols-2 gap-3 mb-4" v-if="autoRewindEnabled && rewindMode === 'smart'">
        <ui-number-input v-model="smartRewindStepSeconds" :label="$strings.LabelSmartRewindStep || 'Smart rewind step (sec)'" :min="1" :max="600" @input="setSmartRewindStepSeconds" />
        <ui-number-input v-model="smartRewindMaxSeconds" :label="$strings.LabelSmartRewindMax || 'Smart rewind max (sec)'" :min="0" :max="3600" @input="setSmartRewindMaxSeconds" />
        <!-- <ui-number-input v-model="smartRewindPerMinutes" :label="$strings.LabelSmartRewindPerMin || 'Minutes per step'" :min="1" :max="60" @input="setSmartRewindPerMinutes" /> -->
        <ui-number-input v-model="smartRewindTriggerSeconds" :label="$strings.LabelSmartRewindPerSec || 'Pause seconds per step'" :min="1" :max="600" @input="setSmartRewindTriggerSeconds" />
      </div>
      <div class="flex items-center mb-4">
        <ui-select-input v-model="playbackRateIncrementDecrement" :label="$strings.LabelPlaybackRateIncrementDecrement" menuMaxHeight="250px" :items="playbackRateIncrementDecrementValues" @input="setPlaybackRateIncrementDecrementAmount" />
      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  props: {
    value: Boolean
  },
  data() {
    return {
      useChapterTrack: false,
      jumpValues: [
        { text: this.$getString('LabelTimeDurationXSeconds', ['10']), value: 10 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['15']), value: 15 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['30']), value: 30 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['60']), value: 60 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['2']), value: 120 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['5']), value: 300 }
      ],
      jumpForwardAmount: 10,
      jumpBackwardAmount: 10,

      // 新增本地状态：与 Vuex 双向同步
      autoRewindEnabled: true,
      autoRewindSeconds: 10,

      rewindMode: 'fixed',
      rewindModeItems: [
        { text: this.$getString('LabelRewindModeFixed', []) || 'Fixed', value: 'fixed' },
        { text: this.$getString('LabelRewindModeSmart', []) || 'Smart (pause-based)', value: 'smart' }
      ],
      smartRewindStepSeconds: 5,
      smartRewindMaxSeconds: 60,
      // smartRewindPerMinutes: 1,
      smartRewindTriggerSeconds: 5,

      playbackRateIncrementDecrementValues: [0.1, 0.05],
      playbackRateIncrementDecrement: 0.1
    }
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
  },
  methods: {
    setUseChapterTrack() {
      this.$store.dispatch('user/updateUserSettings', { useChapterTrack: this.useChapterTrack })
    },
    setJumpForwardAmount(val) {
      this.jumpForwardAmount = val
      this.$store.dispatch('user/updateUserSettings', { jumpForwardAmount: val })
    },
    setJumpBackwardAmount(val) {
      this.jumpBackwardAmount = val
      this.$store.dispatch('user/updateUserSettings', { jumpBackwardAmount: val })
    },
    setPlaybackRateIncrementDecrementAmount(val) {
      this.playbackRateIncrementDecrement = val
      this.$store.dispatch('user/updateUserSettings', { playbackRateIncrementDecrement: val })
    },

    // 新增
    setAutoRewindEnabled(val) {
      this.autoRewindEnabled = !!val
      this.$store.dispatch('user/updateUserSettings', { autoRewindEnabled: this.autoRewindEnabled })
    },
    setAutoRewindSeconds(val) {
      this.autoRewindSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { autoRewindSeconds: this.autoRewindSeconds })
    },

    //
    setRewindMode(val) {
      this.rewindMode = val
      this.$store.dispatch('user/updateUserSettings', { rewindMode: this.rewindMode })
    },
    setSmartRewindStepSeconds(val) {
      this.smartRewindStepSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { smartRewindStepSeconds: this.smartRewindStepSeconds })
    },
    setSmartRewindMaxSeconds(val) {
      this.smartRewindMaxSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { smartRewindMaxSeconds: this.smartRewindMaxSeconds })
    },
    // setSmartRewindPerMinutes(val) {
    //   this.smartRewindPerMinutes = Number(val)
    //   this.$store.dispatch('user/updateUserSettings', { smartRewindPerMinutes: this.smartRewindPerMinutes })
    // },
    setSmartRewindTriggerSeconds(val) {
      this.smartRewindTriggerSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { smartRewindTriggerSeconds: this.smartRewindTriggerSeconds })
    },

    settingsUpdated() {
      this.useChapterTrack = this.$store.getters['user/getUserSetting']('useChapterTrack')
      this.jumpForwardAmount = this.$store.getters['user/getUserSetting']('jumpForwardAmount')
      this.jumpBackwardAmount = this.$store.getters['user/getUserSetting']('jumpBackwardAmount')
      this.playbackRateIncrementDecrement = this.$store.getters['user/getUserSetting']('playbackRateIncrementDecrement')

      // 新增：从 Vuex 读取最新设置
      this.autoRewindEnabled = this.$store.getters['user/getUserSetting']('autoRewindEnabled')
      this.autoRewindSeconds = this.$store.getters['user/getUserSetting']('autoRewindSeconds')

      //
      this.rewindMode = this.$store.getters['user/getUserSetting']('rewindMode') || 'fixed'
      this.smartRewindStepSeconds = this.$store.getters['user/getUserSetting']('smartRewindStepSeconds') ?? 5
      this.smartRewindMaxSeconds = this.$store.getters['user/getUserSetting']('smartRewindMaxSeconds') ?? 60
      // this.smartRewindPerMinutes = this.$store.getters['user/getUserSetting']('smartRewindPerMinutes') ?? 1
      this.smartRewindTriggerSeconds = this.$store.getters['user/getUserSetting']('smartRewindTriggerSeconds') ?? 5
    }
  },
  mounted() {
    this.settingsUpdated()
    this.$eventBus.$on('user-settings', this.settingsUpdated)
  },
  beforeDestroy() {
    this.$eventBus.$off('user-settings', this.settingsUpdated)
  }
}
</script>
