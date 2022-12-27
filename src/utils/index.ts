import dataFormat from '../assets//vietnam-format.json';

// Kiểm tra 1 đường thẳng cắt 1 đoạn thẳng bằng PT y = ax + b;
function lineIntersectSegment(line: any, segment: any) {
  const {
    startPoint: { latitude: x1, longitude: y1 },
    endPoint: { latitude: x2, longitude: y2 },
  } = line;
  const {
    startPoint: { latitude: x3, longitude: y3 },
    endPoint: { latitude: x4, longitude: y4 },
  } = segment;
  // Calculate the slopes of the two lines
  const slope1 = (y2 - y1) / (x2 - x1);
  const slope2 = (y4 - y3) / (x4 - x3);

  // If the slopes are equal, the lines are parallel and do not intersect
  if (slope1 === slope2) {
    return false;
  }

  // Calculate the y-intercepts of the two lines
  const yIntercept1 = y1 - slope1 * x1;
  const yIntercept2 = y3 - slope2 * x3;

  // If the y-intercepts are equal, the lines are coincident and intersect at every point
  if (yIntercept1 === yIntercept2) {
    return true;
  }

  // Calculate the x-coordinate of the intersection point
  const x = (yIntercept2 - yIntercept1) / (slope1 - slope2);

  // Calculate the y-coordinate of the intersection point
  const y = slope1 * x + yIntercept1;

  // Check if the intersection point falls within the range of both line segments
  return (
    ((x1 <= x && x <= x2) || (x2 <= x && x <= x1)) &&
    ((x3 <= x && x <= x4) || (x4 <= x && x <= x3)) &&
    ((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) &&
    ((y3 <= y && y <= y4) || (y4 <= y && y <= y3))
  );
}

// const lineIntersectSegment = (line: any, segment: any) => {
//   const a =
//     (line.endPoint.latitude - line.startPoint.latitude) /
//     (line.endPoint.longitude - line.startPoint.longitude);

//   const b = line.endPoint.latitude - a * line.endPoint.longitude;

//   const startPointUpper =
//     segment.startPoint.latitude > a * segment.startPoint.longitude + b;
//   const endPointUpper =
//     segment.endPoint.latitude > a * segment.endPoint.longitude + b;

//   return startPointUpper !== endPointUpper;
// };

// kiểm tra chéo giữa 2 đoạn thẳng
const segmentsIntersect = (segment1: any, segment2: any) => {
  return (
    lineIntersectSegment(segment1, segment2) &&
    lineIntersectSegment(segment2, segment1)
  );
};

// Kiểm tra một vị trí có nằm trong polygon không
const positionInPolygon = (position: any, polygons: any) => {
  const checkPoint = {
    latitude: 0,
    longitude: 0,
  };

  const checkSegment = { startPoint: checkPoint, endPoint: position };

  let count = 0;

  for (let i = 0; i < polygons.length - 1; i++) {
    const element = polygons[i];
    const element1 = polygons[i + 1];

    const lineSegment = {
      startPoint: {
        longitude: element[0],
        latitude: element[1],
      },
      endPoint: {
        longitude: element1[0],
        latitude: element1[1],
      },
    };

    if (segmentsIntersect(checkSegment, lineSegment)) count++;
  }

  return count % 2 !== 0;
};

const polygonInBox = (position: any, bbox: any) => {
  return (
    position.lat >= bbox.minLat &&
    position.lat <= bbox.maxLat &&
    position.long >= bbox.minLong &&
    position.long <= bbox.maxLong
  );
};

const positionInWard = (position: any, ward: any) => {
  const positionInWardCheck = ward.polygons.some((polygon: any) => {
    return positionInPolygon(position, polygon);
  });

  return positionInWardCheck;
};

const getAddress = (latitude: number, longitude: number) => {
  const posibleWards = (dataFormat as any[])?.filter((ward: any) =>
    polygonInBox({ lat: latitude, long: longitude }, ward.bbox)
  );

  if (posibleWards?.length === 1) return posibleWards?.[0];

  const data: any = posibleWards.find((ward: any) =>
    positionInWard(
      {
        latitude: latitude,
        longitude: longitude,
      },
      ward
    )
  );

  return data;
};

export { getAddress };
