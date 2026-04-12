import {
  parseTimestamp,
  getCameraFromFilename,
  formatDate,
  formatTime,
  formatDuration,
} from '@/lib/helpers';

describe('parseTimestamp', () => {
  it('parses a valid Tesla timestamp folder name', () => {
    const date = parseTimestamp('2024-03-15_10-30-45');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(2); // 0-indexed
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
    expect(date.getSeconds()).toBe(45);
  });

  it('parses timestamp embedded in a longer folder name', () => {
    const date = parseTimestamp('2023-12-01_08-00-00-event');
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(11); // December is 11
    expect(date.getDate()).toBe(1);
  });

  it('returns a Date instance for unrecognized folder names', () => {
    const result = parseTimestamp('not-a-timestamp');
    expect(result).toBeInstanceOf(Date);
  });

  it('handles midnight correctly', () => {
    const date = parseTimestamp('2024-01-01_00-00-00');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });
});

describe('getCameraFromFilename', () => {
  it('identifies front camera', () => {
    expect(getCameraFromFilename('2024-01-01_front.mp4')).toBe('front');
    expect(getCameraFromFilename('FRONT_camera.mp4')).toBe('front');
  });

  it('identifies back camera', () => {
    expect(getCameraFromFilename('2024-01-01_back.mp4')).toBe('back');
  });

  it('identifies left camera', () => {
    expect(getCameraFromFilename('left_repeater.mp4')).toBe('left');
  });

  it('identifies right camera', () => {
    expect(getCameraFromFilename('right_repeater.mp4')).toBe('right');
  });

  it('returns null for unknown camera names', () => {
    expect(getCameraFromFilename('unknown.mp4')).toBeNull();
    expect(getCameraFromFilename('dashcam.mp4')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getCameraFromFilename('FRONT.mp4')).toBe('front');
    expect(getCameraFromFilename('LEFT_REPEATER.mp4')).toBe('left');
  });
});

describe('formatDate', () => {
  it('formats a date in en-US locale', () => {
    // Use a fixed date to avoid timezone-dependent failures
    const date = new Date(2024, 2, 15); // March 15, 2024
    const result = formatDate(date);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it('returns a string', () => {
    expect(typeof formatDate(new Date())).toBe('string');
  });
});

describe('formatTime', () => {
  it('returns a string with time parts', () => {
    const date = new Date(2024, 0, 1, 14, 5, 9); // 14:05:09
    const result = formatTime(date);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});

describe('formatDuration', () => {
  it('formats seconds into m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(59)).toBe('0:59');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(61.9)).toBe('1:01');
    expect(formatDuration(59.999)).toBe('0:59');
  });

  it('handles large values', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3661)).toBe('61:01');
  });
});
