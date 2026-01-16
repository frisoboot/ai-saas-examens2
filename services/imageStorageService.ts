import { supabase } from './supabaseService';

const STORAGE_BUCKET = 'exam-image';

// SECURITY: Allowed file types and max size
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Service voor het uploaden en beheren van afbeeldingen in Supabase Storage
 */
export const imageStorage = {
  /**
   * Upload een afbeelding naar Supabase Storage
   * @param file - Het afbeeldingsbestand
   * @param questionId - Optioneel: ID van de vraag om unieke naam te maken
   * @returns De publieke URL van de geüploade afbeelding
   */
  async uploadImage(file: File, questionId?: string): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd. Check je .env.local bestand.');
    }

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Bestand is te groot. Maximum grootte is 5MB.');
    }

    // SECURITY: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Ongeldig bestandstype. Alleen JPG, PNG, WebP en GIF zijn toegestaan.');
    }

    // SECURITY: Validate file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      throw new Error('Ongeldige bestandsextensie. Alleen jpg, jpeg, png, webp en gif zijn toegestaan.');
    }

    // Genereer unieke bestandsnaam
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const safeExt = fileExt || 'jpg';
    const fileName = questionId
      ? `${questionId}-${timestamp}.${safeExt}`
      : `question-${timestamp}-${randomString}.${safeExt}`;

    // Upload naar Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Fout bij uploaden afbeelding: ${error.message}`);
    }

    // Haal de publieke URL op
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /**
   * Verwijder een afbeelding uit Supabase Storage
   * @param imageUrl - De URL van de afbeelding
   */
  async deleteImage(imageUrl: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Alleen verwijderen als het een Supabase Storage URL is
    if (!imageUrl.includes('/storage/v1/object/public/')) {
      // Dit is geen Supabase Storage URL (bijv. een base64 string of externe URL)
      return;
    }

    // Extract het pad uit de URL
    const urlParts = imageUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) return;

    const pathParts = urlParts[1].split('/');
    if (pathParts.length < 2) return;

    const bucket = pathParts[0];
    const filePath = pathParts.slice(1).join('/');

    // Verwijder het bestand
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      // Niet gooien - het bestand bestaat misschien niet meer
    }
  },

  /**
   * Check of de storage bucket bestaat en maak deze aan indien nodig
   * Deze functie moet worden aangeroepen tijdens de initiële setup
   */
  async ensureBucketExists(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Probeer een test bestand te uploaden om te kijken of bucket bestaat
    // Als dit faalt met een 404, dan bestaat de bucket niet
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Kan buckets niet ophalen:', error);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      throw new Error(
        `Storage bucket '${STORAGE_BUCKET}' bestaat nog niet.\n\n` +
        `Volg deze stappen:\n` +
        `1. Ga naar je Supabase dashboard (https://app.supabase.com)\n` +
        `2. Selecteer je project\n` +
        `3. Ga naar "Storage" in het menu\n` +
        `4. Klik op "New bucket"\n` +
        `5. Naam: ${STORAGE_BUCKET}\n` +
        `6. Publiek: Ja (zodat afbeeldingen zichtbaar zijn)\n` +
        `7. Klik op "Create bucket"`
      );
    }
  },

  /**
   * Check of een URL een base64 gecodeerde afbeelding is
   */
  isBase64Image(url: string): boolean {
    return url.startsWith('data:image/');
  },

  /**
   * Converteer een base64 image naar een File object
   */
  base64ToFile(base64String: string, fileName: string = 'image.jpg'): File {
    // Extract de data
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], fileName, { type: mime });
  },

  /**
   * Migreer een base64 afbeelding naar Supabase Storage
   * Handig voor het migreren van bestaande vragen
   */
  async migrateBase64ToStorage(base64Image: string, questionId: string): Promise<string> {
    if (!this.isBase64Image(base64Image)) {
      return base64Image; // Geen base64, return as-is
    }

    // Converteer base64 naar File
    const file = this.base64ToFile(base64Image, `migrated-${questionId}.jpg`);

    // Upload naar storage
    return await this.uploadImage(file, questionId);
  }
};
