// City coordinates mapping - Comprehensive Philippine cities and municipalities
export const CITIES = {
  // National Capital Region (NCR)
  'Manila': { lat: 14.5994, lng: 120.9842 },
  'Quezon City': { lat: 14.6349, lng: 121.0388 },
  'Makati': { lat: 14.5550, lng: 121.0175 },
  'Pasig': { lat: 14.5794, lng: 121.5767 },
  'Pasay': { lat: 14.5631, lng: 120.9990 },
  'Taguig': { lat: 14.5213, lng: 121.0461 },
  'Las Piñas': { lat: 14.3562, lng: 120.9694 },
  'Parañaque': { lat: 14.3534, lng: 120.9935 },
  'Caloocan': { lat: 14.6345, lng: 120.9688 },
  'Marikina': { lat: 14.6421, lng: 121.1815 },
  'Mandaluyong': { lat: 14.5863, lng: 121.0199 },
  'San Juan': { lat: 14.5950, lng: 121.0266 },
  'Navotas': { lat: 14.6508, lng: 120.8378 },
  'Malabon': { lat: 14.6547, lng: 120.8661 },
  'Valenzuela': { lat: 14.7676, lng: 120.9619 },
  'Muntinlupa': { lat: 14.3767, lng: 121.0421 },
  'Antipolo': { lat: 14.5886, lng: 121.1772 },
  'Meycauayan': { lat: 14.7583, lng: 120.9544 },
  'Cavite City': { lat: 14.5644, lng: 120.8941 },
  'Bacoor': { lat: 14.4153, lng: 120.8856 },
  'Dasmarinas': { lat: 14.2944, lng: 120.9261 },
  'Tagaytay': { lat: 14.1206, lng: 120.9563 },
  'Imus': { lat: 14.3016, lng: 120.9029 },
  'Kawit': { lat: 14.6376, lng: 120.8684 },
  'General Trias': { lat: 14.2547, lng: 121.0047 },
  'Laguna': { lat: 14.3037, lng: 121.2339 },
  'Biñan': { lat: 14.3156, lng: 121.3096 },
  'Santa Rosa': { lat: 14.3450, lng: 121.1989 },
  'Cebu': { lat: 10.3157, lng: 123.8854 },
  'Davao': { lat: 7.1907, lng: 125.4553 },
  'Iloilo': { lat: 10.6918, lng: 122.5637 },
  'Bacolod': { lat: 10.3906, lng: 123.0236 },
  'Cagayan de Oro': { lat: 8.4842, lng: 124.6326 },
  'Butuan': { lat: 8.9655, lng: 125.5244 },
  'Laoag': { lat: 16.9997, lng: 120.5947 },
  'Baguio': { lat: 16.4023, lng: 120.5960 },
  'Tuguegarao': { lat: 17.6060, lng: 121.7345 },
  'Cainta': { lat: 14.5694, lng: 121.2944 },
  'Tanay': { lat: 14.5608, lng: 121.3533 },
  'Rizal': { lat: 14.5811, lng: 121.2756 },
  'Quezon': { lat: 14.1694, lng: 121.5742 },
  'Sariaya': { lat: 14.0939, lng: 121.5894 },
  'Lucena': { lat: 13.9356, lng: 121.6169 },
  'Naga': { lat: 12.8730, lng: 123.6242 },
  'Digos': { lat: 6.7429, lng: 125.4008 },
  'General Santos': { lat: 6.1126, lng: 125.1842 },
  'Koronadal': { lat: 6.5300, lng: 124.8200 },
  'Surigao': { lat: 9.7905, lng: 125.5047 },
  'Iligan': { lat: 8.2343, lng: 124.2168 },
  'Zamboanga': { lat: 6.9271, lng: 122.1165 },
  'Vigan': { lat: 16.5837, lng: 120.3945 },
  'Dagupan': { lat: 16.0406, lng: 120.3331 },
  'Cabanatuan': { lat: 15.4850, lng: 121.1175 },
  'Mandaue': { lat: 10.3064, lng: 123.9675 },
  'Lapu-Lapu': { lat: 10.3181, lng: 123.9752 },
  'Bohol': { lat: 9.6547, lng: 123.8854 },
  'Tagbilaran': { lat: 9.6477, lng: 123.8606 },
  'Dumaguete': { lat: 9.3031, lng: 123.2998 },
  'Siquijor': { lat: 9.1913, lng: 123.5807 },
  'Antique': { lat: 10.7000, lng: 122.0667 },
  'San Jose de Buenavista': { lat: 10.8058, lng: 121.9561 },
  'Capiz': { lat: 11.4973, lng: 122.8664 },
  'Legazpi': { lat: 13.1459, lng: 123.7347 },
  'Tabaco': { lat: 13.4331, lng: 123.7564 },
  'Masbate': { lat: 12.3776, lng: 123.6365 },
};

export const getCityCoordinates = (cityName: string) => {
  const normalizedCity = Object.keys(CITIES).find(
    (city) => city.toLowerCase() === cityName.toLowerCase()
  );

  if (normalizedCity) {
    return CITIES[normalizedCity as keyof typeof CITIES];
  }

  // Default to Manila if not found
  return CITIES['Manila'];
};

export const getCityList = () => Object.keys(CITIES);

// Find nearest city to given coordinates
export const getNearestCity = (lat: number, lng: number): string => {
  let nearestCity = 'Manila';
  let minDistance = Infinity;

  Object.entries(CITIES).forEach(([city, coords]) => {
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((coords.lat - lat) * Math.PI) / 180;
    const dLng = ((coords.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((coords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  });

  return nearestCity;
};
