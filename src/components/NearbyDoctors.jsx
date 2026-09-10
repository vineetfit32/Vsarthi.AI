import React, { useState, useCallback } from 'react';
import {
  MapPin, Phone, Navigation, RefreshCw, Loader2,
  AlertCircle, ChevronDown, ChevronUp, ExternalLink, Clock,
  Building2, Stethoscope, Pill, Plus
} from 'lucide-react';
import clsx from 'clsx';

// ─── Haversine distance (km) ─────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Overpass API fetch ───────────────────────────────────────────────────────
async function fetchNearbyPlaces(lat, lon, radiusM = 5000) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusM},${lat},${lon});
      node["amenity"="clinic"](around:${radiusM},${lat},${lon});
      node["amenity"="doctors"](around:${radiusM},${lat},${lon});
      node["amenity"="pharmacy"](around:${radiusM},${lat},${lon});
      node["healthcare"="doctor"](around:${radiusM},${lat},${lon});
      node["healthcare"="hospital"](around:${radiusM},${lat},${lon});
      node["healthcare"="clinic"](around:${radiusM},${lat},${lon});
      way["amenity"="hospital"](around:${radiusM},${lat},${lon});
      way["amenity"="clinic"](around:${radiusM},${lat},${lon});
    );
    out center tags;
  `;
  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!response.ok) throw new Error('Overpass API error ' + response.status);
  const data = await response.json();

  return data.elements
    .map((el) => {
      const tags = el.tags || {};
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (!elLat || !elLon) return null;
      const amenity = tags.amenity || tags.healthcare || 'clinic';
      const dist = haversine(lat, lon, elLat, elLon);
      return {
        id: el.id,
        name: tags.name || tags['name:en'] || amenity.replace(/_/g, ' '),
        amenity,
        address: [
          tags['addr:houseno'],
          tags['addr:street'],
          tags['addr:suburb'] || tags['addr:city'],
          tags['addr:postcode'],
        ].filter(Boolean).join(', ') || tags['addr:full'] || '',
        phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '',
        website: tags.website || tags['contact:website'] || '',
        openingHours: tags.opening_hours || '',
        operator: tags.operator || tags.brand || '',
        speciality: tags.healthcare_speciality || tags.speciality || '',
        lat: elLat,
        lon: elLon,
        dist,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 20);
}

// ─── Style helpers ────────────────────────────────────────────────────────────
function amenityStyle(amenity) {
  if (amenity === 'hospital')
    return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
  if (amenity === 'pharmacy')
    return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
  return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
}

function amenityLabel(a) {
  return ({ hospital: 'Hospital', pharmacy: 'Pharmacy', clinic: 'Clinic',
    doctors: 'Doctor', doctor: 'Doctor', healthcare: 'Healthcare' })[a] || a;
}

function AmenityIcon({ amenity }) {
  if (amenity === 'hospital') return <Building2 size={18} />;
  if (amenity === 'pharmacy') return <Pill size={18} />;
  if (amenity === 'doctors' || amenity === 'doctor') return <Stethoscope size={18} />;
  return <Plus size={18} />;
}

// ─── Doctor result card ───────────────────────────────────────────────────────
function DoctorCard({ place }) {
  const [expanded, setExpanded] = useState(false);
  const s = amenityStyle(place.amenity);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;

  return (
    <div className={clsx('rounded-2xl border-2 bg-white overflow-hidden', s.border)}>
      <button
        className="w-full text-left px-3 sm:px-4 py-3 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', s.bg)}>
          <span className={s.text}><AmenityIcon amenity={place.amenity} /></span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-bold text-slate-800 text-sm leading-snug capitalize flex-1">
              {place.name || 'Unnamed Facility'}
            </p>
            <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0', s.bg, s.text, s.border)}>
              {amenityLabel(place.amenity)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <MapPin size={11} />
              {place.dist < 1
                ? `${Math.round(place.dist * 1000)} m`
                : `${place.dist.toFixed(1)} km`}
            </span>
            {place.phone && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 truncate max-w-[130px]">
                <Phone size={11} />{place.phone}
              </span>
            )}
          </div>
        </div>
        <span className="flex-shrink-0 text-slate-400 mt-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-3 sm:px-4 pb-4 pt-3 space-y-3">
          {place.address && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
              <span>{place.address}</span>
            </div>
          )}
          {place.openingHours && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Clock size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
              <span className="font-mono text-xs break-all">{place.openingHours}</span>
            </div>
          )}
          {place.operator && (
            <p className="text-xs text-slate-500">Operated by: <strong>{place.operator}</strong>
              {place.speciality && <span> · {place.speciality}</span>}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors"
            >
              <Navigation size={13} /> Directions
            </a>
            {place.phone ? (
              <a
                href={`tel:${place.phone.replace(/\s/g, '')}`}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors"
              >
                <Phone size={13} /> Call
              </a>
            ) : (
              <span className="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-not-allowed">
                <Phone size={13} /> No Phone
              </span>
            )}
          </div>
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink size={11} /> Visit Website
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NearbyDoctors({ onPrint }) {
  const [status, setStatus] = useState('idle');
  const [places, setPlaces] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [filter, setFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('geo_error');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setStatus('locating');
    setPlaces([]);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        setUserCoords({ lat, lon });
        setStatus('loading');
        fetchNearbyPlaces(lat, lon)
          .then(r => { setPlaces(r); setStatus('done'); })
          .catch(() => {
            setStatus('api_error');
            setErrorMsg('Could not load nearby places. Check your connection.');
          });
      },
      (err) => {
        setStatus('geo_error');
        setErrorMsg(
          err.code === 1
            ? 'Location permission denied. Enable it in your browser settings and try again.'
            : 'Unable to get your location. Please try again.'
        );
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  const filtered = filter === 'all' ? places
    : filter === 'hospital' ? places.filter(p => p.amenity === 'hospital')
    : filter === 'clinic'   ? places.filter(p => ['clinic','doctors','doctor','healthcare'].includes(p.amenity))
    : places.filter(p => p.amenity === 'pharmacy');

  const counts = {
    all: places.length,
    hospital: places.filter(p => p.amenity === 'hospital').length,
    clinic:   places.filter(p => ['clinic','doctors','doctor','healthcare'].includes(p.amenity)).length,
    pharmacy: places.filter(p => p.amenity === 'pharmacy').length,
  };

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-blue-800">🩺 Consult Your Nearest Doctor</h3>
          <p className="text-blue-700 text-sm mt-0.5">Real-time hospitals, clinics &amp; pharmacies near you.</p>
        </div>
        {(status === 'done' || status === 'api_error' || status === 'geo_error') && (
          <button
            onClick={locate}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-300 rounded-xl px-3 py-1.5 hover:bg-blue-100 transition-colors flex-shrink-0"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        )}
      </div>

      {/* ── IDLE ── */}
      {status === 'idle' && (
        <div className="mt-3 text-center py-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin size={30} className="text-blue-600" />
          </div>
          <p className="text-slate-600 text-sm mb-4 px-4">
            Allow location access to find doctors and hospitals near you.
          </p>
          <button
            onClick={locate}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 px-6 text-sm transition-colors"
          >
            <MapPin size={16} /> Find Nearby Doctors
          </button>
        </div>
      )}

      {/* ── LOCATING / LOADING ── */}
      {(status === 'locating' || status === 'loading') && (
        <div className="text-center py-8">
          <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm text-blue-700 font-medium">
            {status === 'locating' ? 'Getting your location…' : 'Searching nearby facilities…'}
          </p>
          {status === 'loading' && (
            <p className="text-xs text-blue-500 mt-1">Looking within 5 km radius</p>
          )}
        </div>
      )}

      {/* ── ERROR ── */}
      {(status === 'geo_error' || status === 'api_error') && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                {status === 'geo_error' ? 'Location Error' : 'Network Error'}
              </p>
              <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={locate}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-xl px-3 py-2 hover:bg-red-50 transition-colors"
          >
            <RefreshCw size={12} /> Try Again
          </button>
        </div>
      )}

      {/* ── RESULTS ── */}
      {status === 'done' && (
        <>
          <div className="flex items-center gap-2 mt-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-xs text-slate-600">
              Found <strong>{places.length}</strong> facilities within 5 km of your location.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {[
              { key: 'all',      label: 'All' },
              { key: 'hospital', label: '🏥 Hospitals' },
              { key: 'clinic',   label: '🩺 Clinics/Doctors' },
              { key: 'pharmacy', label: '💊 Pharmacies' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  'text-xs font-semibold px-3 py-1.5 rounded-full border transition-all',
                  filter === f.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                )}
              >
                {f.label}
                {counts[f.key] > 0 && (
                  <span className={clsx(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    filter === f.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  )}>{counts[f.key]}</span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Building2 size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No {filter === 'all' ? 'facilities' : filter + 's'} found nearby.</p>
              <button onClick={() => setFilter('all')} className="text-xs text-blue-600 mt-1 hover:underline">
                Show all categories
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-0.5">
              {filtered.map(place => (
                <DoctorCard key={place.id} place={place} />
              ))}
            </div>
          )}

          {userCoords && (
            <a
              href={`https://www.google.com/maps/search/hospital+clinic+doctor/@${userCoords.lat},${userCoords.lon},14z`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-xl py-2.5 px-4 hover:bg-blue-50 transition-colors"
            >
              <ExternalLink size={13} /> View All on Google Maps
            </a>
          )}
        </>
      )}

      {/* ── Emergency & portals (always visible) ── */}
      <div className="border-t border-blue-200 mt-5 pt-4 space-y-3">
        <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Emergency Helplines</p>
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:112"
            className="flex flex-col items-center justify-center gap-1 bg-red-100 border border-red-300 rounded-xl p-3 text-center hover:bg-red-200 transition-colors">
            <span className="text-xl font-black text-red-700">112</span>
            <span className="text-xs font-medium text-red-600">🚨 National Emergency</span>
          </a>
          <a href="tel:108"
            className="flex flex-col items-center justify-center gap-1 bg-orange-100 border border-orange-300 rounded-xl p-3 text-center hover:bg-orange-200 transition-colors">
            <span className="text-xl font-black text-orange-700">108</span>
            <span className="text-xs font-medium text-orange-600">🚑 Ambulance (EMRI)</span>
          </a>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
          ⚠ Chest pain · Difficulty breathing · Sudden weakness — go to the nearest Emergency Room or call 112.
        </div>
        <div className="flex flex-col gap-2">
          <a href="https://abdm.gov.in" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            🏥 ABDM / Ayushman Bharat — Find Govt. Hospital
          </a>
          <a href="https://www.aarogyasetu.gov.in" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            📱 Aarogya Setu — Find Nearby Clinics
          </a>
        </div>
        {onPrint && (
          <button
            onClick={onPrint}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            📋 Share / Print Summary for Doctor
          </button>
        )}
      </div>
    </div>
  );
}
