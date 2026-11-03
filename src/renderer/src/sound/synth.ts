// Synthesized sounds for Revenant IM.
// All sounds are generated with Web Audio — NO audio files or third-party assets.
// Theme: haunted 2000s IM client (creaking doors, ghostly tones).

type SoundKind = 'signOn' | 'signOff' | 'message' | 'buddyOn' | 'buddyOff'

let audioContext: AudioContext | null = null
let muted = false

/** Get or create the shared AudioContext. */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/** Set mute state. When true, play() does nothing. */
export function setMuted(value: boolean): void {
  muted = value
}

/** Get current mute state. */
export function isMuted(): boolean {
  return muted
}

/**
 * Play a synthesized sound by kind.
 * @param kind - The sound to play: 'signOn', 'signOff', 'message', 'buddyOn', 'buddyOff'
 */
export function play(kind: SoundKind): void {
  if (muted) return

  const ctx = getAudioContext()
  const now = ctx.currentTime

  switch (kind) {
    case 'signOn':
      playSignOn(ctx, now)
      break
    case 'signOff':
      playSignOff(ctx, now)
      break
    case 'message':
      playMessage(ctx, now)
      break
    case 'buddyOn':
      playBuddyOn(ctx, now)
      break
    case 'buddyOff':
      playBuddyOff(ctx, now)
      break
  }
}

// ── Sound generators ─────────────────────────────────────────────

/**
 * Sign-on sound: a creaking door opening (filtered noise sweep + low tone).
 * Duration ~1.2s.
 */
function playSignOn(ctx: AudioContext, now: number): void {
  const duration = 1.2

  // Low creaking tone (oscillator sweep)
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(80, now)
  osc.frequency.exponentialRampToValueAtTime(120, now + duration * 0.7)
  osc.frequency.exponentialRampToValueAtTime(90, now + duration)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.08, now)
  oscGain.gain.exponentialRampToValueAtTime(0.12, now + 0.3)
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc.connect(oscGain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)

  // Creaking noise (filtered white noise with pitch sweep)
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(400, now)
  filter.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.6)
  filter.frequency.exponentialRampToValueAtTime(600, now + duration)
  filter.Q.setValueAtTime(3, now)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.05, now)
  noiseGain.gain.linearRampToValueAtTime(0.1, now + 0.2)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  noise.connect(filter).connect(noiseGain).connect(ctx.destination)
  noise.start(now)
  noise.stop(now + duration)
}

/**
 * Sign-off sound: a door closing (reverse of sign-on, shorter).
 * Duration ~0.8s.
 */
function playSignOff(ctx: AudioContext, now: number): void {
  const duration = 0.8

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(120, now)
  osc.frequency.exponentialRampToValueAtTime(70, now + duration)

  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.1, now)
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc.connect(oscGain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)

  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const noise = ctx.createBufferSource()
  noise.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(800, now)
  filter.frequency.exponentialRampToValueAtTime(300, now + duration)
  filter.Q.setValueAtTime(4, now)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.08, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  noise.connect(filter).connect(noiseGain).connect(ctx.destination)
  noise.start(now)
  noise.stop(now + duration)
}

/**
 * Message sound: a quick ghostly chime (two sine tones).
 * Duration ~0.3s.
 */
function playMessage(ctx: AudioContext, now: number): void {
  const duration = 0.3

  // High ghostly tone
  const osc1 = ctx.createOscillator()
  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(800, now)

  const gain1 = ctx.createGain()
  gain1.gain.setValueAtTime(0.08, now)
  gain1.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc1.connect(gain1).connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + duration)

  // Lower harmonic
  const osc2 = ctx.createOscillator()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1200, now)

  const gain2 = ctx.createGain()
  gain2.gain.setValueAtTime(0.05, now)
  gain2.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc2.connect(gain2).connect(ctx.destination)
  osc2.start(now)
  osc2.stop(now + duration)
}

/**
 * Buddy sign-on: a short ascending tone (buddy coming online).
 * Duration ~0.25s.
 */
function playBuddyOn(ctx: AudioContext, now: number): void {
  const duration = 0.25

  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.exponentialRampToValueAtTime(600, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)
}

/**
 * Buddy sign-off: a short descending tone (buddy going offline).
 * Duration ~0.25s.
 */
function playBuddyOff(ctx: AudioContext, now: number): void {
  const duration = 0.25

  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(400, now + duration)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration)

  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)
}
