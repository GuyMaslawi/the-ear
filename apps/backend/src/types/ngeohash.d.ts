declare module 'ngeohash' {
  export function encode(
    latitude: number,
    longitude: number,
    precision?: number,
  ): string;
  export function decode(hash: string): {
    latitude: number;
    longitude: number;
  };
}
