const map = L.map('map').setView([28.7041, 77.1025], 13);

// Define both tile layers
const darkLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
  attribution: '© Carto DB'
});

const lightLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

// Default to dark
lightLayer.addTo(map);

// Export a function to switch map theme
function setMapTheme(mode) {
  if (mode === "light") {
    if (map.hasLayer(darkLayer)) map.removeLayer(darkLayer);
    lightLayer.addTo(map);
  } else {
    if (map.hasLayer(lightLayer)) map.removeLayer(lightLayer);
    darkLayer.addTo(map);
  }
}

// Make it accessible to other scripts (important!)
window.setMapTheme = setMapTheme;

let userMarker = null;
let routeControl = null;
let pickupMarker = null;
let dropoffMarker = null;
let pickupLatLng = null;
let dropoffLatLng = null;
let settingPickup = false;
let settingDropoff = false;
let followLocation = true;
let debounceTimer = null;

const markerIconGreen = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
const markerIconRed = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
const markerIconBlue = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
const markerShadow = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png';


const pickupIcon = L.icon({
    iconUrl: markerIconGreen,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const dropoffIcon = L.icon({
    iconUrl: markerIconRed,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function updateUserLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const userLatLng = [lat, lng];

    if (userMarker) {
        userMarker.setLatLng(userLatLng);
    } else {
        userMarker = L.marker(userLatLng, {
            icon: L.icon({
                iconUrl: markerIconBlue,
                shadowUrl: markerShadow,
                iconSize: [20, 36],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map).bindPopup('You are here');

        if (!pickupLatLng) {
            pickupLatLng = userLatLng;
            if (pickupMarker) map.removeLayer(pickupMarker);
            pickupMarker = L.marker(userLatLng, { icon: pickupIcon }).addTo(map).bindPopup('Pickup (Your location)');
            document.getElementById('pickup-search').placeholder = 'Pickup set to your location';
        }
    }

    document.getElementById('location-status').innerHTML = `<span class="status-dot"></span><span>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</span>`;

    if (followLocation) {
        map.panTo(userLatLng, { animate: true, duration: 0.5 });
    }
}

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updateUserLocation, (error) => {
        console.error('Geolocation error:', error);
        document.getElementById('location-status').innerHTML = '<span>❌</span><span>Location error</span>';
    }, {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 0
    });
} else {
    document.getElementById('location-status').innerHTML = '<span>❌</span><span>Not supported</span>';
}

document.getElementById('follow-location').addEventListener('change', function() {
    followLocation = this.checked;
});

function createRoute(fromLatLng, toLatLng) {
    if (!fromLatLng || !toLatLng) {
        console.error('Missing coordinates:', fromLatLng, toLatLng);
        return;
    }

    // Handle both LatLng objects and arrays
    const fromLat = fromLatLng.lat ?? fromLatLng[0];
    const fromLng = fromLatLng.lng ?? fromLatLng[1];
    const toLat = toLatLng.lat ?? toLatLng[0];
    const toLng = toLatLng.lng ?? toLatLng[1];

    // OSRM expects "lon,lat"
    const start = `${fromLng},${fromLat}`;
    const end = `${toLng},${toLat}`;

    // Use SERVER_URL if set, else relative
    const baseURL = window.SERVER_URL ? window.SERVER_URL.replace(/\/$/, '') : '';
    // This URL now hits your backend, which should be requesting steps=true
    const url = `${baseURL}/api/route?start=${start}&end=${end}`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (!data.routes?.length) {
                alert('No route found!');
                return;
            }

            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

            if (window.routeLine) map.removeLayer(window.routeLine);

            window.routeLine = L.polyline(coordinates, {
                color: '#26e083',
                weight: 5,
                opacity: 0.8
            }).addTo(map);

            const distanceKm = (route.distance / 1000).toFixed(2);
            const timeMinutes = Math.round(route.duration / 60);

            document.getElementById('distance').textContent = `${distanceKm} km`;
            document.getElementById('time').textContent = `${timeMinutes} minutes`;
            document.getElementById('info-panel').classList.add('active');

            // --- START: NEW CODE FOR DIRECTIONS ---

            // 1. Get the container you added to your HTML
            const directionsContainer = document.getElementById('directions-list');
            
            directionsContainer.innerHTML = '';
            const steps = route.legs[0].steps;

            const list = document.createElement('ol');

            steps.forEach(step => {
                const li = document.createElement('li');
                // 'instruction' holds the text like "Turn left onto Main Street"
                li.textContent = step.maneuver.instruction;
                list.appendChild(li);
            });

            directionsContainer.appendChild(list);-

            map.fitBounds(window.routeLine.getBounds(), { padding: [30, 30] });
        })
        .catch(err => {
            console.error('Route fetch failed:', err);
            alert('Failed to get route.');
        });
    }

map.on('click', function(e) {
    const latlng = e.latlng;
    if (settingPickup) {
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker(latlng, { icon: pickupIcon }).addTo(map).bindPopup('Pickup Location').openPopup();
        pickupLatLng = latlng;
        settingPickup = false;
        document.getElementById('set-pickup').classList.remove('active');
        document.getElementById('set-pickup').textContent = 'Click Map';
    } else if (settingDropoff) {
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker(latlng, { icon: dropoffIcon }).addTo(map).bindPopup('Drop-off Location').openPopup();
        dropoffLatLng = latlng;
        settingDropoff = false;
        document.getElementById('set-dropoff').classList.remove('active');
        document.getElementById('set-dropoff').textContent = 'Click Map';
    }
});

function fetchSuggestions(query, type) {
    if (query.length < 2) {
        document.getElementById(`${type}-suggestions`).classList.remove('active');
        return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(response => response.json())
        .then(data => {
            const suggestionsDiv = document.getElementById(`${type}-suggestions`);
            suggestionsDiv.innerHTML = '';
            if (data.length > 0) {
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.textContent = item.display_name;
                    div.addEventListener('click', () => {
                        document.getElementById(`${type}-search`).value = item.display_name;
                        suggestionsDiv.classList.remove('active');
                        const latlng = [parseFloat(item.lat), parseFloat(item.lon)];
                        if (type === 'pickup') {
                            if (pickupMarker) map.removeLayer(pickupMarker);
                            pickupMarker = L.marker(latlng, { icon: pickupIcon }).addTo(map).bindPopup('Pickup: ' + item.display_name).openPopup();
                            pickupLatLng = latlng;
                        } else if (type === 'dropoff') {
                            if (dropoffMarker) map.removeLayer(dropoffMarker);
                            dropoffMarker = L.marker(latlng, { icon: dropoffIcon }).addTo(map).bindPopup('Drop-off: ' + item.display_name).openPopup();
                            dropoffLatLng = latlng;
                        }
                        map.setView(latlng, 15);
                    });
                    suggestionsDiv.appendChild(div);
                });
                suggestionsDiv.classList.add('active');
            } else {
                suggestionsDiv.classList.remove('active');
            }
        })
        .catch(error => console.error('Autocomplete error:', error));
}

function handleInput(e, type) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchSuggestions(e.target.value, type);
    }, 300);
}

