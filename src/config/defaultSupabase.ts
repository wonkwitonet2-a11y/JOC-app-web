import { SupabaseConfig } from '../types';

/**
 * Konfigurasi bawaan Supabase permanen di aplikasi.
 * Setiap perangkat yang membuka link publish aplikasi akan otomatis langsung terhubung ke Supabase ini.
 * Dapat diputus atau dihubungkan kembali kapan saja melalui menu Pengaturan.
 */
export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  u: 'https://kntueymoxvmlntmpmmyj.supabase.co',
  k: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudHVleW1veHZtbG50bXBtbXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2OTQ0MDMsImV4cCI6MjEwNjI3MDQwM30.NeV28MsJ3dBBdPJEyHUEqI8mZ1mR7YUtvbvwelyOqYY',
  locked: true
};
