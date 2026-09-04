import {
  serializeStructuredData,
  wayfareStructuredData,
} from '../lib/wayfare-structured-data';

export function WayfareStructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(wayfareStructuredData),
      }}
    />
  );
}
