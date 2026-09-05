//@ts-nocheck
import fs from 'fs';
import path from 'path';
import { StringDecoder } from 'string_decoder';

/**
 * Nguồn: https://gis.vn/don-vi-hanh-chinh-viet-nam
 * GeoJSON 34 tỉnh/thành - đơn vị hành chính 2 cấp (tỉnh -> phường/xã/đặc khu).
 *
 * File nguồn ~276MB nên được đọc theo kiểu streaming (tách từng Feature bằng
 * cách đếm ngoặc) thay vì JSON.parse cả file.
 */
const INPUT =
  process.argv[2] || './src/assets/Việt Nam (phường xã) - 34.geojson';
const OUTPUT = process.argv[3] || './src/assets/vietnam-format.json';

// Sai số khi làm đơn giản đường biên (đơn vị: độ). 0.0001 độ ~ 11m,
// nhỏ hơn nhiều so với sai số của GPS trên trình duyệt.
const SIMPLIFY_TOLERANCE = Number(process.env.SIMPLIFY_TOLERANCE ?? 0.0001);
// Số chữ số thập phân giữ lại. 5 chữ số ~ 1m.
const COORD_PRECISION = Number(process.env.COORD_PRECISION ?? 5);

/** Đọc file lớn, sinh ra từng chuỗi JSON của một Feature. */
function* readFeatures(file) {
  const fd = fs.openSync(file, 'r');
  const CHUNK = 1 << 22;
  const buffer = Buffer.alloc(CHUNK);
  const decoder = new StringDecoder('utf8');

  let position = 0;
  let insideFeatures = false;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = '';

  try {
    for (;;) {
      const read = fs.readSync(fd, buffer, 0, CHUNK, position);
      if (read <= 0) break;
      position += read;

      const chunk = decoder.write(buffer.subarray(0, read));

      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];

        // Bỏ qua phần header cho tới khi vào mảng "features"
        if (!insideFeatures) {
          if (char === '[') insideFeatures = true;
          continue;
        }

        if (depth === 0) {
          if (char === '{') {
            depth = 1;
            current = '{';
          }
          continue;
        }

        current += char;

        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') inString = false;
          continue;
        }

        if (char === '"') inString = true;
        else if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            yield current;
            current = '';
          }
        }
      }
    }
  } finally {
    fs.closeSync(fd);
  }
}

/** Bình phương khoảng cách từ điểm p tới đoạn thẳng ab. */
const sqSegmentDistance = (p, a, b) => {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
};

/** Ramer-Douglas-Peucker: giảm số điểm của đường biên, giữ nguyên hình dạng. */
const simplify = (points, tolerance) => {
  const last = points.length - 1;
  if (last < 3 || tolerance <= 0) return points;

  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[last] = 1;

  const stack = [[0, last]];
  while (stack.length) {
    const [first, end] = stack.pop();
    let index = -1;
    let maxDistance = sqTolerance;

    for (let i = first + 1; i < end; i++) {
      const distance = sqSegmentDistance(points[i], points[first], points[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, end]);
    }
  }

  const result = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) result.push(points[i]);
  return result;
};

const factor = 10 ** COORD_PRECISION;
const round = (value) => Math.round(value * factor) / factor;

/** Làm tròn toạ độ và bỏ các điểm trùng nhau liên tiếp. */
const roundRing = (ring) => {
  const result = [];
  let previous = null;

  for (const point of ring) {
    const rounded = [round(point[0]), round(point[1])];
    if (
      !previous ||
      rounded[0] !== previous[0] ||
      rounded[1] !== previous[1]
    ) {
      result.push(rounded);
    }
    previous = rounded;
  }

  return result;
};

/**
 * Bounding box được tính từ toạ độ GỐC (chưa làm đơn giản) để chắc chắn
 * nó luôn bao trọn đường biên, tránh loại nhầm ứng viên khi lọc sơ bộ.
 */
const getBox = (polygons) => {
  const bbox = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLong: Infinity,
    maxLong: -Infinity,
  };

  for (const polygon of polygons) {
    for (const [long, lat] of polygon) {
      if (lat < bbox.minLat) bbox.minLat = lat;
      if (lat > bbox.maxLat) bbox.maxLat = lat;
      if (long < bbox.minLong) bbox.minLong = long;
      if (long > bbox.maxLong) bbox.maxLong = long;
    }
  }

  return bbox;
};

/** MultiPolygon -> danh sách vòng ngoài (dataset chỉ có 2 lỗ, bỏ qua được). */
const getOuterRings = (geometry) =>
  geometry.type === 'Polygon'
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map((polygon) => polygon[0]);

const input = path.resolve(INPUT);
const output = path.resolve(OUTPUT);

if (!fs.existsSync(input)) {
  console.error(`Không tìm thấy file nguồn: ${input}`);
  process.exit(1);
}

const stream = fs.createWriteStream(output);
stream.write('[');

let total = 0;
let skipped = 0;
let pointsIn = 0;
let pointsOut = 0;

for (const raw of readFeatures(input)) {
  const feature = JSON.parse(raw);
  const { properties, geometry } = feature;

  const rings = getOuterRings(geometry);
  const polygons = [];

  for (const ring of rings) {
    pointsIn += ring.length;
    const simplified = roundRing(simplify(ring, SIMPLIFY_TOLERANCE));
    // Cần tối thiểu 3 điểm phân biệt + điểm đóng vòng mới thành đa giác
    if (simplified.length < 4) continue;
    pointsOut += simplified.length;
    polygons.push(simplified);
  }

  if (!polygons.length) {
    skipped++;
    continue;
  }

  const ward = {
    code: properties.ma_xa,
    name: properties.ten_xa,
    type: properties.loai, // Xã | Phường | Đặc khu
    provinceCode: properties.ma_tinh,
    province: properties.ten_tinh,
    area: properties.dtich_km2,
    population: properties.dan_so,
    bbox: getBox(rings),
    polygons,
  };

  stream.write((total ? ',' : '') + JSON.stringify(ward));
  total++;
}

stream.write(']');
stream.end();

stream.on('finish', () => {
  const size = fs.statSync(output).size / 1024 / 1024;
  console.log(`Đã ghi ${total} phường/xã vào ${OUTPUT} (${size.toFixed(1)}MB)`);
  console.log(
    `Số điểm: ${pointsIn.toLocaleString()} -> ${pointsOut.toLocaleString()} ` +
      `(giảm ${(100 - (pointsOut / pointsIn) * 100).toFixed(1)}%, tolerance ${SIMPLIFY_TOLERANCE})`
  );
  if (skipped) console.log(`Bỏ qua ${skipped} đơn vị không còn đa giác hợp lệ`);
});
