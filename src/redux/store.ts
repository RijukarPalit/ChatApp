import { configureStore } from '@reduxjs/toolkit';
import { memeApi } from './services/memeApi';

export const store = configureStore({
  reducer: {
    [memeApi.reducerPath]: memeApi.reducer,
  },

  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(memeApi.middleware),
});