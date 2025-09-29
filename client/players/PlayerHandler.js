import LocalAudioPlayer from './LocalAudioPlayer'
import CastPlayer from './CastPlayer'
import AudioTrack from './AudioTrack'

export default class PlayerHandler {
  constructor(ctx) {
    this.ctx = ctx
    this.libraryItem = null
    this.episodeId = null
    this.displayTitle = null
    this.displayAuthor = null
    this.playWhenReady = false
    this.initialPlaybackRate = 1
    this.player = null
    this.playerState = 'IDLE'
    this.isHlsTranscode = false
    this.currentSessionId = null
    this.startTimeOverride = undefined // Used for starting playback at a specific time (i.e. clicking bookmark from library item page)
    this.startTime = 0

    this.failedProgressSyncs = 0
    this.lastSyncTime = 0
    this.listeningTimeSinceSync = 0

    this.playInterval = null

    //
    this.pauseStartedAt = null
  }

  get isCasting() {
    return this.ctx.$store.state.globals.isCasting
  }
  get libraryItemId() {
    return this.libraryItem ? this.libraryItem.id : null
  }
  get isPlayingCastedItem() {
    return this.libraryItem && this.player instanceof CastPlayer
  }
  get isPlayingLocalItem() {
    return this.libraryItem && this.player instanceof LocalAudioPlayer
  }
  get playerPlaying() {
    return this.playerState === 'PLAYING'
  }
  get episode() {
    if (!this.episodeId) return null
    return this.libraryItem.media.episodes.find((ep) => ep.id === this.episodeId)
  }
  get jumpForwardAmount() {
    return this.ctx.$store.getters['user/getUserSetting']('jumpForwardAmount')
  }
  get jumpBackwardAmount() {
    return this.ctx.$store.getters['user/getUserSetting']('jumpBackwardAmount')
  }

  /**
   * get the auto-rewind setting.
   * - if the value is undefined, return true (default: true).
   * - otherwise, return !!v to ensure the result is always boolean.
   */
  get autoRewindEnabled() {
    const v = this.ctx.$store.getters['user/getUserSetting']('autoRewindEnabled')

    return v === undefined ? true : !!v
  }

  /**
   * get the auto-rewind seconds setting.
   * - if v is a finite number, return Number(v).
   * - otherwise return 10 (default: 10 seconds).
   */
  get autoRewindSeconds() {
    const v = this.ctx.$store.getters['user/getUserSetting']('autoRewindSeconds')
    return Number.isFinite(v) ? Number(v) : 10
  }

  // 新增：模式/智能参数（均可通过 User Settings 配置）
  get rewindMode() {
    // 'fixed' 或 'smart'
    const v = this.ctx.$store.getters['user/getUserSetting']('rewindMode')
    return v === 'smart' ? 'smart' : 'fixed'
  }
  get smartRewindStepSeconds() {
    const v = this.ctx.$store.getters['user/getUserSetting']('smartRewindStepSeconds')
    return Number.isFinite(v) ? Number(v) : 5 // 默认每满1分钟回退5秒
  }
  get smartRewindMaxSeconds() {
    const v = this.ctx.$store.getters['user/getUserSetting']('smartRewindMaxSeconds')
    return Number.isFinite(v) ? Number(v) : 60 // 默认最多回退60秒，可自行调大/关闭上限
  }
  // get smartRewindPerMinutes() {
  //   // 每满多少分钟加一次步长（通常=1）
  //   const v = this.ctx.$store.getters['user/getUserSetting']('smartRewindPerMinutes')
  //   return Number.isFinite(v) && v > 0 ? Number(v) : 1
  // }
  get smartRewindTriggerSeconds() {
    // 每停这么多秒算“一步”
    const v = this.ctx.$store.getters['user/getUserSetting']('smartRewindTriggerSeconds')
    return Number.isFinite(v) && v > 0 ? Number(v) : 5
  }

  // 新增：章节边界与策略的相关设置
  get clampToChapterStart() {
    const v = this.ctx.$store.getters['user/getUserSetting']('clampToChapterStart')

    // 如果用户没设置就取true,如果设置了就是用!!确保为对应的boolean值
    return v === undefined ? true : !!v
  }
  get crossChapterRewindStrategy() {
    const v = this.ctx.$store.getters['user/getUserSetting']('crossChapterRewindStrategy')
    return ['fixed', 'nearest-boundary', 'prev-start', 'next-start'].includes(v) ? v : 'fixed'
  }
  get limitPresetToPrevTwoChapters() {
    const v = this.ctx.$store.getters['user/getUserSetting']('limitPresetToPrevTwoChapters')
    return v === undefined ? true : !!v
  }

