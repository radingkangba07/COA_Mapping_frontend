import { useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { useAppStore } from '@/shared/store/app.store';
import { storageService } from '@/shared/services/storage/storage.service';
import { STORAGE_KEYS } from '@/shared/services/storage/storage.types';

export function ThemeSynchronizer({ isReady }: { isReady: boolean }): null {
  const theme = useAppStore((s) => s.theme);
  const { setColorScheme } = useColorScheme();

  // Sync Zustand theme → NativeWind color scheme (activates/deactivates .dark class)
  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  // Persist theme preference to storage (only after initial restore completes)
  useEffect(() => {
    if (!isReady) return;
    void storageService.set(STORAGE_KEYS.THEME, theme);
  }, [theme, isReady]);

  return null;
}
