import { supabase } from './supabaseService';

const STORAGE_BUCKET = 'exam-worksheets';

// SECURITY: Allowed file types and max size for worksheets
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Service voor het uploaden en beheren van uitwerkbijlagen (PDFs) in Supabase Storage
 */
export const worksheetStorage = {
  /**
   * Upload een uitwerkbijlage (PDF) naar Supabase Storage
   * @param file - Het PDF bestand
   * @param questionId - Optioneel: ID van de vraag om unieke naam te maken
   * @returns De publieke URL van de geüploade bijlage
   */
  async uploadWorksheet(file: File, questionId?: string): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd. Check je .env.local bestand.');
    }

    // SECURITY: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Bestand is te groot. Maximum grootte is 20MB.');
    }

    // SECURITY: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Ongeldig bestandstype. Alleen PDF en afbeeldingen (JPG, PNG, WebP, GIF) zijn toegestaan.');
    }

    // SECURITY: Validate file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      throw new Error('Ongeldige bestandsextensie. Alleen .pdf, .jpg, .jpeg, .png, .webp en .gif zijn toegestaan.');
    }

    // Genereer unieke bestandsnaam
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const safeExt = fileExt || 'pdf';
    const fileName = questionId
      ? `worksheet-${questionId}-${timestamp}.${safeExt}`
      : `worksheet-${timestamp}-${randomString}.${safeExt}`;

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
      throw new Error(`Fout bij uploaden bijlage: ${error.message}`);
    }

    // Haal de publieke URL op
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /**
   * Verwijder een uitwerkbijlage uit Supabase Storage
   * @param worksheetUrl - De URL van de bijlage
   */
  async deleteWorksheet(worksheetUrl: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Alleen verwijderen als het een Supabase Storage URL is
    if (!worksheetUrl.includes('/storage/v1/object/public/')) {
      return;
    }

    // Extract het pad uit de URL
    const urlParts = worksheetUrl.split('/storage/v1/object/public/');
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
   * Check of de storage bucket bestaat
   */
  async ensureBucketExists(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

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
        `6. Publiek: Ja (zodat bijlagen downloadbaar zijn)\n` +
        `7. Klik op "Create bucket"`
      );
    }
  },

  /**
   * Haal bestandsnaam uit URL voor weergave
   */
  getFileNameFromUrl(url: string): string {
    if (!url) return 'bijlage.pdf';
    const parts = url.split('/');
    return parts[parts.length - 1] || 'bijlage.pdf';
  }
};
