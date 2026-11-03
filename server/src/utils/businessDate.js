/**
 * Utility for Indian Standard Time (IST) 5:00 AM business day rollover
 */

/**
 * Returns the effective business date string (YYYY-MM-DD) in IST.
 * The business day rolls over to the next day every morning at 5:00 AM IST.
 * If the time is before 5:00 AM IST, it still belongs to the previous business date.
 */
function getBusinessDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  // Subtract 5 hours so that 5:00 AM IST becomes 00:00 IST of that calendar day,
  // and any time prior to 5:00 AM falls into the preceding calendar date.
  const effectiveDate = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(effectiveDate);
}

/**
 * Calculates current circular queue day (1 to totalDays)
 * starting from queueStartDateStr (Day 1) and rolling over at 5:00 AM IST every day.
 */
function calculateQueueDay(queueStartDateStr, totalDays, date = new Date()) {
  if (!totalDays || totalDays <= 0) return 1;
  const currentBusinessDateStr = getBusinessDateString(date);
  const startDateStr = queueStartDateStr || currentBusinessDateStr;

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [cy, cm, cd] = currentBusinessDateStr.split('-').map(Number);

  const startUtc = Date.UTC(sy, sm - 1, sd);
  const currentUtc = Date.UTC(cy, cm - 1, cd);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((currentUtc - startUtc) / msPerDay);

  if (diffDays < 0) {
    return 1;
  }

  return (diffDays % totalDays) + 1;
}

module.exports = {
  getBusinessDateString,
  calculateQueueDay
};
