<template>
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">Speed Settings</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- 默认播放速度 -->
      <ui-select-input v-model="playbackRate" label="Default playback rate" :items="rateItems" @input="setPlaybackRate" />

      <!-- 速度步长（+/-） -->
      <ui-select-input v-model="playbackRateIncrementDecrement" label="Speed step (+/-)" :items="stepItems" @input="setPlaybackRateIncrementDecrementAmount" />
    </div>

    <p class="text-xs text-text/70 leading-snug">The default rate applies when starting playback; the step controls how much each +/- action changes the rate.</p>
  </div>
</template>

<script>
export default {
  name: 'SpeedSettingsPane',
  data() {
    return {
      rateItems: [
        { text: '0.75×', value: 0.75 },
        { text: '1.0×', value: 1.0 },
        { text: '1.25×', value: 1.25 },
        { text: '1.5×', value: 1.5 },
        { text: '2.0×', value: 2.0 }
      ],
      stepItems: [
        { text: '0.05', value: 0.05 },
        { text: '0.10', value: 0.1 }
      ],
      playbackRate: 1.0,
      playbackRateIncrementDecrement: 0.1
    }
  },
  methods: {
    setPlaybackRate(val) {
      this.playbackRate = Number(val)
      this.$store.dispatch('user/updateUserSettings', { playbackRate: this.playbackRate })
    },
    setPlaybackRateIncrementDecrementAmount(val) {
      this.playbackRateIncrementDecrement = Number(val)
      this.$store.dispatch('user/updateUserSettings', { playbackRateIncrementDecrement: this.playbackRateIncrementDecrement })
    }
  },
  mounted() {
    // 初始化时从 Vuex 拉取一次
    const g = this.$store.getters['user/getUserSetting']
    this.playbackRate = g('playbackRate') ?? 1.0
    this.playbackRateIncrementDecrement = g('playbackRateIncrementDecrement') ?? 0.1
  }
}
</script>
