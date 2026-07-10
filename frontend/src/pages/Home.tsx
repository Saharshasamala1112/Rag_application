import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'

export const Home = () => {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-slate-900 p-10 text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Local-first document Q&A</p>
        <h1 className="mt-3 text-4xl font-semibold">Ask questions from your uploaded PDFs without sending them to a third-party service.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Upload a PDF, let the backend extract it locally, and ask natural-language questions back from the stored content.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/upload" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900">
            Upload a PDF
          </Link>
          <Link to="/chat" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white">
            Start chatting
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Upload" description="Drop one PDF and let the backend parse it locally.">
          <Link to="/upload" className="text-sm font-semibold text-slate-900">
            Go to upload
          </Link>
        </Card>
        <Card title="Inspect" description="Review the extracted preview and stored document details.">
          <Link to="/upload" className="text-sm font-semibold text-slate-900">
            View document flow
          </Link>
        </Card>
        <Card title="Ask" description="Query the document with natural-language questions and source snippets.">
          <Link to="/chat" className="text-sm font-semibold text-slate-900">
            Start chatting
          </Link>
        </Card>
      </div>
    </div>
  )
}
