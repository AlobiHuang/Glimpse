import * as Location from 'expo-location';

/** Asks for permission (once) and returns where you are. Throws a friendly message if it can't. */
export async function getMyLocation(): Promise<{ lat: number; lng: number }> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw new Error('Turn on location access to see photos near you.');
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    throw new Error('Couldn’t find your location. Try again in a moment.');
  }
}
