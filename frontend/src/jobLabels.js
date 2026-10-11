// Keep API values as keys and Finnish display names as labels.
// Shared labels keep forms and job lists consistent.
export const statusLabels = {
  interested: 'Kiinnostava',
  applied: 'Haettu',
  interview: 'Haastattelu',
  offer: 'Tarjous',
  rejected: 'Hylätty',
}

// Priority tells the user which jobs to focus on first.
export const priorityLabels = {
  high: 'Korkea',
  normal: 'Normaali',
  low: 'Matala',
}

// Match level describes how well the user's skills fit the job.
export const matchLevelLabels = {
  // HTML select values are strings; the form converts this empty value to null.
  '': 'Ei arvioitu',
  strong: 'Vahva vastaavuus',
  partial: 'Osittainen vastaavuus',
  stretch: 'Stretch',
}
