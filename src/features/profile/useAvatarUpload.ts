import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

/**
 * Uploads to the `avatars` bucket under `${user_id}/avatar.<ext>` (see
 * migration 0004) so the storage RLS policy — which trusts the first path
 * segment as the owner — actually matches the real owner. `upsert: true`
 * means re-uploading always overwrites the same object instead of piling up
 * old avatars per user.
 */
export function useAvatarUpload() {
  const { session, refreshProfile } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!session?.user) throw new Error(tr('You are not logged in', 'লগইন করা নেই'));
      if (file.size > MAX_SIZE_BYTES) throw new Error(tr('Image size cannot exceed 2MB', 'ছবির সাইজ ২MB এর বেশি হতে পারবে না'));
      if (!file.type.startsWith('image/')) throw new Error(tr('Only image files can be uploaded', 'শুধু ছবি ফাইল আপলোড করা যাবে'));

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${session.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // cache-bust: the object path is stable across re-uploads, so without
      // this the <img> tag would keep showing the old cached image
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', session.user.id);
      if (updateError) throw updateError;

      return avatarUrl;
    },
    onSuccess: async () => {
      toast.success(tr('Profile photo updated', 'প্রোফাইল ছবি আপডেট হয়েছে'));
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not upload the image', 'ছবি আপলোড করা যায়নি')),
  });
}