  computeSmartRewindSeconds() {
    if (!this.pauseStartedAt) return 0

    // const elapsedMs = Date.now() - this.pauseStartedAt
    // const minutes = Math.floor(elapsedMs / 60000)
    // if (minutes < this.smartRewindPerMinutes) return 0
    // const steps = Math.floor(minutes / this.smartRewindPerMinutes)
    // const sec = steps * this.smartRewindStepSeconds

    const elapsedMs = Date.now() - this.pauseStartedAt
    const stepMs = this.smartRewindTriggerSeconds * 1000
    // 选项 A：累计型（每满 5 秒 +5s）
    const steps = Math.floor(elapsedMs / stepMs)
    if (steps <= 0) return 0
    const sec = steps * this.smartRewindStepSeconds

    return Math.max(0, Math.min(sec, this.smartRewindMaxSeconds))
  }

  // 新增：章节工具函数
  getChapters() {
    // 章节数组元素期望至少有 { start, end }（秒）
    // 优先级：episode.chapters => libraryItem.media.chapters => ctx.currentChapters
    const ep = this.episode
    if (ep?.chapters?.length) return ep.chapters
    const mi = this.libraryItem?.media
    if (mi?.chapters?.length) return mi.chapters
    const ctxChapters = this.ctx.currentChapters || this.ctx.chapters
    if (ctxChapters?.length) return ctxChapters
    return []
  }
  findChapterIndexByTime(time) {
    const chapters = this.getChapters()
    if (!chapters.length) return -1
    return chapters.findIndex((c, i) => {
      const start = Number(c.start) || 0
      const end = Number(c.end) || (i < chapters.length - 1 ? Number(chapters[i + 1].start) || Infinity : Infinity)

      // 返回true或者false,用来判断当前时间是否位于当前章节
      return time >= start && time < end
    })
  }
  getChapterStart(i) {
    const chapters = this.getChapters()
    if (i < 0 || i >= chapters.length) return 0
    return Number(chapters[i].start) || 0
  }

  /**
   * 计算自动回退目标时间：
   * 1. 若 clampToChapterStart=true → 固定到当前章节起点
   * 2. 否则允许跨章：
   *    - 先计算预定点 (ct - rewindSec)，可限制在前两章范围
   *    - 再根据 crossChapterRewindStrategy：
   *        'fixed' → 预定点
   *        'nearest-boundary' → 距预定点最近的 {上一章起点, 当前章起点}
   *        'prev-start' → 上一章起点
   *        'next-start' → 当前章起点
   */
  computeAutoRewindTarget(ct, rewindSec) {
    //ct: current time
    const EPS = 0.01
    const chapters = this.getChapters()
    const currIdx = this.findChapterIndexByTime(ct)
    const currStart = this.ctx.currentChapter?.start ?? (currIdx >= 0 ? this.getChapterStart(currIdx) : 0)

    // 情况 A：不允许跨章 => 维持“最多到本章起点”
    if (this.clampToChapterStart) {
      const target = Math.max(currStart + EPS, ct - rewindSec)
      return Math.max(0, Math.min(target, this.getDuration()))
    }

    // 情况 B：允许跨章
    let preset = Math.max(0, ct - rewindSec) // 预定回跳时间点

    if (this.limitPresetToPrevTwoChapters && chapters.length) {
      // 计算“前两个章节区间”： [prev2.start, current.start)
      const prevIdx = currIdx > 0 ? currIdx - 1 : -1
      const prev2Idx = currIdx > 1 ? currIdx - 2 : -1
      const windowStart = prev2Idx >= 0 ? this.getChapterStart(prev2Idx) : prevIdx >= 0 ? this.getChapterStart(prevIdx) : 0
      const windowEnd = currStart
      // 把 preset clamp 到该窗口内（右开区间做个 eps 处理）
      if (windowEnd > windowStart) {
        const right = Math.max(windowStart, Math.min(preset, windowEnd - EPS))
        preset = right
      } else {
        // 若没有上一章，至少别超出 0~currStart
        preset = Math.max(0, Math.min(preset, currStart - EPS))
      }
    }

    // 依据策略给出最终目标
    const prevStart = currIdx > 0 ? this.getChapterStart(currIdx - 1) : 0
    const nextStart = currStart // 下一章起点

    let finalTarget = preset

    // 先判断是否真的跨章
    const crossed = preset < currStart - EPS

    switch (this.crossChapterRewindStrategy) {
      case 'nearest-boundary': {
        if (crossed) {
          const dPrev = Math.abs(preset - prevStart)
          const dNext = Math.abs(preset - nextStart)
          finalTarget = dPrev <= dNext ? prevStart + EPS : nextStart + EPS
        } else {
          finalTarget = preset
        }
        break
      }

      case 'prev-start':
        finalTarget = crossed ? prevStart + EPS : preset
        break

      case 'next-start':
        finalTarget = crossed ? nextStart + EPS : preset
        break

      case 'fixed':
      default:
        // 保持 preset
        break
    }

    return Math.max(0, Math.min(finalTarget, this.getDuration()))
  }

