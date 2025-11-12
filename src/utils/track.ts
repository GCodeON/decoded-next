export const mstoSeconds = (duration: number): number => {
  return Math.round(duration / 1000);
};

export const cleanTrackName = (name: string): string => {
    return name.replace(/&/g, 'and').split('(')[0].trim();
};