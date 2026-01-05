import { useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from '@/store/configureStore';

// Use throughout your app instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export { useAppSelector as default };

