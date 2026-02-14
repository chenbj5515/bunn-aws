
export async function webmToWav(webm: Blob, opt: { sampleRate: number; mono: boolean }) {
  const ab = await webm.arrayBuffer();
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await ctx.decodeAudioData(ab);
  const channels = opt.mono ? 1 : audioBuffer.numberOfChannels;
  const offline = new OfflineAudioContext(channels, Math.ceil(audioBuffer.duration * opt.sampleRate), opt.sampleRate);
  const src = offline.createBufferSource();
  const monoBuffer = opt.mono ? offline.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate) : audioBuffer;
  if (opt.mono) monoBuffer.getChannelData(0).set(audioBuffer.getChannelData(0));
  src.buffer = monoBuffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return encodeWav(rendered);
}

export async function getAudioDuration(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = new Audio();
  a.src = url;
  await new Promise((res) => (a.onloadedmetadata = res));
  const d = a.duration;
  URL.revokeObjectURL(url);
  return d;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const length = buffer.length * numCh * 2;
  const out = new ArrayBuffer(44 + length);
  const view = new DataView(out);
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, length, true);
  let offset = 44;
  const tmp = new Float32Array(buffer.length);
  for (let ch = 0; ch < numCh; ch++) {
    buffer.copyFromChannel(tmp, ch);
    for (let i = 0; i < tmp.length; i++, offset += 2) {
      const sample = tmp[i] ?? 0;
      const s = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
  return new Blob([view], { type: 'audio/wav' });

  function writeStr(dv: DataView, off: number, s: string) {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  }
}
