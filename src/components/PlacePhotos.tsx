// Mekan fotoğrafları (sunucu önbelleğinden gelen kalıcı URL'ler). Yoksa hiçbir şey çizmez.
export function PlacePhotos({ photos, alt }: { photos?: string[]; alt: string }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div className="-mx-4 -mt-4 mb-3 flex gap-1 overflow-hidden rounded-t-2xl" data-testid="place-photos">
      {photos.slice(0, 3).map((url, i) => (
        <img key={url} src={url} alt={i === 0 ? alt : ""} loading="lazy" className="h-32 min-w-0 flex-1 object-cover" />
      ))}
    </div>
  );
}
