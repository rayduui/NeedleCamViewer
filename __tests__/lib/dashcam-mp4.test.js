// Mock protobufjs since it fetches/parses .proto at runtime
jest.mock('protobufjs');

import { DashcamMP4, formatSeiData } from '@/lib/dashcam-mp4';

// Minimal valid ArrayBuffer for constructing DashcamMP4 without parsing
const emptyBuffer = new ArrayBuffer(0);

// ─────────────────────────────────────────────────
// DashcamMP4.concat (static utility)
// ─────────────────────────────────────────────────
describe('DashcamMP4.concat', () => {
  it('concatenates two Uint8Arrays', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    const result = DashcamMP4.concat(a, b);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it('concatenates more than two arrays', () => {
    const a = new Uint8Array([1]);
    const b = new Uint8Array([2, 3]);
    const c = new Uint8Array([4, 5, 6]);
    const result = DashcamMP4.concat(a, b, c);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it('handles empty arrays', () => {
    const result = DashcamMP4.concat(new Uint8Array([]), new Uint8Array([7]));
    expect(result).toEqual(new Uint8Array([7]));
  });

  it('returns an empty Uint8Array when given no arguments', () => {
    const result = DashcamMP4.concat();
    expect(result).toEqual(new Uint8Array([]));
  });
});

// ─────────────────────────────────────────────────
// DashcamMP4.stripEmulationBytes (instance method)
// ─────────────────────────────────────────────────
describe('DashcamMP4#stripEmulationBytes', () => {
  let mp4;
  beforeEach(() => {
    mp4 = new DashcamMP4(emptyBuffer);
  });

  it('removes H.264 emulation prevention byte 0x03 after two 0x00 bytes', () => {
    const input = new Uint8Array([0x00, 0x00, 0x03, 0x01]);
    const output = mp4.stripEmulationBytes(input);
    expect(output).toEqual(new Uint8Array([0x00, 0x00, 0x01]));
  });

  it('does not remove 0x03 when fewer than two preceding zeros', () => {
    const input = new Uint8Array([0x00, 0x03, 0x01]);
    const output = mp4.stripEmulationBytes(input);
    expect(output).toEqual(new Uint8Array([0x00, 0x03, 0x01]));
  });

  it('passes through data with no emulation bytes unchanged', () => {
    const input = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const output = mp4.stripEmulationBytes(input);
    expect(output).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
  });

  it('handles multiple emulation bytes in sequence', () => {
    const input = new Uint8Array([0x00, 0x00, 0x03, 0xFF, 0x00, 0x00, 0x03, 0x00]);
    const output = mp4.stripEmulationBytes(input);
    expect(output).toEqual(new Uint8Array([0x00, 0x00, 0xFF, 0x00, 0x00, 0x00]));
  });

  it('handles empty input', () => {
    const output = mp4.stripEmulationBytes(new Uint8Array([]));
    expect(output).toEqual(new Uint8Array([]));
  });
});

// ─────────────────────────────────────────────────
// formatSeiData
// ─────────────────────────────────────────────────
describe('formatSeiData', () => {
  it('returns null for null input', () => {
    expect(formatSeiData(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatSeiData(undefined)).toBeNull();
  });

  describe('speed conversion', () => {
    it('converts m/s to mph via camelCase field', () => {
      const result = formatSeiData({ vehicleSpeedMps: 10 });
      expect(result.speed).toBeCloseTo(22.3694, 2);
    });

    it('converts m/s to mph via snake_case field', () => {
      const result = formatSeiData({ vehicle_speed_mps: 20 });
      expect(result.speed).toBeCloseTo(44.7388, 2);
    });

    it('defaults speed to 0 when field is absent', () => {
      const result = formatSeiData({});
      expect(result.speed).toBe(0);
    });
  });

  describe('throttle', () => {
    it('reads accelerator pedal position via camelCase', () => {
      const result = formatSeiData({ acceleratorPedalPosition: 75 });
      expect(result.throttle).toBe(75);
    });

    it('reads accelerator pedal position via snake_case', () => {
      const result = formatSeiData({ accelerator_pedal_position: 50 });
      expect(result.throttle).toBe(50);
    });

    it('defaults throttle to 0 when absent', () => {
      const result = formatSeiData({});
      expect(result.throttle).toBe(0);
    });
  });

  describe('braking', () => {
    it('maps brakeApplied true → 100', () => {
      const result = formatSeiData({ brakeApplied: true });
      expect(result.braking).toBe(100);
    });

    it('maps brake_applied false → 0', () => {
      const result = formatSeiData({ brake_applied: false });
      expect(result.braking).toBe(0);
    });

    it('defaults braking to 0 when absent', () => {
      const result = formatSeiData({});
      expect(result.braking).toBe(0);
    });
  });

  describe('turn signals', () => {
    it('reads blinker_on_left', () => {
      expect(formatSeiData({ blinker_on_left: true }).leftSignal).toBe(true);
      expect(formatSeiData({ blinker_on_left: false }).leftSignal).toBe(false);
    });

    it('reads blinkerOnLeft (camelCase)', () => {
      expect(formatSeiData({ blinkerOnLeft: true }).leftSignal).toBe(true);
    });

    it('reads blinker_on_right', () => {
      expect(formatSeiData({ blinker_on_right: true }).rightSignal).toBe(true);
    });

    it('defaults signals to false when absent', () => {
      const result = formatSeiData({});
      expect(result.leftSignal).toBe(false);
      expect(result.rightSignal).toBe(false);
    });
  });

  describe('autopilot state', () => {
    it('autopilotState 0 → inactive, NONE', () => {
      const result = formatSeiData({ autopilotState: 0 });
      expect(result.autopilotActive).toBe(false);
      expect(result.autopilotState).toBe('NONE');
    });

    it('autopilotState 1 → active, SELF_DRIVING', () => {
      const result = formatSeiData({ autopilotState: 1 });
      expect(result.autopilotActive).toBe(true);
      expect(result.autopilotState).toBe('SELF_DRIVING');
    });

    it('autopilotState 2 → active, AUTOSTEER', () => {
      const result = formatSeiData({ autopilotState: 2 });
      expect(result.autopilotActive).toBe(true);
      expect(result.autopilotState).toBe('AUTOSTEER');
    });

    it('autopilotState 3 → active, TACC', () => {
      const result = formatSeiData({ autopilotState: 3 });
      expect(result.autopilotActive).toBe(true);
      expect(result.autopilotState).toBe('TACC');
    });

    it('reads autopilot_state (snake_case)', () => {
      const result = formatSeiData({ autopilot_state: 2 });
      expect(result.autopilotActive).toBe(true);
      expect(result.autopilotState).toBe('AUTOSTEER');
    });

    it('defaults to inactive NONE when field is absent', () => {
      const result = formatSeiData({});
      expect(result.autopilotActive).toBe(false);
      expect(result.autopilotState).toBe('NONE');
    });
  });

  describe('GPS fields', () => {
    it('reads latitude/longitude/heading via camelCase', () => {
      const result = formatSeiData({
        latitudeDeg: 37.7749,
        longitudeDeg: -122.4194,
        headingDeg: 180,
      });
      expect(result.latitude).toBe(37.7749);
      expect(result.longitude).toBe(-122.4194);
      expect(result.heading).toBe(180);
    });

    it('reads latitude/longitude/heading via snake_case', () => {
      const result = formatSeiData({
        latitude_deg: 51.5074,
        longitude_deg: -0.1278,
        heading_deg: 90,
      });
      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(-0.1278);
      expect(result.heading).toBe(90);
    });
  });

  describe('output shape', () => {
    it('always includes a raw field pointing to the original object', () => {
      const sei = { vehicleSpeedMps: 5 };
      const result = formatSeiData(sei);
      expect(result.raw).toBe(sei);
    });

    it('includes all expected keys', () => {
      const result = formatSeiData({});
      expect(result).toHaveProperty('speed');
      expect(result).toHaveProperty('throttle');
      expect(result).toHaveProperty('braking');
      expect(result).toHaveProperty('leftSignal');
      expect(result).toHaveProperty('rightSignal');
      expect(result).toHaveProperty('autopilotActive');
      expect(result).toHaveProperty('autopilotState');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('heading');
      expect(result).toHaveProperty('steeringAngle');
      expect(result).toHaveProperty('gearState');
      expect(result).toHaveProperty('frameSeqNo');
      expect(result).toHaveProperty('raw');
    });
  });
});
