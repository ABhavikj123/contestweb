declare module 'youtube-search-api' {
    interface Thumbnail {
      url: string;
      width: number;
      height: number;
    }
  
    interface Snippet {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: {
        default: Thumbnail;
        medium: Thumbnail;
        high: Thumbnail;
      };
      channelTitle: string;
      liveBroadcastContent: string;
      publishTime: string;
    }
  
    interface Id {
      kind: string;
      videoId: string;
    }
  
    interface SearchResult {
      kind: string;
      etag: string;
      id: Id;
      snippet: Snippet;
    }
  
    interface SearchResponse {
      kind: string;
      etag: string;
      nextPageToken?: string;
      regionCode: string;
      pageInfo: {
        totalResults: number;
        resultsPerPage: number;
      };
      items: SearchResult[];
    }
  
    function GetListByKeyword(
      keyword: string,
      playlist: boolean,
      limit: number,
      callback: (err: any, data: SearchResponse) => void
    ): void;
  }