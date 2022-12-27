import './App.css';
import { useGeolocation } from './hooks/useGeolocation';
import { useRef, useState } from 'react';
import { getAddress } from './utils';

function App() {
  const [address, setAddress] = useState('');
  const [addressRandom, setAddressRandom] = useState('');
  const [latLng, setLatLng] = useState<any>();

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
          `${foundWard.name} - ${foundWard.district} - ${foundWard.provice}`
        );
      setLatLng({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
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
          `${foundWard.name} - ${foundWard.district} - ${foundWard.provice}`
        );
      setLatLng({
        lat,
        lng,
      });
    }
  };

  return (
    <div className='App'>
      <h1>Vietnam Address</h1>
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

      {latLng && (
        <h3>
          <a
            href={`http://maps.google.com/maps?q=loc:${latLng.lat},${latLng.lng}`}
            target='_blank'
          >
            Go to map
          </a>
        </h3>
      )}
    </div>
  );
}

export default App;
