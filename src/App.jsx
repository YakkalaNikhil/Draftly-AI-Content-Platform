import { useEffect, useMemo, useState } from 'react'
import { loadSavedDrafts, makeDraftTitle, MAX_SAVED_DRAFTS, saveSavedDrafts } from './drafts.js'
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, BookOpen, Check, ChevronDown,
  Clipboard, FileText, Flame, Gauge, Hash, History, Layers3, LoaderCircle, ShieldCheck,
  Menu, MessageSquareText, PenLine, Plus, RefreshCw, Send, Settings2, Sparkles,
  WandSparkles, X, Zap
} from 'lucide-react'

const taskOptions = [
  { id: 'generate', label: 'Create content', icon: WandSparkles, description: 'Generate a fresh draft from a topic' },
  { id: 'rewrite', label: 'Rewrite text', icon: RefreshCw, description: 'Make existing writing clearer' },
  { id: 'summarize', label: 'Summarize', icon: FileText, description: 'Turn long text into key takeaways' },
  { id: 'analyze', label: 'Analyze content', icon: BarChart3, description: 'Review tone, themes and keywords' },
  { id: 'repurpose', label: 'Repurpose content', icon: Layers3, description: 'Create versions for multiple platforms' },
  { id: 'verify', label: 'Fact check', icon: ShieldCheck, description: 'Compare generated claims with a source' },
]
const contentTypes = ['Blog post', 'Social media caption', 'Professional email', 'Product description', 'LinkedIn post', 'Video script']
const tones = ['Professional', 'Friendly', 'Persuasive', 'Casual', 'Educational', 'Creative']
const platforms = ['LinkedIn', 'Blog', 'Instagram', 'Email', 'Facebook', 'X / Twitter']
const REQUEST_TIMEOUT_MS = 95_000