document.getElementById('pickup-search').addEventListener('input', (e) => handleInput(e, 'pickup'));
document.getElementById('dropoff-search').addEventListener('input', (e) => handleInput(e, 'dropoff'));

document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
        document.getElementById('pickup-suggestions').classList.remove('active');
        document.getElementById('dropoff-suggestions').classList.remove('active');
    }
});

function useCurrentLocation(type) {
    if (userMarker) {
        const latlng = userMarker.getLatLng();
        if (type === 'pickup') {
            if (pickupMarker) map.removeLayer(pickupMarker);
            pickupMarker = L.marker(latlng, { icon: pickupIcon }).addTo(map).bindPopup('Pickup (Your location)').openPopup();
            pickupLatLng = latlng;
            document.getElementById('pickup-search').value = 'Your current location';
        } else {
            if (dropoffMarker) map.removeLayer(dropoffMarker);
            dropoffMarker = L.marker(latlng, { icon: dropoffIcon }).addTo(map).bindPopup('Drop-off (Your location)').openPopup();
            dropoffLatLng = latlng;
            document.getElementById('dropoff-search').value = 'Your current location';
        }
    }
}

document.getElementById('set-pickup').addEventListener('click', function() {
    settingPickup = !settingPickup;
    this.classList.toggle('active');
    this.textContent = settingPickup ? 'Click Map Now' : 'Click Map';
    if (settingPickup) {
        settingDropoff = false;
        document.getElementById('set-dropoff').classList.remove('active');
        document.getElementById('set-dropoff').textContent = 'Click Map';
    }
});

document.getElementById('set-dropoff').addEventListener('click', function() {
    settingDropoff = !settingDropoff;
    this.classList.toggle('active');
    this.textContent = settingDropoff ? 'Click Map Now' : 'Click Map';
    if (settingDropoff) {
        settingPickup = false;
        document.getElementById('set-pickup').classList.remove('active');
        document.getElementById('set-pickup').textContent = 'Click Map';
    }
});

document.getElementById('calculate-route').addEventListener('click', function() {
    if (pickupLatLng && dropoffLatLng) {
        createRoute(pickupLatLng, dropoffLatLng);
    } else {
        alert('Please set both pickup and drop-off locations.');
    }
});

document.getElementById('pickup-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('pickup-suggestions').classList.remove('active');
    }
});

document.getElementById('dropoff-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('dropoff-suggestions').classList.remove('active');
    }
});