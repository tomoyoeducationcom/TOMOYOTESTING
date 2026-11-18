import { useEffect, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import { BranchLocation, INITIAL_BRANCHES } from '../lib/domain';

const MAPS_API_KEY = (
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
).trim();

function resolveBranchCoords(branch: BranchLocation): { lat: number; lng: number } {
  if (
    typeof branch.latitude === 'number' &&
    !Number.isNaN(branch.latitude) &&
    typeof branch.longitude === 'number' &&
    !Number.isNaN(branch.longitude)
  ) {
    return { lat: branch.latitude, lng: branch.longitude };
  }
  const fallback =
    INITIAL_BRANCHES.find((b) => b.slug === branch.slug || b.id === branch.id) ||
    INITIAL_BRANCHES[0];
  return {
    lat: fallback.latitude ?? -6.333158,
    lng: fallback.longitude ?? 108.341824,
  };
}

function CoordinateIframePreview({
  branch,
  lat,
  lng,
}: {
  branch: BranchLocation;
  lat: number;
  lng: number;
}) {
  return (
    <iframe
      title={`Peta Lokasi ${branch.name}`}
      src={`https://maps.google.com/maps?q=${lat},${lng}&hl=id&z=16&output=embed`}
      className="w-full h-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}

function InteractiveBranchMap({
  branch,
  lat,
  lng,
  quotaExceeded,
}: {
  branch: BranchLocation;
  lat: number;
  lng: number;
  quotaExceeded: boolean;
}) {
  const status = useApiLoadingStatus();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(false);

  if (
    quotaExceeded ||
    status === APILoadingStatus.AUTH_FAILURE ||
    status === APILoadingStatus.FAILED
  ) {
    return <CoordinateIframePreview branch={branch} lat={lat} lng={lng} />;
  }

  return (
    <GoogleMap
      mapId="DEMO_MAP_ID"
      defaultCenter={{ lat, lng }}
      center={{ lat, lng }}
      defaultZoom={16}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
    >
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        onClick={() => setInfoOpen(true)}
        title={branch.name}
      >
        <Pin background="#be123c" borderColor="#881337" glyphColor="#ffffff" />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={240}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="space-y-1 text-slate-900 pr-2">
            <p className="text-xs font-bold leading-snug">{branch.name}</p>
            <p className="text-[11px] text-slate-600 font-mono">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
            <a
              href={branch.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline pt-0.5"
            >
              <span>Buka Rute Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export function BranchMapPreview({ branch }: { branch: BranchLocation }) {
  const { lat, lng } = resolveBranchCoords(branch);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="w-full h-60 sm:h-64 rounded-2xl overflow-hidden border border-white/80 bg-slate-100/70 shadow-inner">
        {MAPS_API_KEY && !quotaExceeded ? (
          <APIProvider
            apiKey={MAPS_API_KEY}
            libraries={['marker']}
            language="id"
            region="ID"
          >
            <InteractiveBranchMap
              branch={branch}
              lat={lat}
              lng={lng}
              quotaExceeded={quotaExceeded}
            />
          </APIProvider>
        ) : (
          <CoordinateIframePreview branch={branch} lat={lat} lng={lng} />
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-500">
        <MapPin className="w-3.5 h-3.5 text-rose-700 shrink-0" />
        <span>
          Koordinat: {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