function App() {
  const [task, setTask] = useState('generate')
  const [contentType, setContentType] = useState('Blog post')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('Medium')
  const [audience, setAudience] = useState('General audience')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['LinkedIn', 'Blog', 'Instagram'])
  const [topic, setTopic] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [history, setHistory] = useState(loadSavedDrafts)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeNav, setActiveNav] = useState('studio')

  useEffect(() => {
    saveSavedDrafts(history)
  }, [history])

  useEffect(() => {
    fetch('/api/health')
      .then(async response => {
        if (!response.ok) throw new Error(`Health check returned HTTP ${response.status}`)
        return response.json()
      })
      .then(data => setApiStatus(data.configured ? 'configured' : 'missing'))
      .catch(() => setApiStatus('offline'))
  }, [])

  const selectedTask = taskOptions.find(t => t.id === task) || taskOptions[0]
  const wordCount = useMemo(() => output.trim() ? output.trim().split(/\s+/).length : 0, [output])
  const charCount = output.length

  function startNew() {
    setTopic(''); setSourceText(''); setOutput(''); setError(''); setTask('generate'); setActiveNav('studio')
  }

  async function handleGenerate(e) {
    e?.preventDefault()
    setError('')
    if (task === 'generate' && !topic.trim()) return setError('Add a topic so the AI knows what to create.')
    if (task === 'verify' && !topic.trim()) return setError('Paste the original source information in the source field.')
    if (task !== 'generate' && !sourceText.trim()) return setError('Paste some text to work with first.')
    if (task === 'repurpose' && selectedPlatforms.length === 0) return setError('Choose at least one platform.')
    setLoading(true)
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, contentType, topic, tone, length, audience, sourceText, selectedPlatforms }),
        signal: controller.signal,
      })
      const rawBody = await response.text()
      let data = {}
      try {
        data = rawBody ? JSON.parse(rawBody) : {}
      } catch {
        throw new Error(`The backend returned an unreadable response (HTTP ${response.status}). Check the backend terminal.`)
      }
      if (!response.ok) throw new Error(data.error || `Request failed with HTTP ${response.status}.`)
      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new Error('The AI returned an empty result. Please try again.')
      }

      setOutput(data.text)
      const draft = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        task,
        title: makeDraftTitle(task, topic, sourceText),
        text: data.text,
        createdAt: new Date().toISOString(),
        date: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
        topic,
        sourceText,
        contentType,
        tone,
        length,
        audience,
        selectedPlatforms: [...selectedPlatforms],
      }
      setHistory(previous => [draft, ...previous].slice(0, MAX_SAVED_DRAFTS))
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Generation timed out after 95 seconds. Check the backend terminal for the Groq error and confirm that GROQ_MODEL is available to your API key.')
      } else if (err instanceof TypeError) {
        setError('Could not reach the backend. Confirm that `npm run server` is running on port 5000 and restart Vite if needed.')
      } else {
        setError(err.message || 'Could not generate content. Check the backend terminal for details.')
      }
    } finally {
      window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Clipboard access failed. Select the output and copy it manually.')
    }
  }

  function downloadOutput() {
    if (!output) return
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'draftly-content.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  function chooseTask(id) {
    setTask(id); setOutput(''); setError(''); setActiveNav('studio'); setMobileMenu(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={21} strokeWidth={2.4} /></div>
          <div><div className="brand-name">draftly<span>.</span></div><div className="brand-sub">AI CONTENT STUDIO</div></div>
          <button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18}/></button>
        </div>

        <button className="new-project" onClick={startNew}><Plus size={17}/> New project <span>⌘ K</span></button>

        <div className="nav-label">WORKSPACE</div>
        <button className={`nav-item ${activeNav === 'studio' ? 'active' : ''}`} onClick={() => { setActiveNav('studio'); setMobileMenu(false) }}><Layers3 size={18}/> Content studio <span className="nav-dot"/></button>
        <button className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} onClick={() => { setActiveNav('history'); setMobileMenu(false) }}><History size={18}/> Recent drafts <span className="nav-count">{history.length}</span></button>
        <button className={`nav-item ${activeNav === 'insights' ? 'active' : ''}`} onClick={() => { setActiveNav('insights'); setMobileMenu(false); if (output) setTask('analyze') }}><Activity size={18}/> Content insights</button>

        <div className="nav-label tools-label">AI TOOLS</div>
        {taskOptions.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-item ${task === id && activeNav === 'studio' ? 'selected-tool' : ''}`} onClick={() => chooseTask(id)}><Icon size={17}/>{label}</button>
        ))}

        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-top"><div className="usage-icon"><Zap size={15}/></div><span>AI workspace</span><span className="usage-status">READY</span></div>
            <div className="usage-title">Your ideas, upgraded.</div>
            <p>Create, refine and understand content in one place.</p>
            <div className="usage-line"><span/></div>
            <div className="usage-foot"><span>Local workspace</span><span>∞ drafts</span></div>
          </div>
          <div className="profile-row"><div className="avatar">YN</div><div className="profile-info"><strong>My workspace</strong><span>Personal account</span></div><Settings2 size={17} className="profile-settings"/></div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close navigation"/>}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={20}/></button><span className="breadcrumb-muted">Workspace</span><span className="crumb-slash">/</span><span className="breadcrumb-current">{activeNav === 'history' ? 'Recent drafts' : activeNav === 'insights' ? 'Content insights' : 'Content studio'}</span></div>
          <div className="topbar-right"><div className="status-pill"><span className={`status-dot ${apiStatus}`}/>{apiStatus === 'configured' ? 'Groq configured' : apiStatus === 'checking' ? 'Checking API...' : apiStatus === 'missing' ? 'API key needed' : 'Server offline'}</div><div className="top-avatar">YN</div></div>
        </header>

        {activeNav === 'history' ? (
          <section className="page-content">
            <div className="eyebrow"><History size={14}/> YOUR WORKSPACE</div><h1 className="page-title">Recent <span>drafts.</span></h1><p className="page-description">Pick up where your creativity left off.</p>
            {history.length ? <div className="history-grid">{history.map(item => <button className="history-card" key={item.id} onClick={() => { setOutput(item.text); setTask(item.task || 'generate'); setTopic(item.topic || ''); setSourceText(item.sourceText || ''); setContentType(item.contentType || 'Blog post'); setTone(item.tone || 'Professional'); setLength(item.length || 'Medium'); setAudience(item.audience || 'General audience'); setSelectedPlatforms(Array.isArray(item.selectedPlatforms) ? item.selectedPlatforms : ['LinkedIn', 'Blog', 'Instagram']); setError(''); setActiveNav('studio') }}><div className="history-card-top"><FileText size={18}/><span>{item.date || (item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Saved draft')}</span></div><h3>{item.title || 'Untitled draft'}</h3><p>{item.text.slice(0, 130)}...</p><span className="history-open">Open draft <ArrowRight size={14}/></span></button>)}</div> : <div className="empty-history"><div className="empty-icon"><BookOpen size={24}/></div><h3>No drafts yet</h3><p>Your recent drafts are saved in this browser, so you can reopen them after a refresh.</p><button className="primary-button" onClick={startNew}>Create your first draft <ArrowRight size={16}/></button></div>}
          </section>
        ) : activeNav === 'insights' ? (
          <section className="page-content">
            <div className="eyebrow"><Activity size={14}/> CONTENT INTELLIGENCE</div><h1 className="page-title">Content <span>insights.</span></h1><p className="page-description">Understand what your writing says and how it reads.</p>
            <div className="insights-panel"><div className="insight-big-icon"><BarChart3 size={25}/></div><h2>Turn text into useful signals.</h2><p>Analyze sentiment, themes, readability feedback and keywords from any text.</p><button className="primary-button" onClick={() => { setTask('analyze'); setActiveNav('studio'); setSourceText(output || '') }}>Analyze content <ArrowRight size={16}/></button></div>
          </section>
        ) : (
          <section className="page-content">
            <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-spark"><Sparkles size={13}/></span> YOUR AI CREATIVE PARTNER</div><h1 className="page-title">Make something <span>remarkable.</span></h1><p className="page-description">From a spark of an idea to content that connects. Let's create.</p></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Sparkles size={29}/></div><div className="art-float float-one"><PenLine size={15}/></div><div className="art-float float-two"><Hash size={15}/></div><div className="art-float float-three"><MessageSquareText size={15}/></div></div></div>

            <div className="quick-stats">
              <div className="stat-card"><div className="stat-icon purple"><WandSparkles size={17}/></div><div><div className="stat-label">AI tools</div><div className="stat-value">06 <span>powerful actions</span></div></div></div>
              <div className="stat-card"><div className="stat-icon mint"><Gauge size={17}/></div><div><div className="stat-label">Output words</div><div className="stat-value">{wordCount} <span>in this draft</span></div></div></div>
              <div className="stat-card"><div className="stat-icon amber"><Flame size={17}/></div><div><div className="stat-label">Creative mode</div><div className="stat-value">On <span>ready to go</span></div></div></div>
            </div>

            <div className="studio-layout">
              <section className="panel composer-panel">
                <div className="panel-heading"><div><div className="panel-kicker">STEP 01</div><h2>What are we creating?</h2></div><div className="heading-icon"><Sparkles size={18}/></div></div>
                <div className="task-tabs">
                  {taskOptions.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTask(id); setError('') }} className={`task-tab ${task === id ? 'task-active' : ''}`}><Icon size={15}/><span>{label}</span></button>)}
                </div>

                {task === 'generate' ? (
                  <form onSubmit={handleGenerate}>
                    <label className="field-label" htmlFor="topic">Your topic or idea <span className="required">*</span></label>
                    <textarea id="topic" className="topic-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. 5 practical ways students can use AI to study smarter..." rows={4}/>
                    <div className="input-hint"><span>Be specific for better results</span><span>{topic.length}/1000</span></div>
                    <div className="form-grid">
                      <div><label className="field-label" htmlFor="contentType">Content type</label><div className="select-wrap"><select id="contentType" value={contentType} onChange={e => setContentType(e.target.value)}>{contentTypes.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div>
                      <div><label className="field-label" htmlFor="tone">Writing tone</label><div className="select-wrap"><select id="tone" value={tone} onChange={e => setTone(e.target.value)}>{tones.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div>
                      <div><label className="field-label" htmlFor="length">Content length</label><div className="select-wrap"><select id="length" value={length} onChange={e => setLength(e.target.value)}>{['Short', 'Medium', 'Long'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div>
                      <div><label className="field-label" htmlFor="audience">Target audience</label><div className="select-wrap"><select id="audience" value={audience} onChange={e => setAudience(e.target.value)}>{['General audience', 'Students', 'Professionals', 'Content creators', 'Small businesses', 'Developers'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div>
                    </div>
                    <div className="prompt-tip"><div className="tip-icon"><Sparkles size={14}/></div><p><strong>Pro tip</strong> — Include a goal, audience or key point to get a more tailored draft.</p></div>
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <button className="generate-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Creating your content...</> : <><Sparkles size={17}/> Generate with AI <ArrowRight size={16}/></>}</button>
                  </form>
                ) : (
                  <form onSubmit={handleGenerate}>
                    {task === 'verify' && <>
                      <label className="field-label" htmlFor="topic">Original source information <span className="required">*</span></label>
                      <textarea id="topic" className="topic-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Paste the original facts, brief or source text here..." rows={4}/>
                    </>}
                    <label className="field-label" htmlFor="sourceText">{task === 'rewrite' ? 'Text to rewrite' : task === 'summarize' ? 'Text to summarize' : task === 'analyze' ? 'Text to analyze' : task === 'repurpose' ? 'Content to repurpose' : 'Generated content to check'} <span className="required">*</span></label>
                    <textarea id="sourceText" className="topic-input source-input" value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder={task === 'verify' ? 'Paste the content you want to check against the source...' : 'Paste your text here. The more context you provide, the more useful the result...'} rows={task === 'verify' ? 5 : 8}/>
                    <div className="input-hint"><span>Inputs are saved with a draft after a successful result</span><span>{sourceText.length} characters</span></div>
                    {task === 'repurpose' && <div className="platform-picker"><label className="field-label">Create versions for</label><div className="platform-options">{platforms.map(platform => <label key={platform} className={`platform-option ${selectedPlatforms.includes(platform) ? 'platform-selected' : ''}`}><input type="checkbox" checked={selectedPlatforms.includes(platform)} onChange={e => setSelectedPlatforms(prev => e.target.checked ? [...prev, platform] : prev.filter(p => p !== platform))}/><span>{platform}</span></label>)}</div><div className="input-hint"><span>Choose one or more platforms</span><span>{selectedPlatforms.length} selected</span></div><div className="form-grid"><div><label className="field-label" htmlFor="tone2">Writing tone</label><div className="select-wrap"><select id="tone2" value={tone} onChange={e => setTone(e.target.value)}>{tones.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div><div><label className="field-label" htmlFor="audience2">Target audience</label><div className="select-wrap"><select id="audience2" value={audience} onChange={e => setAudience(e.target.value)}>{['General audience', 'Students', 'Professionals', 'Content creators', 'Small businesses', 'Developers'].map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div></div></div>}
                    {task === 'rewrite' && <div className="form-grid single-grid"><div><label className="field-label" htmlFor="tone2">Writing tone</label><div className="select-wrap"><select id="tone2" value={tone} onChange={e => setTone(e.target.value)}>{tones.map(x => <option key={x}>{x}</option>)}</select><ChevronDown size={15}/></div></div></div>}
                    {error && <div className="error-message" role="alert">{error}</div>}
                    <button className="generate-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17}/> Working on it...</> : <><Sparkles size={17}/> {task === 'rewrite' ? 'Rewrite with AI' : task === 'summarize' ? 'Summarize with AI' : task === 'analyze' ? 'Analyze with AI' : task === 'repurpose' ? 'Create platform versions' : 'Check against source'} <ArrowRight size={16}/></>}</button>
                  </form>
                )}
              </section>

              <section className="panel output-panel">
                <div className="panel-heading output-heading"><div><div className="panel-kicker">STEP 02</div><h2>Your creative canvas</h2></div><div className="live-label"><span/> LIVE OUTPUT</div></div>
                {output ? (
                  <>
                    <div className="output-toolbar"><span className="output-kind"><Sparkles size={13}/>{selectedTask.label}</span><div className="output-actions"><button className="small-action" onClick={copyOutput} title="Copy output">{copied ? <Check size={14}/> : <Clipboard size={14}/>}<span>{copied ? 'Copied' : 'Copy'}</span></button><button className="small-action" onClick={downloadOutput} title="Download as text"><ArrowDownToLine size={14}/><span>Export</span></button></div></div>
                    <div className="output-content">{output}</div>
                    <div className="output-footer"><span><FileText size={13}/>{wordCount} words · {charCount} characters</span><button className="text-button" onClick={handleGenerate} disabled={loading}><RefreshCw size={13}/> Regenerate</button></div>
                  </>
                ) : (
                  <div className="output-empty">
                    <div className="empty-illustration"><div className="empty-sheet"><div/><div/><div/><div className="short-line"/></div><div className="empty-spark spark-a"><Sparkles size={15}/></div><div className="empty-spark spark-b"><Zap size={13}/></div><div className="empty-ring"/></div>
                    <h3>Your next great idea starts here.</h3><p>Fill in your brief and let AI do the first draft. Your result will appear here.</p>
                    <div className="empty-checks"><span><Check size={13}/> Tailored to your brief</span><span><Check size={13}/> Ready to refine</span></div>
                  </div>
                )}
                <div className="output-bottom-note"><div className="note-check"><Check size={13}/></div><span>AI-generated content can make mistakes. Review before publishing.</span></div>
              </section>
            </div>

            <div className="bottom-banner"><div className="banner-icon"><Sparkles size={18}/></div><div><strong>Good ideas deserve great execution.</strong><p>Start with a clear brief. Refine the result until it sounds like you.</p></div><button onClick={startNew}>Start fresh <ArrowRight size={15}/></button></div>
            <footer className="page-footer"><span>© 2026 Draftly Studio</span><span><span className="footer-dot"/> Built for better ideas</span><span>AI-assisted · Human-approved</span></footer>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
