import {
  statusLabels,
  priorityLabels,
  matchLevelLabels,
} from './jobLabels'

// Use one list to render inputs that share the same layout.
// Browser checks help the user, but the backend must also validate the data.
const textFields = [
  { name: 'company', label: 'Yritys *', required: true, maxLength: 100 },
  { name: 'title', label: 'Tehtävänimike *', required: true, maxLength: 100 },
  { name: 'location', label: 'Sijainti', maxLength: 150 },
  { name: 'url', label: 'Ilmoituksen osoite', type: 'url', maxLength: 2048 },
  {
    name: 'deadline',
    label: 'Hakuaika',
    type: 'date',
    min: '1000-01-01',
    max: '9999-12-31',
  },
]

// An existing job opens editing mode; a missing job opens creation mode.
export default function JobForm({ job, onSave, onCancel, isBusy }) {
  async function handleSubmit(event) {
    // Keep the page open so React can handle saving and show any errors.
    event.preventDefault()

    // Ignore another submission while a request is already running.
    if (isBusy) return

    // Keep the form reference because saving is asynchronous.
    const form = event.currentTarget

    // Field names become object keys, and these input values are strings.
    const body = Object.fromEntries(new FormData(form))

    // The API expects null when the user has not chosen a match level.
    body.match_level = body.match_level === '' ? null : body.match_level

    // The parent sends the request and returns true only when saving succeeds.
    const saved = await onSave(body)

    // Clear a new entry only after success; preserve input when saving fails.
    if (saved && !job) {
      form.reset()
    }
  }

  return (
    <section aria-labelledby="job-form-heading">
      <h2 id="job-form-heading">
        {job ? 'Muokkaa työpaikkaa' : 'Lisää työpaikka'}
      </h2>
      <p>Tähdellä merkityt kentät ovat pakollisia.</p>

      <form onSubmit={handleSubmit}>
        {/* Disable all fields and buttons together while a request is running. */}
        <fieldset className="job-fields" disabled={isBusy}>
          {/* Give screen reader users a name for this group of fields. */}
          <legend className="visually-hidden">Työpaikan tiedot</legend>

          {/* defaultValue sets the initial text; the browser keeps later edits. */}
          {textFields.map(({ name, label, ...inputProps }) => (
            <label key={name}>
              {label}
              <input
                name={name}
                defaultValue={job?.[name] ?? ''}
                {...inputProps}
              />
            </label>
          ))}

          {/* Send the English option value and show its Finnish label. */}
          <label>
            Hakemuksen tila
            <select name="status" defaultValue={job?.status ?? 'interested'}>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Prioriteetti
            <select name="priority" defaultValue={job?.priority ?? 'normal'}>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            Sopivuusluokka
            <select name="match_level" defaultValue={job?.match_level ?? ''}>
              {Object.entries(matchLevelLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="full-width">
            Muistiinpanot
            <textarea
              name="notes"
              rows={4}
              maxLength={2000}
              defaultValue={job?.notes ?? ''}
            />
          </label>

          <div className="form-actions full-width">
            <button type="submit">
              {isBusy ? 'Tallennetaan…' : job ? 'Tallenna muutokset' : 'Lisää työpaikka'}
            </button>

            {/* Cancel returns to creation mode without submitting the form. */}
            {job && (
              <button type="button" onClick={onCancel}>
                Peruuta muokkaus
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
