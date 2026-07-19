import { restBandSec, restProgress, DEFAULT_REST_BAND_SEC } from '../restTimer';

describe('restBandSec', () => {
  it('gives heavy-compound groups 180s', () => {
    expect(restBandSec('Legs')).toBe(180);
    expect(restBandSec('Back')).toBe(180);
  });
  it('gives Arms 60s', () => {
    expect(restBandSec('Arms')).toBe(60);
  });
  it('defaults other groups to 90s', () => {
    expect(restBandSec('Chest')).toBe(90);
    expect(restBandSec('Shoulders')).toBe(90);
  });
  it('defaults missing category to 90s', () => {
    expect(restBandSec(undefined)).toBe(DEFAULT_REST_BAND_SEC);
    expect(restBandSec(null)).toBe(90);
  });
});

describe('restProgress', () => {
  const T0 = 1_000_000;
  it('starts at zero, not ready, full time remaining', () => {
    expect(restProgress(T0, 90, T0)).toEqual({ fraction: 0, ready: false, remainingSec: 90 });
  });
  it('reports halfway at half the band', () => {
    const p = restProgress(T0, 90, T0 + 45_000);
    expect(p.fraction).toBeCloseTo(0.5);
    expect(p.ready).toBe(false);
    expect(p.remainingSec).toBe(45);
  });
  it('is ready exactly at the band', () => {
    expect(restProgress(T0, 90, T0 + 90_000)).toEqual({ fraction: 1, ready: true, remainingSec: 0 });
  });
  it('clamps past the band (fraction never exceeds 1, remaining never negative)', () => {
    expect(restProgress(T0, 90, T0 + 300_000)).toEqual({ fraction: 1, ready: true, remainingSec: 0 });
  });
  it('treats a clock running behind startedAt as zero elapsed', () => {
    expect(restProgress(T0, 90, T0 - 5_000)).toEqual({ fraction: 0, ready: false, remainingSec: 90 });
  });
});
