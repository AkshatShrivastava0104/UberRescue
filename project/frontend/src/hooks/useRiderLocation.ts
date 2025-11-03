import { useEffect, useState } from 'react';

interface Location {
    latitude: number;
    longitude: number;
}

export const useRiderLocation = () => {
    const [location, setLocation] = useState<Location | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported by your browser');
            return;
        }

        // Start watching position
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            },
            (err) => setError(err.message),
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return { location, error };
};
