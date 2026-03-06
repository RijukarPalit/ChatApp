import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export type MemeResponse = {
  title: string;
  url: string;
  preview?: string[];
};

export type MemeViewModel = MemeResponse & {
  optimizedUrl: string;
};

export const memeApi = createApi({
  reducerPath: 'memeApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://meme-api.com/',
  }),

  endpoints: builder => ({
    getMeme: builder.query<MemeViewModel, void>({
      query: () => 'gimme',
      transformResponse: (response: MemeResponse) => {
        console.log('response', response);
        const previewList = response.preview ?? [];
        // Prefer a smaller preview to reduce image download time on mobile.
        const optimizedUrl = previewList.length > 0 ? previewList[0] : response.url;
        return { ...response, optimizedUrl };
      },
    }),
  }),
});

export const { useLazyGetMemeQuery } = memeApi;
