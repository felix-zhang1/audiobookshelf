<template>
  <div class="w-full rounded-lg bg-bg box-shadow-md overflow-hidden" style="max-height: 80vh; min-height: 40vh">
    <!-- 通过设置为flex来实现左右显式sidebar和对应的内容 -->
    <div class="flex">
      <!-- 左侧：sidebar -->
      <div class="w-56 border-r border-divider p-3">
        <ul class="space-y-1">
          <li>
            <ui-btn class="w-full text-left px-3 py-2 rounded hover:bg-bg-2" @click="$emit('update:active', 'rewind')"> Rewind </ui-btn>
          </li>
          <li>
            <ui-btn class="w-full text-left px-3 py-2 rounded hover:bg-bg-2" @click="$emit('update:active', 'jump')"> Jump </ui-btn>
          </li>
          <li>
            <ui-btn class="w-full text-left px-3 py-2 rounded hover:bg-bg-2" @click="$emit('update:active', 'speed')"> Speed </ui-btn>
          </li>
        </ul>
      </div>

      <!-- 右侧：content -->
      <div class="flex-1 p-4 overflow-y-auto">
        <!-- insert the JumpSettingsPane, RewindSettingsPane, SpeedSettingsPane here -->
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerSettingsShell',
  props: {
    active: { type: String, default: 'rewind' }
  }
}
</script>
