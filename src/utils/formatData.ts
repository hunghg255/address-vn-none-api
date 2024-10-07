//@ts-nocheck
import data from '../assets/vietnam.json';
import fs from 'fs';

const { features: wards } = data;

// Bounding box
const getBox = (polygons) => {
  let bbox = {
    minLat: 100000,
    maxLat: -100000,
    minLong: 100000,
    maxLong: -10000,
  };

  polygons.forEach((polygon) => {
    polygon.forEach((point) => {
      const [long, lat] = point;

      bbox.minLat = Math.min(bbox.minLat, lat);
      bbox.maxLat = Math.max(bbox.maxLat, lat);
      bbox.minLong = Math.min(bbox.minLong, long);
      bbox.maxLong = Math.max(bbox.maxLong, long);
    });
  });

  return bbox;
};

const wardsFormat = wards.map((ward) => {
  let wardData = {
    type: ward.properties.TYPE_3,
    name: ward.properties.NAME_3,
    district: ward.properties.NAME_2,
    provice: ward.properties.NAME_1,
  };

  if (ward.geometry.type === 'Polygon') {
    wardData.polygons = ward.geometry.coordinates;
  } else {
    wardData.polygons = ward.geometry.coordinates.map((polygon) => {
      return polygon[0];
    });
  }

  wardData.bbox = getBox(wardData.polygons);

  return wardData;
});

try {
  fs.writeFileSync('./src/assets/vietnam-format.json', JSON.stringify(wardsFormat));
  //file written successfully
} catch (err) {
  console.error(err);
}
