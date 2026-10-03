'use dom';

/**
 * The in-app map: every glimpse is a colored dot on a world map (no external map apps).
 * Written as an Expo "DOM component": on the web it renders directly,
 * and on iPhone/Android Expo runs it inside a web view — so one Leaflet map works everywhere.
 *
 * Map tiles: OpenStreetMap's standard tiles (free, no API key; attribution required), shown
 * in soft grayscale so the colored dots stand out. OSM's tile policy allows interactive use
 * like this, but not heavy traffic — before a public launch, switch TILE_URL to a tile
 * provider plan (e.g. MapTiler, Stadia Maps or Protomaps) and keep the attribution.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
/**
 * Each dot has its own color (yours = blue, kept = pink-red, others = the Hour Light of when they
 * were taken). `weight` decides which color a group of overlapping dots takes: the most personal.
 * `thumb` is a small version of the photo: once you zoom in to street level, dots turn into photos.
 */
export type MapMarker = { id: string; lat: number; lng: number; label: string; color: string; weight: number; thumb?: string };
export type MapTarget = { lat: number; lng: number; zoom: number; nonce: number };

type Props = {
  markers: MapMarker[];
  selectedId: string | null;
  /** Change `nonce` to fly the map to a new spot. */
  target: MapTarget | null;
  me: { lat: number; lng: number } | null;
  /** Change to re-frame the map around all markers (e.g. after switching My map / Everyone). */
  frameKey?: string;
  onSelect: (id: string | null) => void;
  /** How far in the first framing may zoom (world map: 3; a city: street level). */
  fitMaxZoom?: number;
  /** Zoom from which dots turn into photos (a city page shows photos right away). */
  photoZoom?: number;
  /** Two-finger scroll zooms the map. Off when the map sits inside a scrolling page: then a scroll
   *  scrolls the page and only a pinch (or the +/− buttons) zooms. */
  wheelZoom?: boolean;
  // Passed through by Expo to the native web view (size, etc).
  dom?: import('expo/dom').DOMProps;
};

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
const CLUSTER_PX = 22;
/** From this zoom on (a neighborhood), dots become the photos themselves. */
const PHOTO_ZOOM = 13;
/** Photo tiles are bigger than dots, so they group from further apart. */
const PHOTO_CLUSTER_PX = 50;
/** Tapping a lone dot from far away flies down to street level. */
const STREET_ZOOM = 16;
const ACCENT = '#2F6BFF';
const esc = (v: string) => v.replace(/["<>&]/g, '');

const CSS = `
.g-map { position:absolute; inset:0; z-index:0; isolation:isolate; background:#D3D6D8; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
.g-map .leaflet-control-attribution { font-size:9px; background:rgba(255,255,255,.75); }
/* Calm, light basemap: desaturate the colorful OSM style so the dots carry the color. */
.g-map .leaflet-tile-pane { filter: grayscale(1) brightness(1.06) contrast(0.88); }
.g-map .leaflet-control-zoom { display:none; }
.g-dot { width:14px; height:14px; border-radius:50%; border:2.5px solid #fff; box-sizing:border-box;
  box-shadow:0 1px 4px rgba(0,0,0,.35); transition:transform .15s ease; }
.g-dot.sel { transform:scale(1.6); box-shadow:0 0 0 6px rgba(47,107,255,.22), 0 1px 4px rgba(0,0,0,.35); }
.g-cluster { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:max-content; white-space:nowrap;
  min-width:26px; height:26px; padding:0 7px; border-radius:13px; border:2.5px solid #fff; box-sizing:border-box;
  color:#111418; background:#fff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,.3); }
.g-cluster i { flex-shrink:0; display:inline-block; width:8px; height:8px; border-radius:4px; margin-right:4px; }
.g-cluster.sel { box-shadow:0 0 0 6px rgba(47,107,255,.22), 0 2px 6px rgba(0,0,0,.3); }
.g-me { width:18px; height:18px; border-radius:9px; background:${ACCENT}; border:3px solid #fff;
  box-shadow:0 0 0 8px rgba(47,107,255,.18), 0 2px 6px rgba(0,0,0,.3); box-sizing:border-box; }

/* Street level: each place shows its photo. Tiles pop up (spring), nearest to the center first. */
.g-photo { position:absolute; left:0; bottom:0; width:48px; height:48px; transform-origin:50% 100%;
  transition:transform .18s ease; }
.g-photo .card { position:absolute; inset:0; border-radius:12px; border:2.5px solid #fff; box-sizing:border-box;
  background:#E3E5E8 center/cover no-repeat; box-shadow:0 3px 10px rgba(17,20,24,.28), 0 0 0 2px var(--ring); }
.g-photo .tip { position:absolute; left:50%; bottom:-6px; width:10px; height:10px; margin-left:-5px; background:#fff;
  transform:rotate(45deg); border-radius:2px; box-shadow:2px 2px 3px rgba(17,20,24,.12); }
.g-photo .stack { position:absolute; inset:0; border-radius:12px; background:#fff; border:2.5px solid #fff; box-sizing:border-box;
  box-shadow:0 2px 6px rgba(17,20,24,.2); }
.g-photo .stack.s1 { transform:translate(5px,-5px) rotate(6deg); }
.g-photo .stack.s2 { transform:translate(-4px,-3px) rotate(-5deg); }
.g-photo .n { position:absolute; right:-8px; top:-8px; min-width:20px; height:20px; padding:0 5px; border-radius:10px;
  background:#111418; color:#fff; font-size:11px; font-weight:700; line-height:20px; text-align:center; box-sizing:border-box;
  border:2px solid #fff; }
.g-photo.hide { transform:scale(0); }
.g-photo.pop { animation:g-pop .55s cubic-bezier(.34,1.56,.64,1) both; animation-delay:var(--d,0ms); }
.g-photo.sel { transform:scale(1.28); z-index:2; }
.g-photo.sel .card { box-shadow:0 6px 18px rgba(17,20,24,.35), 0 0 0 3px ${ACCENT}; }
@keyframes g-pop { 0% { transform:scale(0) translateY(10px); opacity:0 } 60% { opacity:1 } 100% { transform:scale(1) translateY(0); opacity:1 } }
/* Dots fade in too, and the selected one breathes. */
.g-dot.pop, .g-cluster.pop { animation:g-dot .35s cubic-bezier(.34,1.56,.64,1) both; animation-delay:var(--d,0ms); }
@keyframes g-dot { from { transform:scale(0) } to { transform:scale(1) } }
.g-cluster.pop { animation-name:g-dot-c; }
@keyframes g-dot-c { from { transform:translate(-50%,-50%) scale(0) } to { transform:translate(-50%,-50%) scale(1) } }
.g-ripple { position:absolute; left:50%; top:50%; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%;
  background:var(--c); opacity:.5; animation:g-ripple 1.8s ease-out infinite; pointer-events:none; }
@keyframes g-ripple { from { transform:scale(1); opacity:.45 } to { transform:scale(4.2); opacity:0 } }
.g-me::after { content:''; position:absolute; inset:-3px; border-radius:50%; background:${ACCENT};
  animation:g-ripple 2.4s ease-out infinite; z-index:-1; }
.g-me { position:relative; }
.g-zoom { position:absolute; right:12px; top:50%; transform:translateY(-50%); z-index:5; display:flex; flex-direction:column; border-radius:12px;
  overflow:hidden; background:#fff; box-shadow:0 2px 10px rgba(17,20,24,.18); }
.g-zoom button { width:38px; height:38px; border:0; background:#fff; color:#111418; font-size:22px; line-height:38px; padding:0;
  cursor:pointer; font-family:inherit; }
.g-zoom button + button { border-top:1px solid #E3E5E8; }
.g-zoom button:active { background:#F2F3F5; }
@media (prefers-reduced-motion: reduce) { .g-photo.pop, .g-dot.pop, .g-cluster.pop { animation:none } .g-ripple, .g-me::after { display:none } }
`;

export default function PhotoMap({ markers, selectedId, target, me, onSelect, frameKey, fitMaxZoom = 3, photoZoom = PHOTO_ZOOM, wheelZoom = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.Marker | null>(null);
  const fitted = useRef(false);
  const everFitted = useRef(false);
  const pendingFit = useRef<{ bounds: L.LatLngBounds; maxZoom: number } | null>(null);
  const lastFrameKey = useRef(frameKey);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      worldCopyJump: true,
      attributionControl: true,
      // Don't let people drag past the top/bottom of the world into empty space.
      maxBounds: L.latLngBounds([-85, -540], [85, 540]),
      maxBoundsViscosity: 1,
      // Two-finger trackpad scrolls and pinches zoom smoothly, in small steps.
      scrollWheelZoom: wheelZoom,
      zoomSnap: 0.25,
      wheelPxPerZoomLevel: 70,
      wheelDebounceTime: 20,
    }).setView([30, 0], 2);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.on('click', () => onSelectRef.current(null));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    // Zoomed all the way out, the whole world fits the phone's width (zoom 1). On a tall
    // screen that leaves space above and below — the background is tinted to match the sea.
    const fitWorld = () => {
      const w = el.current?.clientWidth ?? 0;
      if (!w) return;
      m.setMinZoom(w > 700 ? 2 : 1);
    };
    fitWorld();
    // The container can resize after mount (tabs, phone frame) — keep tiles filling it,
    // and finish a framing that was asked for before the map had a size.
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      fitWorld();
      if (pendingFit.current && m.getSize().x > 0 && m.getSize().y > 0) {
        const { bounds, maxZoom } = pendingFit.current;
        pendingFit.current = null;
        m.fitBounds(bounds, { maxZoom, animate: false });
      }
    });
    ro.observe(el.current);

    // Safari turns a trackpad pinch into "gesture" events instead of ctrl+wheel; zoom on those too.
    const host = el.current;
    let pinchFrom = 0;
    const gStart = (e: Event) => {
      e.preventDefault();
      pinchFrom = m.getZoom();
    };
    const gChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      const z = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), pinchFrom + Math.log2(g.scale || 1)));
      const r = host.getBoundingClientRect();
      m.setZoomAround(L.point(g.clientX - r.left, g.clientY - r.top), z, { animate: false });
    };
    const gEnd = (e: Event) => e.preventDefault();
    host.addEventListener('gesturestart', gStart);
    host.addEventListener('gesturechange', gChange);
    host.addEventListener('gestureend', gEnd);

    // When the map sits inside a scrolling page (wheelZoom off), a two-finger scroll scrolls the
    // page, and only a pinch zooms. Chrome, Edge and Firefox report a trackpad pinch as a wheel
    // event with ctrlKey set; zoom on those (and stop the browser zooming the whole page).
    let pinchTarget: number | null = null;
    let pinchIdle: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (wheelZoom || !e.ctrlKey) return; // plain scroll: let the page scroll
      e.preventDefault();
      const r = host.getBoundingClientRect();
      pinchTarget = Math.max(m.getMinZoom(), Math.min(m.getMaxZoom(), (pinchTarget ?? m.getZoom()) - e.deltaY * 0.012));
      m.setZoomAround(L.point(e.clientX - r.left, e.clientY - r.top), pinchTarget, { animate: false });
      clearTimeout(pinchIdle);
      pinchIdle = setTimeout(() => (pinchTarget = null), 250);
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      host.removeEventListener('gesturestart', gStart);
      host.removeEventListener('gesturechange', gChange);
      host.removeEventListener('gestureend', gEnd);
      host.removeEventListener('wheel', onWheel);
      clearTimeout(pinchIdle);
      ro.disconnect();
      m.remove();
      map.current = null;
    };
    // The map is created once; later prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw markers, grouping ones that would overlap at the current zoom.
  // Zoomed out: colored dots. Street level: the photos themselves pop up out of the map.
  const popped = useRef(new Set<string>());
  const wasPhotos = useRef(false);
  useEffect(() => {
    const m = map.current;
    if (!m || !layer.current) return;
    let pending: { key: string; el: HTMLElement; latlng: L.LatLng }[] = [];

    // Animate the markers that are on screen and haven't appeared yet — nearest the center first,
    // so the photos seem to spill out of the place you zoomed into.
    const reveal = () => {
      const bounds = m.getBounds().pad(0.05);
      const center = m.latLngToContainerPoint(m.getCenter());
      const due = pending.filter((p) => bounds.contains(p.latlng) && !popped.current.has(p.key));
      due
        .map((p) => ({ p, d: m.latLngToContainerPoint(p.latlng).distanceTo(center) }))
        .sort((x, y) => x.d - y.d)
        .forEach(({ p }, i) => {
          popped.current.add(p.key);
          p.el.style.setProperty('--d', `${Math.min(i * 45, 600)}ms`);
          p.el.classList.remove('hide');
          p.el.classList.add('pop');
        });
      pending = pending.filter((p) => !popped.current.has(p.key));
    };

    const draw = () => {
      const group = layer.current!;
      group.clearLayers();
      pending = [];
      const photos = m.getZoom() >= photoZoom;
      // Crossing into (or out of) street level replays the reveal.
      if (photos !== wasPhotos.current) popped.current.clear();
      wasPhotos.current = photos;
      const radius = photos ? PHOTO_CLUSTER_PX : CLUSTER_PX;

      const clusters: { pt: L.Point; items: MapMarker[] }[] = [];
      for (const mk of markers) {
        const pt = m.latLngToLayerPoint([mk.lat, mk.lng]);
        const near = clusters.find((c) => c.pt.distanceTo(pt) < radius);
        if (near) near.items.push(mk);
        else clusters.push({ pt, items: [mk] });
      }
      for (const c of clusters) {
        const first = c.items.find((i) => i.id === selectedId) ?? c.items[0];
        const selected = c.items.some((i) => i.id === selectedId);
        // A group shows the color of its most personal dot: yours, then kept, then others.
        const lead = c.items.reduce((best, i) => (i.weight > best.weight ? i : best), c.items[0]);
        const color = lead.color;
        const single = c.items.length === 1;
        const key = (photos ? 'p:' : 'd:') + c.items.map((i) => i.id).sort().join(',');
        const fresh = !popped.current.has(key);
        let icon: L.DivIcon;
        if (photos) {
          const face = selected ? first : lead;
          const img = face.thumb ? `background-image:url("${esc(face.thumb)}")` : `background:${color}`;
          const stack = single ? '' : '<div class="stack s1"></div><div class="stack s2"></div>';
          const count = single ? '' : `<div class="n">${c.items.length}</div>`;
          const html = `<div class="g-photo${selected ? ' sel' : ''}${fresh ? ' hide' : ''}" style="--ring:${color}">${stack}<div class="card" style='${img}'></div><div class="tip"></div>${count}</div>`;
          icon = L.divIcon({ html, className: '', iconSize: [48, 54], iconAnchor: [24, 54] });
        } else {
          const ripple = selected ? `<div class="g-ripple" style="--c:${color}"></div>` : '';
          const html = single
            ? `${ripple}<div class="g-dot${selected ? ' sel' : ''}" style="background:${color}"></div>`
            : `<div class="g-cluster${selected ? ' sel' : ''}"><i style="background:${color}"></i>${c.items.length}</div>`;
          const size = single ? 14 : 26;
          icon = L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
        }
        const marker = L.marker([first.lat, first.lng], { icon, title: first.label, zIndexOffset: selected ? 1000 : 0, riseOnHover: photos });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          const zoom = m.getZoom();
          const pts = c.items.map((i) => L.latLng(i.lat, i.lng));
          const spread = L.latLngBounds(pts);
          const tight = spread.getNorthEast().distanceTo(spread.getSouthWest()) < 30; // metres
          if (zoom < photoZoom) {
            // From far away, any tap dives down to street level, where the photos are.
            if (single || tight) {
              onSelectRef.current(first.id);
              m.flyTo([first.lat, first.lng], STREET_ZOOM, { duration: 1.1 });
            } else {
              m.flyToBounds(spread.pad(0.5), { maxZoom: STREET_ZOOM, duration: 1 });
            }
          } else if (!single && !tight && zoom < 18) {
            // A pile of photos: spread it out.
            m.flyToBounds(spread.pad(0.5), { maxZoom: Math.min(zoom + 3, 19), duration: 0.7 });
          } else {
            onSelectRef.current(first.id);
            m.panTo([first.lat, first.lng], { animate: true, duration: 0.4 });
          }
        });
        group.addLayer(marker);
        const el = (marker.getElement()?.firstElementChild as HTMLElement | null) ?? null;
        if (el && fresh && photos) pending.push({ key, el, latlng: L.latLng(first.lat, first.lng) });
        else popped.current.add(key);
      }
      reveal();
    };

    draw();
    // A pinch fires many small zooms; regroup once it settles.
    let t: ReturnType<typeof setTimeout> | undefined;
    const redraw = () => {
      clearTimeout(t);
      t = setTimeout(draw, 90);
    };
    m.on('zoomend', redraw);
    m.on('moveend', reveal);

    // Re-frame when the set of dots changes meaning (My map ↔ Everyone).
    if (lastFrameKey.current !== frameKey) {
      lastFrameKey.current = frameKey;
      fitted.current = false;
    }
    // First time we get photos, frame them all (later re-framings glide there).
    if (!fitted.current && markers.length > 0) {
      const first = !everFitted.current;
      fitted.current = true;
      everFitted.current = true;
      const b = L.latLngBounds(markers.map((mk) => [mk.lat, mk.lng] as [number, number])).pad(0.3);
      const size = m.getSize();
      // Before the map has a size, Leaflet would zoom all the way in; wait for the real size.
      if (!size.x || !size.y) pendingFit.current = { bounds: b, maxZoom: fitMaxZoom };
      else if (first) m.fitBounds(b, { maxZoom: fitMaxZoom, animate: false });
      else m.flyToBounds(b, { maxZoom: fitMaxZoom, duration: 0.8 });
    }
    return () => {
      clearTimeout(t);
      m.off('zoomend', redraw);
      m.off('moveend', reveal);
    };
  }, [markers, selectedId, frameKey, fitMaxZoom, photoZoom]);

  // Fly somewhere when asked (e.g. "Near me").
  useEffect(() => {
    if (!map.current || !target) return;
    fitted.current = true;
    map.current.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
  }, [target]);

  // Your location dot.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    meLayer.current?.remove();
    meLayer.current = null;
    if (me) {
      const icon = L.divIcon({ html: '<div class="g-me"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
      meLayer.current = L.marker([me.lat, me.lng], { icon, interactive: false, zIndexOffset: 2000 }).addTo(m);
    }
  }, [me]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{CSS}</style>
      <div ref={el} className="g-map" />
      <div className="g-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => map.current?.zoomIn(1)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => map.current?.zoomOut(1)}>−</button>
      </div>
    </div>
  );
}
