import { configureStore } from '@reduxjs/toolkit';
import ContestsReducer from './reducer/ContestsSlice';
export const store = configureStore({
  reducer: {
   contests: ContestsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