  setSessionId(sessionId) {
    this.currentSessionId = sessionId
    this.ctx.$store.commit('setPlaybackSessionId', sessionId)
  }

  load(libraryItem, episodeId, playWhenReady, playbackRate, startTimeOverride = undefined) {
    this.libraryItem = libraryItem

    this.episodeId = episodeId
    this.playWhenReady = playWhenReady
    this.initialPlaybackRate = playbackRate

    this.startTimeOverride = startTimeOverride == null || isNaN(startTimeOverride) ? undefined : Number(startTimeOverride)

    if (!this.player) this.switchPlayer(playWhenReady)
    else this.prepare()
  }

  switchPlayer(playWhenReady) {
    if (this.isCasting && !(this.player instanceof CastPlayer)) {
      console.log('[PlayerHandler] Switching to cast player')

      this.stopPlayInterval()
      this.playerStateChange('LOADING')

      this.startTime = this.player ? this.player.getCurrentTime() : this.startTime
      if (this.player) {
        this.player.destroy()
      }
      this.player = new CastPlayer(this.ctx)
      this.setPlayerListeners()

      if (this.libraryItem) {
        // libraryItem was already loaded - prepare for cast
        this.playWhenReady = playWhenReady
        this.prepare()
      }
    } else if (!this.isCasting && !(this.player instanceof LocalAudioPlayer)) {
      console.log('[PlayerHandler] Switching to local player')

      this.stopPlayInterval()
      this.playerStateChange('LOADING')

      if (this.player) {
        this.player.destroy()
      }

      this.player = new LocalAudioPlayer(this.ctx)

      this.setPlayerListeners()

      if (this.libraryItem) {
        // libraryItem was already loaded - prepare for local play
        this.playWhenReady = playWhenReady
        this.prepare()
      }
    }
  }

  setPlayerListeners() {
    this.player.on('stateChange', this.playerStateChange.bind(this))
    this.player.on('timeupdate', this.playerTimeupdate.bind(this))
    this.player.on('buffertimeUpdate', this.playerBufferTimeUpdate.bind(this))
    this.player.on('error', this.playerError.bind(this))
    this.player.on('finished', this.playerFinished.bind(this))
  }

  playerError() {
    // Switch to HLS stream on error
    if (!this.isCasting && this.player instanceof LocalAudioPlayer) {
      console.log(`[PlayerHandler] Audio player error switching to HLS stream`)
      this.prepare(true)
    }
  }

  playerFinished() {
    this.stopPlayInterval()

    var currentTime = this.player.getCurrentTime()
    this.ctx.setCurrentTime(currentTime)

    // TODO: Add listening time between last sync and now?
    this.sendProgressSync(currentTime)

    this.ctx.mediaFinished(this.libraryItemId, this.episodeId)
  }

  playerStateChange(state) {
    console.log('[PlayerHandler] Player state change', state)
    this.playerState = state

    if (this.playerState === 'PLAYING') {
      this.setPlaybackRate(this.initialPlaybackRate)
      this.startPlayInterval()
    } else {
      this.stopPlayInterval()
    }

    if (this.player) {
      if (this.playerState === 'LOADED' || this.playerState === 'PLAYING') {
        this.ctx.setDuration(this.getDuration())
      }
      if (this.playerState !== 'LOADING') {
        this.ctx.setCurrentTime(this.player.getCurrentTime())
      }
    }

    this.ctx.setPlaying(this.playerState === 'PLAYING')
    this.ctx.playerLoading = this.playerState === 'LOADING'
  }

  playerTimeupdate(time) {
    this.ctx.setCurrentTime(time)
  }

  playerBufferTimeUpdate(buffertime) {
    this.ctx.setBufferTime(buffertime)
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('absDeviceId')
    if (!deviceId) {
      deviceId = this.ctx.$randomId()
      localStorage.setItem('absDeviceId', deviceId)
    }
    return deviceId
  }

