import data from './assets/vietnam.json';
import './App.css';
import { useGeolocation } from './hooks/useGeolocation';
import { useRef, useState } from 'react';

const { features: wards } = data as any;

const lineIntersectSegment = (line: any, segment: any) => {
  const a =
    (line.endPoint.latitude - line.startPoint.latitude) /
    (line.endPoint.longitude - line.startPoint.longitude);

  const b = line.endPoint.latitude - a * line.endPoint.longitude;

  const startPointUpper =
    segment.startPoint.latitude > a * segment.startPoint.longitude + b;
  const endPointUpper =
    segment.endPoint.latitude > a * segment.endPoint.longitude + b;

  return startPointUpper !== endPointUpper;
};

const segmentsIntersect = (segment1: any, segment2: any) => {
  return (
    lineIntersectSegment(segment1, segment2) &&
    lineIntersectSegment(segment2, segment1)
  );
};

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

const positionInWard = (position: any, ward: any) => {
  const polygons =
    ward.geometry.type == 'Polygon'
      ? [ward.geometry.coordinates]
      : ward.geometry.coordinates;

  const positionInWardCheck = polygons.some((polygon: any) => {
    return positionInPolygon(position, polygon[0]);
  });

  return positionInWardCheck;
};

const getAddress = (latitude: number, longitude: number) => {
  const data: any = wards.filter((ward: any) =>
    positionInWard(
      {
        latitude: latitude,
        longitude: longitude,
      },
      ward
    )
  );

  return data?.[data?.length - 1];
};

function App() {
  const [address, setAddress] = useState('');
  const [addressRandom, setAddressRandom] = useState('');

  const refInputLat: any = useRef();
  const refInputLng: any = useRef();

  const { getGeoLocation, geoLocationLoading } = useGeolocation({
    onGetGeoSuccess: (position) => {
      const foundWard = getAddress(
        position.coords.latitude,
        position.coords.longitude
      );

      if (foundWard)
        setAddress(
          `${foundWard.properties.NAME_3} - ${foundWard.properties.NAME_2} - ${foundWard.properties.NAME_1}`
        );
    },
    onGetGeoError: (err) => {
      console.log(err);
    },
  });

  const onRandomAddress = () => {
    const lat = refInputLat.current.value;
    const lng = refInputLng.current.value;

    if (lat && lng) {
      const foundWard = getAddress(parseFloat(lat), parseFloat(lng));

      if (foundWard)
        setAddressRandom(
          `${foundWard.properties.NAME_3} - ${foundWard.properties.NAME_2} - ${foundWard.properties.NAME_1}`
        );
    }
  };

  return (
    <div className='App'>
      <div>
        <button onClick={getGeoLocation} disabled={geoLocationLoading}>
          Get Current
        </button>
      </div>

      <h3>Current address: {address || ''}</h3>

      <br />
      <hr />
      <br />

      <div>
        <div>
          <label>Latitude: </label>
          <input ref={refInputLat} />
        </div>
        <div>
          <label>Longitude: </label>
          <input ref={refInputLng} />
        </div>
        <br />
        <button onClick={onRandomAddress}>Get Random Address</button>

        <h3>Random address: {addressRandom || ''}</h3>
      </div>
    </div>
  );
}

export default App;
