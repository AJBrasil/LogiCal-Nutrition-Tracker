// EAN digits consist of four alternating runs across seven modules.
const widths = [
  "3211",
  "2221",
  "2122",
  "1411",
  "1132",
  "1231",
  "1114",
  "1312",
  "1213",
  "3112",
];
const parity = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];
function readDigit(runs: number[], offset: number, allowG: boolean) {
  const four = runs.slice(offset, offset + 4);
  const module = four.reduce((a, b) => a + b, 0) / 7;
  let best = { error: Infinity, value: "", kind: "" };
  for (const kind of allowG ? ["L", "G"] : ["L"])
    for (let d = 0; d < 10; d++) {
      const pattern = widths[d];
      const error = four.reduce(
        (s, r, i) =>
          s + (r / module - Number(pattern[kind === "G" ? 3 - i : i])) ** 2,
        0,
      );
      if (error < best.error) best = { error, value: String(d), kind };
    }
  return best;
}
function checksum(code: string) {
  return (
    [...code]
      .reverse()
      .reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0) %
      10 ===
    0
  );
}
export function decodeRetailLine(line: number[]): string | null {
  const low = Math.min(...line),
    high = Math.max(...line);
  if (high - low < 40) return null;
  const runs: number[] = [];
  let black = false,
    count = 0;
  for (const value of line) {
    const next = value < (high + low) / 2;
    if (next === black) count++;
    else {
      runs.push(count);
      black = next;
      count = 1;
    }
  }
  runs.push(count);
  if (black) runs.push(0);
  for (const direction of [runs, [...runs].reverse()])
    for (let start = 1; start < direction.length; start += 2) {
      for (const half of [6, 4]) {
        const middle = start + 3 + half * 4,
          end = middle + 5 + half * 4;
        if (end + 3 >= direction.length) continue;
        const guards = [
          ...direction.slice(start, start + 3),
          ...direction.slice(middle, middle + 5),
          ...direction.slice(end, end + 3),
        ];
        const module = guards.reduce((a, b) => a + b, 0) / 11;
        if (module < 0.8 || guards.some((v) => Math.abs(v / module - 1) > 0.85))
          continue;
        let digits = "",
          pattern = "";
        let valid = true;
        for (let i = 0; i < half * 2; i++) {
          const left = i < half;
          const offset = left ? start + 3 + i * 4 : middle + 5 + (i - half) * 4;
          const digit = readDigit(direction, offset, left && half === 6);
          if (digit.error > 1.1) {
            valid = false;
            break;
          }
          digits += digit.value;
          if (left) pattern += digit.kind;
        }
        if (!valid) continue;
        if (half === 6) {
          const first = parity.indexOf(pattern);
          if (first < 0) continue;
          digits = String(first) + digits;
        }
        if (checksum(digits)) return digits;
      }
    }
  return null;
}
export function scanRetailFrame(video: HTMLVideoElement) {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(960, video.videoWidth);
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  for (const y of [0.5, 0.43, 0.57, 0.36, 0.64]) {
    ctx.drawImage(
      video,
      0,
      Math.floor(video.videoHeight * y),
      video.videoWidth,
      1,
      0,
      0,
      canvas.width,
      1,
    );
    const pixels = ctx.getImageData(0, 0, canvas.width, 1).data;
    const code = decodeRetailLine(
      Array.from(
        { length: canvas.width },
        (_, i) => (pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 3,
      ),
    );
    if (code) return code;
  }
  return null;
}