  async prepare(forceTranscode = false) {
    this.setSessionId(null) // Reset session

    const payload = {
      deviceInfo: {
        clientName: 'Abs Web',
        deviceId: this.getDeviceId()
      },
      supportedMimeTypes: this.player.playableMimeTypes,
      mediaPlayer: this.isCasting ? 'chromecast' : 'html5',
      forceTranscode,
      forceDirectPlay: this.isCasting // TODO: add transcode support for chromecast
    }

    const path = this.episodeId ? `/api/items/${this.libraryItem.id}/play/${this.episodeId}` : `/api/items/${this.libraryItem.id}/play`
    const session = await this.ctx.$axios.$post(path, payload).catch((error) => {
      console.error('Failed to start stream', error)
    })
    this.prepareSession(session)
  }

  prepareOpenSession(session, playbackRate) {
    // Session opened on init socket
    if (!this.player) this.switchPlayer() // Must set player first for open sessions

    this.libraryItem = session.libraryItem
    this.playWhenReady = false
    this.initialPlaybackRate = playbackRate
    this.startTimeOverride = undefined
    this.lastSyncTime = 0
    this.listeningTimeSinceSync = 0

    this.prepareSession(session)
  }

  prepareSession(session) {
    this.failedProgressSyncs = 0
    this.startTime = this.startTimeOverride !== undefined ? this.startTimeOverride : session.currentTime
    this.setSessionId(session.id)
    this.displayTitle = session.displayTitle
    this.displayAuthor = session.displayAuthor

    console.log('[PlayerHandler] Preparing Session', session)

    var audioTracks = session.audioTracks.map((at) => new AudioTrack(at, session.id, this.ctx.$config.routerBasePath))

    this.ctx.playerLoading = true
    this.isHlsTranscode = true
    if (session.playMethod === this.ctx.$constants.PlayMethod.DIRECTPLAY) {
      this.isHlsTranscode = false
    }

    this.player.set(this.libraryItem, audioTracks, this.isHlsTranscode, this.startTime, this.playWhenReady)

    // browser media session api
    this.ctx.setMediaSession()
  }

  closePlayer() {
    console.log('[PlayerHandler] Close Player')
    this.sendCloseSession()
    this.resetPlayer()
  }

  resetPlayer() {
    if (this.player) {
      this.player.destroy()
    }
    this.player = null
    this.playerState = 'IDLE'
    this.libraryItem = null
    this.setSessionId(null)
    this.startTime = 0
    this.stopPlayInterval()
  }

  resetStream(startTime, streamId) {
    if (this.isHlsTranscode && this.currentSessionId === streamId) {
      this.player.resetStream(startTime)
    } else {
      console.warn('resetStream mismatch streamId', this.currentSessionId, streamId)
    }
  }

  /**
   * First sync happens after 20 seconds
   * subsequent syncs happen every 10 seconds
   */
  startPlayInterval() {
    clearInterval(this.playInterval)
    let lastTick = Date.now()
    this.playInterval = setInterval(() => {
      // Update UI
      if (!this.player) return
      const currentTime = this.player.getCurrentTime()
      this.ctx.setCurrentTime(currentTime)

      const exactTimeElapsed = (Date.now() - lastTick) / 1000
      lastTick = Date.now()
      this.listeningTimeSinceSync += exactTimeElapsed
      const TimeToWaitBeforeSync = this.lastSyncTime > 0 ? 10 : 20
      if (this.listeningTimeSinceSync >= TimeToWaitBeforeSync) {
        this.sendProgressSync(currentTime)
      }
    }, 1000)
  }

  sendCloseSession() {
    let syncData = null
    if (this.player) {
      const listeningTimeToAdd = Math.max(0, Math.floor(this.listeningTimeSinceSync))
      // When opening player and quickly closing dont save progress
      if (listeningTimeToAdd > 20) {
        syncData = {
          timeListened: listeningTimeToAdd,
          currentTime: this.getCurrentTime()
        }
      }
    }
    this.listeningTimeSinceSync = 0
    this.lastSyncTime = 0
    return this.ctx.$axios.$post(`/api/session/${this.currentSessionId}/close`, syncData, { timeout: 6000, progress: false }).catch((error) => {
      console.error('Failed to close session', error)
    })
  }

  sendProgressSync(currentTime) {
    const diffSinceLastSync = Math.abs(this.lastSyncTime - currentTime)
    if (diffSinceLastSync < 1) return

    this.lastSyncTime = currentTime
    const listeningTimeToAdd = Math.max(0, Math.floor(this.listeningTimeSinceSync))
    const syncData = {
      timeListened: listeningTimeToAdd,
      currentTime
    }

    this.listeningTimeSinceSync = 0
    this.ctx.$axios
      .$post(`/api/session/${this.currentSessionId}/sync`, syncData, { timeout: 9000, progress: false })
      .then(() => {
        this.failedProgressSyncs = 0
      })
      .catch((error) => {
        console.error('Failed to update session progress', error)
        // After 4 failed sync attempts show an alert toast
        this.failedProgressSyncs++
        if (this.failedProgressSyncs >= 4) {
          this.ctx.showFailedProgressSyncs()
          this.failedProgressSyncs = 0
        }
      })
  }

