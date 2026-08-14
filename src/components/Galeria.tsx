import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GalleryPhoto {
  src: string;
  caption: string;
  featured?: boolean;
}

interface GallerySection {
  id: string;
  role?: string;
  institution?: string;
  photos: GalleryPhoto[];
}

const loosePhotos: GalleryPhoto[] = Array.from({ length: 14 }, (_, i) => ({
  src: `/galeria/representante/${i + 1}.jpg`,
  caption: '',
  featured: [1, 5, 10, 13].includes(i + 1),
}));

const corantioquiaPhotos: GalleryPhoto[] = Array.from({ length: 22 }, (_, i) => ({
  src: `/galeria/corantioquia/${i + 1}.jpg`,
  caption: '',
  featured: [1, 4, 8, 12, 16, 20].includes(i + 1),
}));

const asambleaPhotos: GalleryPhoto[] = Array.from({ length: 22 }, (_, i) => ({
  src: `/galeria/asamblea/${i + 1}.jpg`,
  caption: '',
  featured: [1, 6, 11, 16, 20].includes(i + 1),
}));

const sections: GallerySection[] = [
  { id: 'recientes', photos: loosePhotos },
  {
    id: 'corantioquia',
    role: 'Directora General',
    institution: 'Corantioquia',
    photos: corantioquiaPhotos,
  },
  {
    id: 'asamblea',
    role: 'Diputada',
    institution: 'Asamblea Departamental de Antioquia',
    photos: asambleaPhotos,
  },
];

export default function Galeria() {
  const [lightbox, setLightbox] = React.useState<{
    sectionIdx: number;
    photoIdx: number;
  } | null>(null);

  const allPhotos = React.useMemo(() => {
    const result: { sectionIdx: number; photoIdx: number }[] = [];
    sections.forEach((sec, si) => {
      sec.photos.forEach((_, pi) => {
        result.push({ sectionIdx: si, photoIdx: pi });
      });
    });
    return result;
  }, []);

  const currentPos = lightbox
    ? allPhotos.findIndex(
        (p) => p.sectionIdx === lightbox.sectionIdx && p.photoIdx === lightbox.photoIdx
      )
    : -1;

  const goNext = () => {
    if (currentPos < allPhotos.length - 1) {
      allPhotos[currentPos + 1];
      setLightbox(allPhotos[currentPos + 1]);
    }
  };

  const goPrev = () => {
    if (currentPos > 0) {
      setLightbox(allPhotos[currentPos - 1]);
    }
  };

  React.useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, currentPos]);

  const currentPhoto =
    lightbox !== null
      ? sections[lightbox.sectionIdx].photos[lightbox.photoIdx]
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-ant-blue-dark sm:text-4xl">
          Galería
        </h2>
        <p className="text-gray-500 mt-3 text-base font-sans">
          Archivo fotográfico de la trayectoria institucional de Ana Ligia Mora Martínez.
        </p>
      </div>

      <div className="space-y-16">
        {sections.map((section, sIdx) => (
          <section key={section.id}>
            {section.role && (
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-ant-blue font-serif">
                  {section.role}
                </h3>
                <p className="text-sm text-gray-500 font-sans mt-1">
                  {section.institution}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
              {section.photos.map((photo, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => setLightbox({ sectionIdx: sIdx, photoIdx: pIdx })}
                  className={`group relative overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ant-blue ${
                    photo.featured ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  <img
                    src={photo.src}
                    alt={`Foto ${pIdx + 1}`}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white text-left">{photo.caption}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {lightbox && currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white z-10"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>

          {currentPos > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white z-10"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {currentPos < allPhotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white z-10"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div
            className="max-w-5xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto.src}
              alt={`Foto ${lightbox.photoIdx + 1}`}
              className="max-w-full max-h-[75vh] object-contain"
            />
            {currentPhoto.caption && (
              <p className="text-white/80 text-sm mt-4 text-center max-w-lg">
                {currentPhoto.caption}
              </p>
            )}
            <p className="text-white/40 text-xs mt-2">
              {lightbox.sectionIdx + 1}.{lightbox.photoIdx + 1} de {allPhotos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
