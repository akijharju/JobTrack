import { useState } from 'react'
import {
  statusLabels,
  priorityLabels,
  matchLevelLabels,
} from './jobLabels'

// Import results are separate from a job's application status.
const resultLabels = {
  ready: 'Valmis tuotavaksi',
  invalid: 'Virheellinen',
  duplicate: 'Kaksoiskappale',
}

export default function JobImport({ onPreview, onImport, isBusy }) {
  const [preview, setPreview] = useState(null)
  const [selectedRows, setSelectedRows] = useState([])

  // Derive the selected jobs instead of storing another copy in state.
  const selectedJobs = preview
    ? preview.rows
      .filter((row) => (
        row.status === 'ready' && selectedRows.includes(row.row)
      ))
      .map((row) => row.job)
    : []

  function clearPreview() {
    // A new file must never reuse selections from the previous preview.
    setPreview(null)
    setSelectedRows([])
  }

  async function handlePreview(event) {
    event.preventDefault()

    if (isBusy) return

    // Read the chosen file before the parent disables the form.
    const formData = new FormData(event.currentTarget)
    const file = formData.get('importFile')

    clearPreview()

    const result = await onPreview(file)

    if (result) {
      setPreview(result)

      // Select valid rows initially; the user can deselect any of them.
      setSelectedRows(
        result.rows
          .filter((row) => row.status === 'ready')
          .map((row) => row.row),
      )
    }
  }

  function toggleRow(rowNumber) {
    if (isBusy) return

    // Return a new array so React sees the changed selection.
    setSelectedRows((currentRows) => (
      currentRows.includes(rowNumber)
        ? currentRows.filter((number) => number !== rowNumber)
        : [...currentRows, rowNumber]
    ))
  }

  async function handleImport() {
    if (isBusy || selectedJobs.length === 0) return

    // Send only the normalized jobs selected from valid preview rows.
    const saved = await onImport(selectedJobs)

    // Keep the preview available for retry if the request fails.
    if (saved) {
      clearPreview()
    }
  }

  return (
    <section aria-labelledby="import-heading">
      <h2 id="import-heading">Tuo työpaikkoja JSON-tiedostosta</h2>

      <p>
        Valitse enintään 20 työpaikkaa sisältävä JSON-tiedosto.
        Tiedoston enimmäiskoko on 256 KiB.
        Esikatselu ei vielä tallenna tietoja.
      </p>

      <form onSubmit={handlePreview}>
        <label htmlFor="import-file">JSON-tiedosto</label>
        <input
          id="import-file"
          name="importFile"
          type="file"
          accept=".json,application/json"
          onChange={clearPreview}
          required
          disabled={isBusy}
        />

        <button type="submit" disabled={isBusy}>
          {isBusy ? 'Odota…' : 'Näytä esikatselu'}
        </button>
      </form>

      {preview && (
        <div className="import-preview">
          <h3>Esikatselu</h3>

          {/* Announce the summary when the preview becomes available. */}
          <p role="status">
            Yhteensä: {preview.summary.total}.
            {' '}Valmiita: {preview.summary.ready}.
            {' '}Virheellisiä: {preview.summary.invalid}.
            {' '}Kaksoiskappaleita: {preview.summary.duplicate}.
          </p>

          <ul className="import-list">
            {preview.rows.map((row) => {
              const job = row.job
              const canImport = row.status === 'ready'

              return (
                <li key={row.row}>
                  <label className="import-choice">
                    {/* Invalid rows and duplicates cannot be selected. */}
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.row)}
                      onChange={() => toggleRow(row.row)}
                      disabled={isBusy || !canImport}
                    />

                    <span>
                      <strong>Rivi {row.row}:</strong>
                      {' '}
                      {job
                        ? `${job.company} – ${job.title}`
                        : 'Tarkista työpaikan tiedot'}
                    </span>
                  </label>

                  <p>
                    <strong>{resultLabels[row.status]}</strong>
                    {row.message && ` – ${row.message}`}
                  </p>

                  {/* Show all validated fields before the user saves a job. */}
                  {job && (
                    <details className="import-details">
                      <summary>Näytä työpaikan tiedot</summary>

                      <dl>
                        <dt>Sijainti</dt>
                        <dd>{job.location ?? 'Ei ilmoitettu'}</dd>

                        <dt>Ilmoituksen osoite</dt>
                        <dd>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {job.url}
                          </a>
                        </dd>

                        <dt>Hakuaika</dt>
                        <dd>
                          {job.deadline
                            ? job.deadline.split('-').reverse().join('.')
                            : 'Ei ilmoitettu'}
                        </dd>

                        <dt>Hakemuksen tila</dt>
                        <dd>{statusLabels[job.status]}</dd>

                        <dt>Prioriteetti</dt>
                        <dd>{priorityLabels[job.priority]}</dd>

                        <dt>Sopivuusluokka</dt>
                        <dd>{matchLevelLabels[job.match_level ?? '']}</dd>

                        <dt>Muistiinpanot</dt>
                        <dd className="import-notes">
                          {job.notes ?? 'Ei muistiinpanoja'}
                        </dd>
                      </dl>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="form-actions">
            {/* This button is the user's explicit confirmation to save. */}
            <button
              type="button"
              onClick={handleImport}
              disabled={isBusy || selectedJobs.length === 0}
            >
              {isBusy
                ? 'Odota…'
                : `Tallenna valitut (${selectedJobs.length})`}
            </button>

            <button
              type="button"
              onClick={clearPreview}
              disabled={isBusy}
            >
              Sulje esikatselu
            </button>
          </div>
        </div>
      )}
    </section>
  )
}