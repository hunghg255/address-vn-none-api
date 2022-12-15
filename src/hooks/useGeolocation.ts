import { useState } from 'react';

interface IOptions {
  onGetGeoSuccess: (position: {
    coords: { latitude: number; longitude: number };
  }) => void;
  onGetGeoError: ({ code, message }: { code: number; message: string }) => void;
}

//   0: unknown error
//   1: permission denied
//   2: position unavailable (error response from location provider)
//   3: timed out

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 10 * 1000,
  maximumAge: 5 * 60 * 1000,
};

export const useGeolocation = (props: IOptions) => {
  const [geoLocationLoading, setGeolocationLoading] = useState<boolean>(false);

  const triggerSuccess = (data: any) => {
    setGeolocationLoading(false);
    props?.onGetGeoSuccess(data);
  };

  const triggerError = (data: any) => {
    setGeolocationLoading(false);
    props?.onGetGeoError(data);
  };

  const report = (state: any) => {
    console.log(`Permission ${state}`);

    if (state === 'denied') {
      triggerError(state);
    }
  };

  const getGeoLocation = () => {
    setGeolocationLoading(true);

    if (navigator.geolocation && navigator?.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          report(result.state);
          navigator.geolocation.getCurrentPosition(
            triggerSuccess,
            triggerError,
            geoOptions
          );
        } else if (result.state === 'prompt') {
          report(result.state);
          navigator.geolocation.getCurrentPosition(
            triggerSuccess,
            triggerError,
            geoOptions
          );
        } else if (result.state === 'denied') {
          report(result.state);
        }

        result.addEventListener('change', () => {
          report(result.state);
        });
      });
    } else {
      props.onGetGeoError({
        code: 4,
        message: 'Geolocation is not supported for this Browser/OS.',
      });
    }
  };

  return {
    geoLocationLoading,
    getGeoLocation,
    setGeolocationLoading,
  };
};
