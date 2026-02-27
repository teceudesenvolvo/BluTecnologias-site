import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Prospect } from '../../services/firebase';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';

// Corrige o problema do ícone padrão do Leaflet que pode não aparecer corretamente com alguns bundlers.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GeocodedProspect extends Prospect {
  lat: number;
  lng: number;
}

interface ProspectsMapProps {
  prospects: Prospect[];
}

export const ProspectsMap: React.FC<ProspectsMapProps> = ({ prospects }) => {
  const [geocodedProspects, setGeocodedProspects] = useState<GeocodedProspect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const geocodeProspects = async () => {
      setLoading(true);
      const geocoded: GeocodedProspect[] = [];

      for (const prospect of prospects) {
        // Constrói um endereço mais completo para melhor geocodificação
        const address = `${prospect.endereco || ''}, ${prospect.municipio}, ${prospect.estado}, Brasil`;
        try {
          // NOTA: A API do Nominatim (OpenStreetMap) é gratuita mas tem uma política de uso estrita (máx 1 req/seg).
          // Para uma aplicação em produção, é altamente recomendável usar um serviço com chave de API 
          // (como Google Maps, Mapbox, etc.) e fazer as chamadas a partir de um backend (Cloud Function)
          // para proteger sua chave e gerenciar os custos.
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
          const data = await response.json();
          
          if (data && data.length > 0) {
            geocoded.push({
              ...prospect,
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
          }
        } catch (error) {
          console.error('Erro de geocodificação para:', address, error);
        }
        // Adiciona um pequeno delay para respeitar a política de uso da API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setGeocodedProspects(geocoded);
      setLoading(false);
    };

    if (prospects.length > 0) {
      geocodeProspects();
    } else {
      setLoading(false);
      setGeocodedProspects([]);
    }
  }, [prospects]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[600px] text-slate-500 bg-slate-50 rounded-2xl">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p className="font-medium">Geocodificando prospecções no mapa...</p>
        <p className="text-sm text-slate-400">Isso pode levar um momento.</p>
      </div>
    );
  }

  const center: L.LatLngExpression = geocodedProspects.length > 0
    ? [geocodedProspects.reduce((sum, p) => sum + p.lat, 0) / geocodedProspects.length, geocodedProspects.reduce((sum, p) => sum + p.lng, 0) / geocodedProspects.length]
    : [-14.235, -51.925]; // Centro do Brasil

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md">
      <MapContainer center={center} zoom={geocodedProspects.length > 0 ? 5 : 4} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geocodedProspects.map(prospect => (
          <Marker key={prospect.id} position={[prospect.lat, prospect.lng]}>
            <Popup>
              <div className="font-sans">
                <h4 className="font-bold text-base">{prospect.municipio} - {prospect.estado}</h4>
                <p className="text-sm capitalize">{prospect.tipoOrgao}</p>
                {prospect.visited && <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-1"><CheckCircle size={12}/> Visitado</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};