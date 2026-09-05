import dataFormat from '../assets/vietnam-format.json';

export interface IWard {
  /** Mã phường/xã */
  code: string;
  name: string;
  /** Xã | Phường | Đặc khu */
  type: string;
  provinceCode: string;
  province: string;
  /** km2 */
  area: number;
  population: number;
  bbox: {
    minLat: number;
    maxLat: number;
    minLong: number;
    maxLong: number;
  };
  /** Danh sách vòng ngoài, mỗi điểm là [longitude, latitude] */
  polygons: [number, number][][];
}

const wards = dataFormat as unknown as IWard[];

/**
 * Kiểm tra một điểm có nằm trong đa giác không bằng thuật toán ray casting:
 * bắn một tia ngang từ điểm ra vô cực, đếm số cạnh mà tia cắt qua.
 * Số lẻ => nằm trong, số chẵn => nằm ngoài.
 *
 * Điều kiện (latI > lat) !== (latJ > lat) vừa lọc các cạnh không cắt tia,
 * vừa đảm bảo latJ - latI khác 0 nên không bao giờ chia cho 0, và mỗi đỉnh
 * nằm đúng trên tia chỉ được đếm một lần.
 */
const positionInPolygon = (
  position: { latitude: number; longitude: number },
  polygon: [number, number][]
) => {
  const { latitude: lat, longitude: long } = position;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [longI, latI] = polygon[i];
    const [longJ, latJ] = polygon[j];

    const crossesRay = latI > lat !== latJ > lat;
    if (!crossesRay) continue;

    // Hoành độ giao điểm của cạnh với tia ngang đi qua điểm cần kiểm tra
    const longIntersect =
      ((longJ - longI) * (lat - latI)) / (latJ - latI) + longI;

    if (long < longIntersect) inside = !inside;
  }

  return inside;
};

/** Lọc sơ bộ: điểm có nằm trong hình chữ nhật bao quanh đơn vị hành chính không */
const positionInBox = (
  position: { latitude: number; longitude: number },
  bbox: IWard['bbox']
) =>
  position.latitude >= bbox.minLat &&
  position.latitude <= bbox.maxLat &&
  position.longitude >= bbox.minLong &&
  position.longitude <= bbox.maxLong;

/** Một đơn vị hành chính có thể gồm nhiều đảo/mảnh rời nhau */
const positionInWard = (
  position: { latitude: number; longitude: number },
  ward: IWard
) => ward.polygons.some((polygon) => positionInPolygon(position, polygon));

/**
 * Tra cứu phường/xã chứa toạ độ, không cần gọi API.
 * Lọc bằng bounding box trước để giảm số đa giác phải kiểm tra, nhưng vẫn
 * luôn kiểm tra đa giác: bbox là hình chữ nhật nên một điểm ngoài biển hoặc
 * sát biên giới vẫn có thể lọt vào bbox của đúng một đơn vị hành chính.
 */
const getAddress = (latitude: number, longitude: number): IWard | undefined => {
  const position = { latitude, longitude };

  return wards
    .filter((ward) => positionInBox(position, ward.bbox))
    .find((ward) => positionInWard(position, ward));
};

/** Chuỗi địa chỉ đầy đủ theo mô hình 2 cấp: phường/xã - tỉnh/thành */
const formatAddress = (ward: IWard) =>
  `${ward.type} ${ward.name} - ${ward.province}`;

export { getAddress, formatAddress };