  stopPlayInterval() {
    clearInterval(this.playInterval)
    this.playInterval = null
  }

  // playPause() {
  //   if (this.player) this.player.playPause()
  // }

  /**
   * toggle play/pause.
   * - if not playing: auto-rewind, then start playback.
   * - if already playing: pause playback.
   */
  playPause() {
    if (!this.player) return

    if (!this.playerPlaying) {
      if (this.autoRewindEnabled) {
        // const ct = this.getCurrentTime() || 0
        // const chapterStart = this.ctx.currentChapter?.start ?? 0
        // let rewindSec = 0
        // if (this.rewindMode === 'smart') {
        //   rewindSec = this.computeSmartRewindSeconds()
        // } else {
        //   rewindSec = Math.max(0, this.autoRewindSeconds)
        // }
        // if (rewindSec > 0) {
        //   const EPS = 0.01
        //   const target = Math.max(chapterStart + EPS, ct - rewindSec)
        //   if (target < ct) this.seek(target)
        // }

        const ct = this.getCurrentTime() || 0
        const rewindSec = this.rewindMode === 'smart' ? this.computeSmartRewindSeconds() : Math.max(0, this.autoRewindSeconds)
        if (rewindSec > 0) {
          const target = this.computeAutoRewindTarget(ct, rewindSec)
          if (target < ct) this.seek(target)
        }

        // 播放前清空暂停起点，避免重复累计
        this.pauseStartedAt = null
      }

      this.player.play()
      return
    }

    // this.player.pause()

    // 用封装方法，顺便记录 pauseStartedAt
    this.pause()
  }

  // play() {
  //   if (this.player) this.player.play()
  // }

  /**
   * - if not playing: auto-rewind, then start playback.
   * - if already playing: call play() again (no toggle to pause).
   */
  play() {
    if (!this.player) return
    if (!this.playerPlaying) {
      if (this.autoRewindEnabled) {
        // const ct = this.getCurrentTime() || 0
        // const chapterStart = this.ctx.currentChapter?.start ?? 0
        // let rewindSec = 0
        // if (this.rewindMode === 'smart') {
        //   rewindSec = this.computeSmartRewindSeconds()
        // } else {
        //   rewindSec = Math.max(0, this.autoRewindSeconds)
        // }
        // if (rewindSec > 0) {
        //   const EPS = 0.01
        //   const target = Math.max(chapterStart + EPS, ct - rewindSec)
        //   if (target < ct) this.seek(target)
        // }

        const ct = this.getCurrentTime() || 0
        const rewindSec = this.rewindMode === 'smart' ? this.computeSmartRewindSeconds() : Math.max(0, this.autoRewindSeconds)
        if (rewindSec > 0) {
          const target = this.computeAutoRewindTarget(ct, rewindSec)
          if (target < ct) this.seek(target)
        }

        this.pauseStartedAt = null
      }
    }
    this.player.play()
  }

  pause() {
    if (this.player) {
      this.player.pause()
      // 记录暂停起点（仅在真正暂停时）
      this.pauseStartedAt = Date.now()
    }
  }

  getCurrentTime() {
    return this.player ? this.player.getCurrentTime() : 0
  }

  getDuration() {
    return this.player ? this.player.getDuration() : 0
  }

  jumpBackward() {
    if (!this.player) return
    var currentTime = this.getCurrentTime()
    const jumpAmount = this.jumpBackwardAmount
    this.seek(Math.max(0, currentTime - jumpAmount))
  }

  jumpForward() {
    if (!this.player) return
    var currentTime = this.getCurrentTime()
    const jumpAmount = this.jumpForwardAmount
    this.seek(Math.min(currentTime + jumpAmount, this.getDuration()))
  }

  setVolume(volume) {
    if (!this.player) return
    this.player.setVolume(volume)
  }

  setPlaybackRate(playbackRate) {
    this.initialPlaybackRate = playbackRate // Might be loaded from settings before player is started
    if (!this.player) return
    this.player.setPlaybackRate(playbackRate)
  }

  seek(time, shouldSync = true) {
    if (!this.player) return
    this.player.seek(time, this.playerPlaying)
    this.ctx.setCurrentTime(time)

    // Update progress if paused
    if (!this.playerPlaying && shouldSync) {
      this.sendProgressSync(time)
    }
  }
}
