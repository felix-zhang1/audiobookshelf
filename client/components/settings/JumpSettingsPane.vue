
<template>
  <div class="space-y-4">
    <h3 class="text-xl font-semibold">{{ $strings?.HeaderJumpSettings || 'Jump Settings' }}</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ui-select-input v-model="jumpForwardAmount" :label="$strings.ButtonJumpForward" :items="jumpValues" @input="setJumpForwardAmount" />
      <ui-select-input v-model="jumpBackwardAmount" :label="$strings.ButtonJumpBackward" :items="jumpValues" @input="setJumpBackwardAmount" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'JumpSettingsPane',
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

      // 先给组件一个值显示在下拉框,然后再用Mounted函数的值来覆盖
      jumpForwardAmount: 10,
      jumpBackwardAmount: 10
    }
  },
  methods: {
    setJumpForwardAmount(val) {
      this.jumpForwardAmount = Number(val)
      this.$store.dispatch('user/updateUserSettings', { jumpForwardAmount: this.jumpForwardAmount })
    },
    setJumpBackwardAmount(val) {
      this.jumpBackwardAmount = Number(val)
      this.$store.dispatch('user/updateUserSettings', { jumpBackwardAmount: this.jumpBackwardAmount })
    }
  },
  mounted() {
    // 当挂载组件时,从Vuex中读取用户设置的数值并覆盖data函数提供的默认值
    const g = this.$store.getters['user/getUserSetting']
    this.jumpForwardAmount = g('jumpForwardAmount') ?? 10
    this.jumpBackwardAmount = g('jumpBackwardAmount') ?? 10
  }
}
</script>
