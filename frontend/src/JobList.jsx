// Keep API values separate from the Finnish labels shown to the user.
const statusLabels = {
  interested: 'Kiinnostava',
  applied: 'Haettu',
  interview: 'Haastattelu',
  offer: 'Tarjous',
  rejected: 'Hylätty',
}

const priorityLabels = {
  high: 'Korkea',
  normal: 'Normaali',
  low: 'Matala',
}

export default function JobList({ jobs }) {
  if (jobs.length === 0) {
    return <p>Sinulla ei ole vielä tallennettuja työpaikkoja.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <caption>Omat työpaikat</caption>
        <thead>
          <tr>
            <th scope="col">Yritys</th>
            <th scope="col">Tehtävä</th>
            <th scope="col">Tila</th>
            <th scope="col">Prioriteetti</th>
            <th scope="col">Hakuaika</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            // Format the date as text to avoid timezone changes in the browser.
            const deadline = job.deadline
              ? job.deadline.split('-').reverse().join('.')
              : '—'

            return (
              <tr key={job.id}>
                <td>{job.company}</td>
                <td>
                  {job.url ? (
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      {job.title}
                    </a>
                  ) : (
                    job.title
                  )}
                </td>
                <td>{statusLabels[job.status]}</td>
                <td>{priorityLabels[job.priority]}</td>
                <td>{deadline}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}