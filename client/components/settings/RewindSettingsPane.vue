<template>
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">{{ $strings?.HeaderRewindSettings || 'Rewind Settings' }}</h3>

    <!-- 基础设置 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ui-select-input v-model="rewindMode" label="Rewind mode" :items="rewindModeItems" @input="setRewindMode" />
      <ui-select-input v-model="autoRewindSeconds" label="Rewind seconds" :items="jumpValues" :disabled="!autoRewindEnabled || rewindMode === 'smart'" @input="setAutoRewindSeconds" />
    </div>

    <div class="flex items-center">
      <ui-toggle-switch v-model="autoRewindEnabled" @input="setAutoRewindEnabled" />
      <div class="pl-4">
        <span>Enable automatic rewind</span>
      </div>
    </div>

    <!-- 智能回退参数 -->
    <div v-if="rewindMode === 'smart'" class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <ui-number-input v-model="smartRewindStepSeconds" label="Smart step (sec)" :min="1" :max="600" @input="setSmartRewindStepSeconds" />
      <ui-number-input v-model="smartRewindMaxSeconds" label="Smart max (sec)" :min="0" :max="3600" @input="setSmartRewindMaxSeconds" />
      <ui-number-input v-model="smartRewindTriggerSeconds" label="Pause sec per step" :min="1" :max="600" @input="setSmartRewindTriggerSeconds" />
    </div>

    <!-- 章节边界 和 跨章策略 -->
    <div class="space-y-3">
      <div class="flex items-center">
        <ui-toggle-switch v-model="clampToChapterStart" @input="setClampToChapterStart" />
        <div class="pl-4"><span>Limit to current chapter start</span></div>
      </div>

      <div v-if="!clampToChapterStart" class="space-y-3">
        <ui-select-input v-model="crossChapterRewindStrategy" label="Cross-chapter strategy" :items="crossChapterStrategyItems" @input="setCrossChapterRewindStrategy" />
        <div class="flex items-center">
          <ui-toggle-switch v-model="limitPresetToPrevTwoChapters" @input="setLimitPresetToPrevTwoChapters" />
          <div class="pl-4"><span>Restrict preset within previous two chapters</span></div>
        </div>
        <p class="text-xs text-text/70 leading-snug">When cross-chapter is enabled, target can be: Fixed, Nearest boundary, Previous start, or Next start.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RewindSettingsPane',
  data() {
    return {
      jumpValues: [
        { text: this.$getString('LabelTimeDurationXSeconds', ['10']), value: 10 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['15']), value: 15 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['30']), value: 30 },
        { text: this.$getString('LabelTimeDurationXSeconds', ['60']), value: 60 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['2']), value: 120 },
        { text: this.$getString('LabelTimeDurationXMinutes', ['5']), value: 300 }
      ],
      rewindModeItems: [
        { text: 'Fixed', value: 'fixed' },
        { text: 'Smart (pause-based)', value: 'smart' }
      ],

      autoRewindEnabled: true,
      autoRewindSeconds: 10,
      rewindMode: 'fixed',
      smartRewindStepSeconds: 5,
      smartRewindMaxSeconds: 60,
      smartRewindTriggerSeconds: 5,
      clampToChapterStart: true,
      crossChapterRewindStrategy: 'fixed',
      limitPresetToPrevTwoChapters: true,

      crossChapterStrategyItems: [
        { text: 'Fixed (use preset point)', value: 'fixed' },
        { text: 'Nearest boundary (prev/current start)', value: 'nearest-boundary' },
        { text: 'Previous chapter start', value: 'prev-start' },
        { text: 'Next chapter start', value: 'next-start' }
      ]
    }
  },
  methods: {
    setAutoRewindEnabled(val) {
      this.autoRewindEnabled = !!val
      this.$store.dispatch('user/updateUserSettings', { autoRewindEnabled: this.autoRewindEnabled })
    },
    setAutoRewindSeconds(val) {
      this.autoRewindSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { autoRewindSeconds: this.autoRewindSeconds })
    },
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
    setSmartRewindTriggerSeconds(val) {
      this.smartRewindTriggerSeconds = Number(val)
      this.$store.dispatch('user/updateUserSettings', { smartRewindTriggerSeconds: this.smartRewindTriggerSeconds })
    },
    setClampToChapterStart(val) {
      this.clampToChapterStart = !!val
      this.$store.dispatch('user/updateUserSettings', { clampToChapterStart: this.clampToChapterStart })
    },
    setCrossChapterRewindStrategy(val) {
      this.crossChapterRewindStrategy = val
      this.$store.dispatch('user/updateUserSettings', { crossChapterRewindStrategy: this.crossChapterRewindStrategy })
    },
    setLimitPresetToPrevTwoChapters(val) {
      this.limitPresetToPrevTwoChapters = !!val
      this.$store.dispatch('user/updateUserSettings', { limitPresetToPrevTwoChapters: this.limitPresetToPrevTwoChapters })
    }
  },
  mounted() {
    // 挂在组件时,读取Vuex中的用户设置
    const g = this.$store.getters['user/getUserSetting']
    this.autoRewindEnabled = g('autoRewindEnabled') ?? true
    this.autoRewindSeconds = g('autoRewindSeconds') ?? 10
    this.rewindMode = g('rewindMode') || 'fixed'
    this.smartRewindStepSeconds = g('smartRewindStepSeconds') ?? 5
    this.smartRewindMaxSeconds = g('smartRewindMaxSeconds') ?? 60
    this.smartRewindTriggerSeconds = g('smartRewindTriggerSeconds') ?? 5
    this.clampToChapterStart = g('clampToChapterStart') ?? true
    this.crossChapterRewindStrategy = g('crossChapterRewindStrategy') || 'fixed'
    this.limitPresetToPrevTwoChapters = g('limitPresetToPrevTwoChapters') ?? true
  }
}
</script>
