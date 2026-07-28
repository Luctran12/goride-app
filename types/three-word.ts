export type Coordinate = {
  lat: number;
  lng: number;
};

export type ThreeWordBounds = {
  southwest: Coordinate;
  northeast: Coordinate;
};

export type ThreeWordLocation = {
  lat: number;
  lng: number;
  words: string[];
  wordAddress: string;
  bounds: ThreeWordBounds;
};

export type ApiResponseThreeWordLocation = {
  success?: boolean;
  data?: ThreeWordLocation;
  message?: string;
  timestamp?: string;
};
