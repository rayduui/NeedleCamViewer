export const parseTimestamp = (folderName) => {
  // Tesla format: YYYY-MM-DD_HH-MM-SS
  const match = folderName.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  return new Date();
};

export const getCameraFromFilename = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.includes('front')) return 'front';
  if (lower.includes('back')) return 'back';
  if (lower.includes('left')) return 'left';
  if (lower.includes('right')) return 'right';
  return null;
};

export const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
