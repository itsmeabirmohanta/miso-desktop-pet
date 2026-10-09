import { deflateSync } from "node:zlib";
import { writeFile, mkdir, access } from "node:fs/promises";
async function writeFallback(path, bytes) {
  try {
    await access(path);
  } catch {
    await writeFile(path, bytes);
  }
}
function crc(bytes) {
  let value = 0xffffffff;
  for (const b of bytes) {
    value ^= b;
    for (let i = 0; i < 8; i++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
await mkdir("src/assets", { recursive: true });
for (const size of [32, 256]) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const xx = x / size,
        yy = y / size;
      let color = [0, 0, 0, 0];
      if (
        (xx - 0.5) ** 2 / 0.38 ** 2 + (yy - 0.57) ** 2 / 0.32 ** 2 < 1 ||
        (yy > 0.13 &&
          yy < 0.5 &&
          ((xx > 0.18 && xx < 0.38 && yy > 0.13 + (xx - 0.18)) ||
            (xx > 0.62 && xx < 0.82 && yy > 0.13 + (0.82 - xx))))
      )
        color = [225, 155, 99, 255];
      if (
        yy > 0.53 &&
        yy < 0.59 &&
        ((xx > 0.32 && xx < 0.39) || (xx > 0.61 && xx < 0.68))
      )
        color = [67, 48, 37, 255];
      if (yy > 0.64 && yy < 0.69 && xx > 0.46 && xx < 0.54)
        color = [157, 81, 77, 255];
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      pixels.set(color, offset);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  await writeFallback(`src/assets/${size === 32 ? "tray" : "icon"}.png`, png);
  if (size === 256) {
    const icoHeader = Buffer.alloc(22);
    icoHeader.writeUInt16LE(1, 2);
    icoHeader.writeUInt16LE(1, 4);
    icoHeader.writeUInt16LE(1, 10);
    icoHeader.writeUInt16LE(32, 12);
    icoHeader.writeUInt32LE(png.length, 14);
    icoHeader.writeUInt32LE(22, 18);
    await writeFallback("src/assets/icon.ico", Buffer.concat([icoHeader, png]));
  }
}
